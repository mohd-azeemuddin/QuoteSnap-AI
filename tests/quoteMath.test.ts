import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuoteFromExtraction,
  computeQuoteLine,
  decodeShareableQuote,
  encodeShareableQuote,
  exportRateCardCsv,
  formatINR,
  formatINRInWords,
  isValidGSTIN,
  parseRateCardCsv,
  recomputeQuoteLines,
} from '../src/utils/quoteMath.ts';
import { PRESET_BUSINESSES } from '../src/data/presets.ts';

test('deterministic CGST + SGST calculation for intra-state supply', () => {
  const interiors = PRESET_BUSINESSES[0];
  const wardrobe = interiors.items[0];
  const line = computeQuoteLine(wardrobe, 56, 0, '8 ft x 7 ft = 56 sq ft', 'high', 'intra');

  assert.equal(line.taxableAmount, 81200);
  assert.equal(line.cgstAmount, 7308);
  assert.equal(line.sgstAmount, 7308);
  assert.equal(line.igstAmount, 0);
  assert.equal(line.lineTotal, 95816);
});

test('deterministic IGST calculation for inter-state supply', () => {
  const interiors = PRESET_BUSINESSES[0];
  const wardrobe = interiors.items[0];
  const line = computeQuoteLine(wardrobe, 10, 0, '10 sq ft', 'high', 'inter');

  assert.equal(line.taxableAmount, 14500);
  assert.equal(line.cgstAmount, 0);
  assert.equal(line.sgstAmount, 0);
  assert.equal(line.igstAmount, 2610);
  assert.equal(line.lineTotal, 17110);
});

test('proportional discount and ₹1 round-off calculation', () => {
  const printShop = PRESET_BUSINESSES[1];
  const cards = printShop.items.find((i) => i.id === 'prt-visiting-cards')!;
  const line = computeQuoteLine(cards, 250, 0, '250 cards', 'high', 'intra');
  const { totals } = recomputeQuoteLines([line], 5, 'intra');

  assert.equal(totals.grossSubtotal, 875);
  assert.equal(totals.discountAmount, 43.75);
  assert.equal(totals.taxableSubtotal, 831.25);
  assert.equal(totals.totalCgst, 49.88);
  assert.equal(totals.totalSgst, 49.88);
  assert.equal(totals.grandTotal, 931);
  assert.equal(totals.roundOff, -0.01);
});

test('Indian Rupee formatting and Lakh/Crore words conversion', () => {
  assert.equal(formatINR(124500, false), '₹1,24,500');
  assert.equal(formatINRInWords(124500), 'Rupees One Lakh Twenty Four Thousand Five Hundred Only');
  assert.equal(formatINRInWords(10500000), 'Rupees One Crore Five Lakh Only');
});

test('Indian GSTIN validator catches malformed GSTINs', () => {
  assert.equal(isValidGSTIN('29AABCN4821K1Z5'), true);
  assert.equal(isValidGSTIN('29AABCN4821K1Z'), false);
  assert.equal(isValidGSTIN('INVALID'), false);
});

test('Shareable quote URL encode and decode round-trip', () => {
  const catering = PRESET_BUSINESSES[2];
  const quote = buildQuoteFromExtraction({
    business: catering,
    extraction: {
      customerName: 'Sneha',
      customerPhone: '9900112233',
      customerLocation: 'Bellandur',
      detectedLanguage: 'Hinglish',
      confidenceScore: 0.94,
      overallSummary: 'Office townhall catering for 85 people.',
      attachmentTranscript: '',
      lineItems: [
        {
          catalogItemId: 'cat-veg-north',
          matchedName: 'North Indian Corporate Veg Buffet',
          quantity: 55,
          dimensionsNote: '55 plates',
          confidence: 'high',
          reasoning: 'Explicitly requested 55 veg plates',
        },
      ],
      missingInfoFlags: [],
      unmatchedItems: [],
      whatsappFollowUpEn: 'Hi Sneha, please find your GST quote.',
      whatsappFollowUpHinglish: 'Namaste Sneha ji, aapka quote ready hai.',
    },
    inquiryText: '55 veg plates',
    hasImage: false,
    hasAudio: false,
    processingTimeMs: 1200,
    existingQuoteCount: 0,
  });

  const encoded = encodeShareableQuote(quote);
  const decoded = decodeShareableQuote(encoded);
  assert.ok(decoded);
  assert.equal(decoded.quoteNumber, quote.quoteNumber);
  assert.equal(decoded.totals.grandTotal, quote.totals.grandTotal);
  assert.equal(decoded.customerName, 'Sneha');
});

test('CSV rate card export and import round-trip', () => {
  const interiors = PRESET_BUSINESSES[0];
  const csv = exportRateCardCsv(interiors.items);
  const parsed = parseRateCardCsv(csv);
  assert.equal(parsed.length, interiors.items.length);
  assert.equal(parsed[0].name, interiors.items[0].name);
  assert.equal(parsed[0].unitPrice, interiors.items[0].unitPrice);
  assert.equal(parsed[0].gstPercent, interiors.items[0].gstPercent);
});

test('Custom business generates clean 3-letter quote number prefix', () => {
  const quote = buildQuoteFromExtraction({
    business: {
      id: 'custom-biryani',
      presetKey: 'custom',
      presetName: 'Nawazish Biryani House',
      categoryLabel: 'Biryani & Bulk Catering',
      businessName: 'Nawazish Biryani House',
      gstin: '',
      phone: '+91 98450 00000',
      address: 'Kammanahalli, Bengaluru',
      items: [
        {
          id: 'item-1',
          name: 'Mutton Dum Biryani Bucket (10 Pax)',
          unit: 'bucket',
          unitPrice: 2800,
          gstPercent: 5,
          keywords: ['mutton biryani', 'bucket'],
        },
      ],
      sampleInquiries: [],
    },
    extraction: {
      customerName: 'Azeem',
      customerPhone: '',
      customerLocation: 'Kammanahalli',
      detectedLanguage: 'Hinglish',
      confidenceScore: 0.95,
      overallSummary: '2 Mutton Dum Biryani buckets for team lunch.',
      attachmentTranscript: '',
      lineItems: [
        {
          catalogItemId: 'item-1',
          matchedName: 'Mutton Dum Biryani Bucket (10 Pax)',
          quantity: 2,
          dimensionsNote: '2 buckets',
          confidence: 'high',
          reasoning: 'Matched mutton biryani bucket',
        },
      ],
      missingInfoFlags: [],
      unmatchedItems: [],
      whatsappFollowUpEn: 'Your quote is ready.',
      whatsappFollowUpHinglish: 'Aapka quote ready hai.',
    },
    inquiryText: '2 mutton biryani bucket bhejo',
    hasImage: false,
    hasAudio: false,
    processingTimeMs: 900,
    existingQuoteCount: 3,
  });

  assert.match(quote.quoteNumber, /^QS-NAW-\d{4}-0104$/);
  assert.equal(quote.totals.grandTotal, 5880);
});
