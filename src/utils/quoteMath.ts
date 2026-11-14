import type {
  AgentExtractionResult,
  BusinessProfile,
  CatalogItem,
  ComputedQuoteLine,
  QuoteTotals,
  SavedQuote,
  SupplyType,
} from '../types.ts';

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatINR(amount: number, showDecimals = true): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(safe);
}

export function formatINRCompact(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const hasPaise = Math.abs(safe - Math.round(safe)) > 0.005;
  return formatINR(safe, hasPaise);
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function twoDigitWords(num: number): string {
  if (num < 20) return ONES[num];
  const ten = Math.floor(num / 10);
  const one = num % 10;
  return `${TENS[ten]}${one ? ` ${ONES[one]}` : ''}`.trim();
}

function integerToIndianWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;

  if (crore > 0) parts.push(`${integerToIndianWords(crore)} Crore`);
  if (lakh > 0) parts.push(`${twoDigitWords(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (hundred > 0) parts.push(`${ONES[hundred]} Hundred`);
  if (rest > 0) {
    parts.push(`${parts.length > 0 ? 'and ' : ''}${twoDigitWords(rest)}`);
  }
  return parts.join(' ').trim();
}

export function formatINRInWords(amount: number): string {
  const safe = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const rupees = Math.floor(safe);
  const paise = Math.round((safe - rupees) * 100);
  const rupeeText = integerToIndianWords(rupees);
  if (paise > 0) {
    return `Rupees ${rupeeText} and ${twoDigitWords(paise)} Paise Only`;
  }
  return `Rupees ${rupeeText} Only`;
}

export function computeQuoteLine(
  item: CatalogItem,
  quantity: number,
  discountPercent: number,
  dimensionsNote: string,
  confidence: 'high' | 'medium' | 'low',
  supplyType: SupplyType = 'intra',
  reasoning = '',
  lineId?: string
): ComputedQuoteLine {
  const safeQty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
  const safeDiscountPct = Math.min(
    100,
    Math.max(0, Number.isFinite(discountPercent) ? discountPercent : 0)
  );

  const taxableAmount = round2(safeQty * item.unitPrice);
  const discountAmount = round2(taxableAmount * (safeDiscountPct / 100));
  const discountedTaxable = round2(taxableAmount - discountAmount);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (supplyType === 'inter') {
    igstAmount = round2((discountedTaxable * item.gstPercent) / 100);
  } else {
    const halfGstRate = item.gstPercent / 2 / 100;
    cgstAmount = round2(discountedTaxable * halfGstRate);
    sgstAmount = round2(discountedTaxable * halfGstRate);
  }

  const lineTotal = round2(discountedTaxable + cgstAmount + sgstAmount + igstAmount);

  return {
    id: lineId ?? `${item.id}-${Math.random().toString(36).slice(2, 7)}`,
    catalogItemId: item.id,
    name: item.name,
    unit: item.unit,
    unitPrice: item.unitPrice,
    gstPercent: item.gstPercent,
    hsnSac: item.hsnSac,
    quantity: safeQty,
    dimensionsNote,
    confidence,
    reasoning,
    taxableAmount,
    discountAmount,
    discountedTaxable,
    cgstAmount,
    sgstAmount,
    igstAmount,
    lineTotal,
  };
}

export function recomputeQuoteLines(
  lines: ComputedQuoteLine[],
  discountPercent: number,
  supplyType: SupplyType = 'intra'
): { lines: ComputedQuoteLine[]; totals: QuoteTotals } {
  const safeDiscountPct = Math.min(
    100,
    Math.max(0, Number.isFinite(discountPercent) ? discountPercent : 0)
  );

  const updatedLines = lines.map((line) => {
    const safeQty = Math.max(0, Number.isFinite(line.quantity) ? line.quantity : 0);
    const taxableAmount = round2(safeQty * line.unitPrice);
    const discountAmount = round2(taxableAmount * (safeDiscountPct / 100));
    const discountedTaxable = round2(taxableAmount - discountAmount);

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (supplyType === 'inter') {
      igstAmount = round2((discountedTaxable * line.gstPercent) / 100);
    } else {
      const halfGstRate = line.gstPercent / 2 / 100;
      cgstAmount = round2(discountedTaxable * halfGstRate);
      sgstAmount = round2(discountedTaxable * halfGstRate);
    }

    const lineTotal = round2(discountedTaxable + cgstAmount + sgstAmount + igstAmount);

    return {
      ...line,
      quantity: safeQty,
      taxableAmount,
      discountAmount,
      discountedTaxable,
      cgstAmount,
      sgstAmount,
      igstAmount,
      lineTotal,
    };
  });

  const grossSubtotal = round2(updatedLines.reduce((acc, l) => acc + l.taxableAmount, 0));
  const discountAmount = round2(updatedLines.reduce((acc, l) => acc + l.discountAmount, 0));
  const taxableSubtotal = round2(updatedLines.reduce((acc, l) => acc + l.discountedTaxable, 0));
  const totalCgst = round2(updatedLines.reduce((acc, l) => acc + l.cgstAmount, 0));
  const totalSgst = round2(updatedLines.reduce((acc, l) => acc + l.sgstAmount, 0));
  const totalIgst = round2(updatedLines.reduce((acc, l) => acc + l.igstAmount, 0));
  const rawTotal = round2(taxableSubtotal + totalCgst + totalSgst + totalIgst);
  const grandTotal = Math.round(rawTotal);
  const roundOff = round2(grandTotal - rawTotal);

  return {
    lines: updatedLines,
    totals: {
      grossSubtotal,
      discountAmount,
      taxableSubtotal,
      totalCgst,
      totalSgst,
      totalIgst,
      rawTotal,
      roundOff,
      grandTotal,
    },
  };
}

export function buildQuoteFromExtraction(params: {
  business: BusinessProfile;
  extraction: AgentExtractionResult;
  inquiryText: string;
  hasImage: boolean;
  hasAudio: boolean;
  processingTimeMs: number;
  existingQuoteCount: number;
}): SavedQuote {
  const {
    business,
    extraction,
    inquiryText,
    hasImage,
    hasAudio,
    processingTimeMs,
    existingQuoteCount,
  } = params;
  const catalogById = new Map(business.items.map((item) => [item.id, item]));

  const rawLines: ComputedQuoteLine[] = [];
  const unmatched = [...(extraction.unmatchedItems ?? [])];

  for (const extracted of extraction.lineItems ?? []) {
    const matchedItem = catalogById.get(extracted.catalogItemId);
    if (!matchedItem) {
      unmatched.push(`${extracted.matchedName || extracted.catalogItemId} (Qty: ${extracted.quantity})`);
      continue;
    }
    rawLines.push(
      computeQuoteLine(
        matchedItem,
        extracted.quantity,
        0,
        extracted.dimensionsNote || '',
        extracted.confidence || 'medium',
        'intra',
        extracted.reasoning || ''
      )
    );
  }

  const { lines, totals } = recomputeQuoteLines(rawLines, 0, 'intra');

  const now = new Date();
  const validDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const rawPrefix =
    business.presetKey === 'custom'
      ? business.presetName.replace(/[^A-Za-z]/g, '')
      : business.presetKey;
  const prefix = (rawPrefix || 'BIZ').slice(0, 3).toUpperCase();
  const seq = String(existingQuoteCount + 101).padStart(4, '0');
  const quoteNumber = `QS-${prefix}-${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}-${seq}`;

  return {
    id: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    quoteNumber,
    createdAt: now.toISOString(),
    validUntil: validDate.toISOString(),
    status: 'Draft',
    businessSnapshot: {
      businessName: business.businessName,
      gstin: business.gstin,
      phone: business.phone,
      address: business.address,
      presetKey: business.presetKey,
      upiId: business.upiId,
      termsNote: business.termsNote,
    },
    customerName: extraction.customerName || 'Walk-in Customer',
    customerPhone: extraction.customerPhone || '',
    customerLocation: extraction.customerLocation || 'Bengaluru',
    placeOfSupply: 'Karnataka (29)',
    supplyType: 'intra',
    detectedLanguage: extraction.detectedLanguage || 'English / Hinglish',
    inquiryText,
    attachmentTranscript: extraction.attachmentTranscript || '',
    hasImage,
    hasAudio,
    lines,
    discountPercent: 0,
    totals,
    missingInfoFlags: extraction.missingInfoFlags ?? [],
    unmatchedItems: unmatched,
    confidenceScore: extraction.confidenceScore ?? 0.85,
    overallSummary: extraction.overallSummary || '',
    whatsappFollowUpEn: extraction.whatsappFollowUpEn || '',
    whatsappFollowUpHinglish: extraction.whatsappFollowUpHinglish || '',
    activeTone: 'english',
    processingTimeMs,
    manualBaselineMins: 20,
  };
}

export function encodeShareableQuote(quote: SavedQuote): string {
  const compact: SavedQuote = {
    ...quote,
    inquiryText: '',
    attachmentTranscript: '',
  };
  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShareableQuote(encoded: string): SavedQuote | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as SavedQuote;
    if (!parsed || !parsed.quoteNumber || !Array.isArray(parsed.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildWhatsAppMessage(quote: SavedQuote, shareUrl?: string): string {
  const followUp =
    quote.activeTone === 'hinglish' ? quote.whatsappFollowUpHinglish : quote.whatsappFollowUpEn;

  const itemLines = quote.lines
    .map(
      (line, idx) =>
        `${idx + 1}. ${line.name} — ${line.quantity} ${line.unit} @ ${formatINRCompact(line.unitPrice)} (+${line.gstPercent}% GST) = ${formatINRCompact(line.lineTotal)}`
    )
    .join('\n');

  const flagsText =
    quote.missingInfoFlags.length > 0
      ? `\nNote / Clarification Needed:\n- ${quote.missingInfoFlags.join('\n- ')}\n`
      : '';

  const taxLine =
    quote.supplyType === 'inter'
      ? `IGST: ${formatINRCompact(quote.totals.totalIgst)}`
      : `CGST: ${formatINRCompact(quote.totals.totalCgst)} | SGST: ${formatINRCompact(quote.totals.totalSgst)}`;

  return [
    followUp,
    '',
    `*${quote.businessSnapshot.businessName}*`,
    `Quote #: ${quote.quoteNumber}${quote.businessSnapshot.gstin ? ` | GSTIN: ${quote.businessSnapshot.gstin}` : ''}`,
    `Place of Supply: ${quote.placeOfSupply}`,
    '',
    itemLines,
    '',
    quote.discountPercent > 0
      ? `Discount (${quote.discountPercent}%): -${formatINRCompact(quote.totals.discountAmount)}`
      : null,
    `Taxable Subtotal: ${formatINRCompact(quote.totals.taxableSubtotal)}`,
    taxLine,
    `*Grand Total (Incl. GST): ${formatINR(quote.totals.grandTotal, false)}*`,
    flagsText,
    shareUrl ? `View Online GST Quote: ${shareUrl}` : null,
    `Valid until: ${new Date(quote.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export function parseRateCardCsv(csvText: string): CatalogItem[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const splitCsvRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const firstRow = splitCsvRow(lines[0]).map((c) => c.toLowerCase());
  const hasHeader = firstRow.some(
    (cell) => cell.includes('name') || cell.includes('item') || cell.includes('price')
  );
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const parsed: CatalogItem[] = [];
  for (let i = 0; i < dataLines.length; i++) {
    const cols = splitCsvRow(dataLines[i]);
    const name = cols[0]?.trim();
    if (!name) continue;
    const unit = cols[1]?.trim() || 'unit';
    const priceRaw = parseFloat((cols[2] || '0').replace(/[^0-9.]/g, ''));
    const gstRaw = parseFloat((cols[3] || '18').replace(/[^0-9.]/g, ''));
    const keywordsRaw = cols[4] || '';
    const hsnSac = cols[5]?.trim() || undefined;

    parsed.push({
      id: `csv-item-${Date.now()}-${i}`,
      name,
      unit,
      unitPrice: Number.isFinite(priceRaw) && priceRaw >= 0 ? priceRaw : 0,
      gstPercent: Number.isFinite(gstRaw) && gstRaw >= 0 ? gstRaw : 18,
      keywords: keywordsRaw
        .split(/[;|]/)
        .map((k) => k.trim())
        .filter(Boolean),
      hsnSac,
    });
  }

  return parsed;
}

export function exportRateCardCsv(items: CatalogItem[]): string {
  const escape = (val: string | number) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = 'Item Name,Unit,Unit Price (INR),GST %,Keywords (semicolon separated),HSN/SAC';
  const rows = items.map((item) =>
    [
      escape(item.name),
      escape(item.unit),
      item.unitPrice,
      item.gstPercent,
      escape(item.keywords.join('; ')),
      escape(item.hsnSac || ''),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export function isValidGSTIN(gstin: string): boolean {
  const clean = gstin.trim().toUpperCase();
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean);
}

export function getSampleRateCardCsv(): string {
  return [
    'Item Name,Unit,Unit Price (INR),GST %,Keywords (semicolon separated),HSN/SAC',
    'Modular Wardrobe (BWP Ply + Laminate),sq ft,1450,18,wardrobe; cupboard; almirah; laminate,9403',
    'Gypsum False Ceiling,sq ft,115,18,false ceiling; ceiling; pop,9954',
    'Interior Wall Painting (Tractor Emulsion),sq ft,28,18,painting; wall paint; emulsion,9954',
  ].join('\n');
}
