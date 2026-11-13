import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface IncomingCatalogItem {
  id: string;
  name: string;
  unit: string;
  keywords: string[];
}

interface ExtractQuoteRequestBody {
  businessName?: string;
  catalogItems?: IncomingCatalogItem[];
  inquiryText?: string;
  image?: {
    mimeType: string;
    data: string;
  } | null;
  audio?: {
    mimeType: string;
    data: string;
  } | null;
}

const extractionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    customerName: {
      type: Type.STRING,
      description:
        'Detected customer name from the inquiry or attachments, or "Walk-in Customer" if not mentioned.',
    },
    customerPhone: {
      type: Type.STRING,
      description: 'Detected customer phone number if present, otherwise empty string.',
    },
    customerLocation: {
      type: Type.STRING,
      description: 'Detected locality/city/site address (e.g., "Whitefield, Bengaluru"), or "Bengaluru" if unspecified.',
    },
    detectedLanguage: {
      type: Type.STRING,
      description: 'Detected language/mix in the inquiry, e.g. "Hinglish", "English", "Hindi + English", "Kannada + English".',
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: 'Overall extraction confidence from 0.0 to 1.0.',
    },
    overallSummary: {
      type: Type.STRING,
      description: 'Crisp 1-sentence summary of what the customer is asking for.',
    },
    lineItems: {
      type: Type.ARRAY,
      description: 'Items matched strictly against the provided business catalogItemId list.',
      items: {
        type: Type.OBJECT,
        properties: {
          catalogItemId: {
            type: Type.STRING,
            description: 'Exact catalog item id from the provided Rate Card.',
          },
          matchedName: {
            type: Type.STRING,
            description: 'Name of the matched catalog item.',
          },
          quantity: {
            type: Type.NUMBER,
            description:
              'Numeric quantity in the catalog item unit. Multiply dimensions (e.g. 8x7 ft -> 56 sq ft) when unit is sq ft. If dimension is missing, provide reasonable standard estimate and add a missingInfoFlag.',
          },
          dimensionsNote: {
            type: Type.STRING,
            description: 'Short note on dimensions or calculation basis, e.g. "8 ft x 7 ft = 56 sq ft" or "Assumed 7 ft standard height".',
          },
          confidence: {
            type: Type.STRING,
            description: 'Must be one of: "high", "medium", "low".',
          },
          reasoning: {
            type: Type.STRING,
            description: 'Brief note on why this catalog item and quantity were extracted.',
          },
        },
        required: ['catalogItemId', 'matchedName', 'quantity', 'dimensionsNote', 'confidence', 'reasoning'],
      },
    },
    missingInfoFlags: {
      type: Type.ARRAY,
      description:
        'Explicit clarification flags for missing dimensions, ambiguous specifications, approximate quantities, or delivery dates the business owner should verify before sending.',
      items: {
        type: Type.STRING,
      },
    },
    unmatchedItems: {
      type: Type.ARRAY,
      description: 'Any requested items/services in the inquiry that do NOT exist in the provided Rate Card.',
      items: {
        type: Type.STRING,
      },
    },
    whatsappFollowUpEn: {
      type: Type.STRING,
      description:
        'Polite, warm WhatsApp opening follow-up message in clear Indian business English addressed to the customer, asking to confirm any missing specs if needed. Do NOT include any rupee totals or prices in this text (the app appends exact computed prices).',
    },
    whatsappFollowUpHinglish: {
      type: Type.STRING,
      description:
        'Polite, natural WhatsApp opening follow-up message in friendly Hinglish (e.g. "Namaste [Name] ji, aapke requirement ke hisaab se GST quote ready hai...") asking to confirm any missing details. Do NOT include any rupee totals or prices.',
    },
  },
  required: [
    'customerName',
    'customerPhone',
    'customerLocation',
    'detectedLanguage',
    'confidenceScore',
    'overallSummary',
    'lineItems',
    'missingInfoFlags',
    'unmatchedItems',
    'whatsappFollowUpEn',
    'whatsappFollowUpHinglish',
  ],
};

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithRetry(
  ai: GoogleGenAI,
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
  systemInstruction: string
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: extractionResponseSchema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      return response;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Do not retry auth or bad request errors
      if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || msg.includes('400')) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'quotesnap-ai' });
  });

  app.post('/api/extract-quote', async (req, res) => {
    const startTime = Date.now();
    try {
      const body = req.body as ExtractQuoteRequestBody;
      const catalogItems = body.catalogItems ?? [];
      const inquiryText = (body.inquiryText ?? '').trim();
      const image = body.image ?? null;
      const audio = body.audio ?? null;

      if (!inquiryText && !image?.data && !audio?.data) {
        res.status(400).json({
          error: 'Please provide customer inquiry text, an image, or a voice note.',
        });
        return;
      }

      if (catalogItems.length === 0) {
        res.status(400).json({
          error: 'Active Rate Card has no catalog items. Add at least one item before generating a quote.',
        });
        return;
      }

      const ai = getAiClient();

      const catalogContext = catalogItems.map((item) => ({
        catalogItemId: item.id,
        name: item.name,
        unit: item.unit,
        keywords: item.keywords,
      }));

      const systemInstruction = `You are QuoteSnap AI, an autonomous Indian SMB inquiry extraction agent for "${body.businessName || 'an Indian small business'}".
Your ONLY job is to read messy customer inquiries (English, Hinglish, Hindi, Kannada-mixed WhatsApp text, handwritten note photos, site sketches, or voice notes) and extract structured line items matched against the business's Rate Card.

CRITICAL RULES:
1. NEVER calculate rupee totals, prices, discounts, CGST, SGST, or grand totals. Leave all pricing math to deterministic application code. Do NOT include any rupee prices or totals inside whatsappFollowUpEn or whatsappFollowUpHinglish.
2. Only return catalogItemId values that EXACTLY match an ID in the provided Rate Card JSON.
3. Convert rectangular dimensions into area when the catalog item unit is "sq ft" (e.g., "8x7 ft wardrobe" -> quantity: 56, dimensionsNote: "8 ft x 7 ft = 56 sq ft").
4. If a dimension or count is missing, vague, or marked "approx" (e.g., "9 ft width wardrobe" without height, or "40-50 people", or "approx 25 sqft"), make a sensible conservative assumption so a draft quote can be prepared, AND ALWAYS add a clear, specific alert to missingInfoFlags (e.g., "Wall height missing for wardrobe — assumed 7 ft standard height, please confirm").
5. If an audio recording or handwritten note is attached, transcribe and extract all requirements from it carefully, combining with any text provided.
6. If the customer asks for something not on the Rate Card, list it in unmatchedItems rather than forcing a bad match.`;

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      parts.push({
        text: `ACTIVE BUSINESS RATE CARD (JSON — Note: prices intentionally omitted; extract IDs & quantities only):\n${JSON.stringify(catalogContext, null, 2)}`,
      });

      if (inquiryText) {
        parts.push({
          text: `CUSTOMER INQUIRY TEXT:\n${inquiryText}`,
        });
      }

      if (image?.data && image?.mimeType) {
        parts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        });
        parts.push({
          text: 'Analyze the attached image (handwritten note, sketch with dimensions, or site photo) and extract all items, dimensions, customer name, and location.',
        });
      }

      if (audio?.data && audio?.mimeType) {
        parts.push({
          inlineData: {
            mimeType: audio.mimeType,
            data: audio.data,
          },
        });
        parts.push({
          text: 'Listen to the attached customer voice note (may be English, Hinglish, or Hindi) and extract all requested items, quantities, dimensions, and customer details.',
        });
      }

      const response = await generateWithRetry(ai, parts, systemInstruction);
      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);

      res.json({
        extraction: parsed,
        processingTimeMs: Date.now() - startTime,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process inquiry with Gemini.';
      console.error('[/api/extract-quote] Error:', message);
      const status =
        message.includes('API_KEY') || message.includes('PERMISSION_DENIED')
          ? 403
          : message.includes('RESOURCE_EXHAUSTED') || message.includes('429')
            ? 429
            : 500;
      res.status(status).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`QuoteSnap AI server running on http://0.0.0.0:${port}`);
  });
}

startServer();
