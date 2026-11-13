# QuoteSnap AI

**Autonomous Voice, Photo, and WhatsApp-to-GST Quote Agent for Indian Small Businesses**

QuoteSnap AI turns messy customer WhatsApp messages, Hinglish/English voice notes, and handwritten site requirement photos into accurate, ready-to-send Indian GST quotations and WhatsApp follow-ups in under 30 seconds.

---

## Key Architecture: Zero-Hallucination Financial Math

A core reliability principle of QuoteSnap AI is **strictly separating AI extraction from financial arithmetic**:

```
Customer Input (WhatsApp Text / Photo / Voice Note) + Active Rate Card JSON (no prices)
        │
        ▼  POST /api/extract-quote (Server-side Gemini Multimodal + Structured Schema)
Structured Extraction Only:
  • Matched catalogItemId & quantities (e.g. 8x7 ft → 56 sq ft)
  • Verbatim transcript / handwritten OCR summary
  • Missing-spec alerts (e.g. "Wall height missing — assumed 7 ft")
  • English & Hinglish WhatsApp follow-up drafts
        │
        ▼  Deterministic TypeScript Engine (src/utils/quoteMath.ts)
Exact Financial Output:
  • Line taxable value, proportional discount, CGST + SGST or IGST
  • Automatic ₹1 round-off & Amount in Indian Words (Lakhs / Crores)
  • Clean A4 PDF print view, Shareable Customer Link, & wa.me dispatch
```

---

## Core Capabilities

- **3 Switchable Bangalore SMB Presets**:
  - *Namma Interiors & Modular* (18% GST)
  - *Koramangala Print & Signage* (12% & 18% GST)
  - *Bangalore Corporate Catering* (5% GST)
- **Custom Rate Card & CSV Import/Export**: Edit business GSTIN (with 15-char validation), UPI ID, payment terms, catalog rates, HSN/SAC codes, and Hinglish match keywords; import/export via CSV or download a starter template.
- **Multimodal Inquiry Capture**:
  - Hinglish/English WhatsApp text paste + 1-click sample inquiries
  - Handwritten note / site photo upload + 1-click **Try Sample Handwritten Note**
  - Browser `MediaRecorder` voice recording + audio upload + 1-click **Try Sample Voice Note** (powered by `gemini-3.8-flash-lite-tts`)
- **Indian GST Invoice Compliance**:
  - Intra-state (`CGST + SGST`) and Inter-state (`IGST`) toggle
  - HSN/SAC codes, inline quantity & `W × H` dimension resolver, discount %, round-off, UPI payment ID, and Amount Chargeable in Words
  - Clean 1-page `@media print` A4 PDF layout
- **WhatsApp Dispatch & Shareable Customer Link**:
  - Bilingual English / Hinglish follow-up drafts
  - Shareable read-only customer quote view (`?quote=...`) with WhatsApp confirmation button
- **Business Impact & Pilot Tracking**:
  - Tracks quote pipeline (`Draft` / `Sent` / `Won`), admin hours saved vs. manual baseline, real AI turnaround time, and 1-click Pilot Impact Report export.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js (`v22+`), Express, `@google/genai` (`gemini-4-hydrogen` for multimodal JSON extraction, `gemini-3.8-flash-lite-tts` for sample voice notes)
- **Build & Tooling**: Vite 8, `tsx`, Node native `node:test`

---

## Local Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file based on `.env.example`:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

3. **Run in development** (Express API + Vite middleware on port 3000):
   ```bash
   npm run dev
   ```

4. **Run automated tests, type-check, and production build**:
   ```bash
   npm test
   npm run lint
   npm run build
   ```

5. **Run in production mode** (Cloud Run / Node 22+):
   ```bash
   NODE_ENV=production npm start
   ```
