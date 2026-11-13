import type {
  AgentExtractionResult,
  BusinessProfile,
  CatalogItem,
  ComputedQuoteLine,
  QuoteTotals,
  SavedQuote,
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

export function computeQuoteLine(
  item: CatalogItem,
  quantity: number,
  discountPercent: number,
  dimensionsNote: string,
  confidence: 'high' | 'medium' | 'low',
  lineId?: string
): ComputedQuoteLine {
  const safeQty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
  const safeDiscountPct = Math.min(100, Math.max(0, Number.isFinite(discountPercent) ? discountPercent : 0));

  const taxableAmount = round2(safeQty * item.unitPrice);
  const discountAmount = round2(taxableAmount * (safeDiscountPct / 100));
  const discountedTaxable = round2(taxableAmount - discountAmount);
  const halfGstRate = item.gstPercent / 2 / 100;
  const cgstAmount = round2(discountedTaxable * halfGstRate);
  const sgstAmount = round2(discountedTaxable * halfGstRate);
  const lineTotal = round2(discountedTaxable + cgstAmount + sgstAmount);

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
    taxableAmount,
    discountAmount,
    discountedTaxable,
    cgstAmount,
    sgstAmount,
    lineTotal,
  };
}

export function recomputeQuoteLines(
  lines: ComputedQuoteLine[],
  discountPercent: number
): { lines: ComputedQuoteLine[]; totals: QuoteTotals } {
  const safeDiscountPct = Math.min(100, Math.max(0, Number.isFinite(discountPercent) ? discountPercent : 0));

  const updatedLines = lines.map((line) => {
    const safeQty = Math.max(0, Number.isFinite(line.quantity) ? line.quantity : 0);
    const taxableAmount = round2(safeQty * line.unitPrice);
    const discountAmount = round2(taxableAmount * (safeDiscountPct / 100));
    const discountedTaxable = round2(taxableAmount - discountAmount);
    const halfGstRate = line.gstPercent / 2 / 100;
    const cgstAmount = round2(discountedTaxable * halfGstRate);
    const sgstAmount = round2(discountedTaxable * halfGstRate);
    const lineTotal = round2(discountedTaxable + cgstAmount + sgstAmount);

    return {
      ...line,
      quantity: safeQty,
      taxableAmount,
      discountAmount,
      discountedTaxable,
      cgstAmount,
      sgstAmount,
      lineTotal,
    };
  });

  const grossSubtotal = round2(updatedLines.reduce((acc, l) => acc + l.taxableAmount, 0));
  const discountAmount = round2(updatedLines.reduce((acc, l) => acc + l.discountAmount, 0));
  const taxableSubtotal = round2(updatedLines.reduce((acc, l) => acc + l.discountedTaxable, 0));
  const totalCgst = round2(updatedLines.reduce((acc, l) => acc + l.cgstAmount, 0));
  const totalSgst = round2(updatedLines.reduce((acc, l) => acc + l.sgstAmount, 0));
  const grandTotal = round2(taxableSubtotal + totalCgst + totalSgst);

  return {
    lines: updatedLines,
    totals: {
      grossSubtotal,
      discountAmount,
      taxableSubtotal,
      totalCgst,
      totalSgst,
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
  const { business, extraction, inquiryText, hasImage, hasAudio, processingTimeMs, existingQuoteCount } = params;
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
        extracted.confidence || 'medium'
      )
    );
  }

  const { lines, totals } = recomputeQuoteLines(rawLines, 0);

  const now = new Date();
  const validDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const prefix = business.presetKey.slice(0, 3).toUpperCase();
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
    },
    customerName: extraction.customerName || 'Walk-in Customer',
    customerPhone: extraction.customerPhone || '',
    customerLocation: extraction.customerLocation || 'Bengaluru',
    detectedLanguage: extraction.detectedLanguage || 'English / Hinglish',
    inquiryText,
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
  };
}

export function buildWhatsAppMessage(quote: SavedQuote): string {
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

  return [
    followUp,
    '',
    `*${quote.businessSnapshot.businessName}*`,
    `Quote #: ${quote.quoteNumber} | GSTIN: ${quote.businessSnapshot.gstin}`,
    '',
    itemLines,
    '',
    quote.discountPercent > 0
      ? `Discount (${quote.discountPercent}%): -${formatINRCompact(quote.totals.discountAmount)}`
      : null,
    `Taxable Subtotal: ${formatINRCompact(quote.totals.taxableSubtotal)}`,
    `CGST: ${formatINRCompact(quote.totals.totalCgst)} | SGST: ${formatINRCompact(quote.totals.totalSgst)}`,
    `*Grand Total (Incl. GST): ${formatINRCompact(quote.totals.grandTotal)}*`,
    flagsText,
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
  const hasHeader =
    firstRow.some((cell) => cell.includes('name') || cell.includes('item') || cell.includes('price'));
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
