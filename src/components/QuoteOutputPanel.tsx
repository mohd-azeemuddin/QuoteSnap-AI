import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Link2,
  MessageSquare,
  Plus,
  Printer,
  Ruler,
  Trash2,
} from 'lucide-react';
import type {
  BusinessProfile,
  FollowUpTone,
  QuoteStatus,
  SavedQuote,
  SupplyType,
} from '../types.ts';
import {
  buildWhatsAppMessage,
  encodeShareableQuote,
  formatINR,
  formatINRCompact,
  formatINRInWords,
} from '../utils/quoteMath.ts';

interface QuoteOutputPanelProps {
  quote: SavedQuote | null;
  activeBusiness: BusinessProfile;
  onUpdateQuote: (updated: SavedQuote) => void;
  onUpdateLineQuantity: (lineId: string, quantity: number, dimensionsNote?: string) => void;
  onRemoveLine: (lineId: string) => void;
  onAddCatalogItemToQuote: (catalogItemId: string) => void;
  onUpdateDiscount: (discountPercent: number) => void;
  onUpdateSupplyType: (supplyType: SupplyType) => void;
  onOpenRateCard: () => void;
}

export function QuoteOutputPanel({
  quote,
  activeBusiness,
  onUpdateQuote,
  onUpdateLineQuantity,
  onRemoveLine,
  onAddCatalogItemToQuote,
  onUpdateDiscount,
  onUpdateSupplyType,
  onOpenRateCard,
}: QuoteOutputPanelProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedAddItemId, setSelectedAddItemId] = useState<string>('');
  const [showAgentDetails, setShowAgentDetails] = useState(false);
  const [dimensionLineId, setDimensionLineId] = useState<string | null>(null);
  const [dimWidth, setDimWidth] = useState('');
  const [dimHeight, setDimHeight] = useState('');

  if (!quote) {
    return (
      <section className="no-print rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-slate-900">
          Live GST Quote Preview Will Appear Here
        </h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
          Click a one-click sample inquiry above, try the sample handwritten note or sample voice note, and click Generate GST Quote.
        </p>
      </section>
    );
  }

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?quote=${encodeShareableQuote(quote)}`
      : '';

  const fullWhatsAppText = buildWhatsAppMessage(quote, shareUrl);
  const cleanedPhone = quote.customerPhone.replace(/[^0-9]/g, '');
  const waPhonePrefix =
    cleanedPhone.length === 10
      ? `91${cleanedPhone}`
      : cleanedPhone.length >= 11
        ? cleanedPhone
        : '';
  const waUrl = `https://wa.me/${waPhonePrefix}?text=${encodeURIComponent(fullWhatsAppText)}`;

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(fullWhatsAppText);
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      setCopiedSummary(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  const handleApplyDimensions = (lineId: string) => {
    const w = parseFloat(dimWidth);
    const h = parseFloat(dimHeight);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
    const area = Math.round(w * h * 100) / 100;
    onUpdateLineQuantity(lineId, area, `${w} ft × ${h} ft = ${area} sq ft (Confirmed)`);
    setDimensionLineId(null);
    setDimWidth('');
    setDimHeight('');
  };

  const confidencePct = Math.round((quote.confidenceScore || 0.85) * 100);
  const secondsTaken = (quote.processingTimeMs / 1000).toFixed(1);
  const supplyType = quote.supplyType || 'intra';

  return (
    <div className="flex flex-col gap-5">
      {/* Agent Verification Bar (No Print) */}
      <section className="no-print rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Agent Verification</span>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-slate-700">
              Matched Items:{' '}
              <strong className="font-mono tabular-nums text-slate-900">{quote.lines.length}</strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-slate-700">
              Confidence:{' '}
              <strong className="font-mono tabular-nums text-slate-900">{confidencePct}%</strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-slate-700">
              Language: <strong className="text-slate-900">{quote.detectedLanguage}</strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="font-mono text-slate-500 tabular-nums">
              Processed in {secondsTaken}s
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAgentDetails((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <span>{showAgentDetails ? 'Hide Extraction Proof' : 'View Extraction Proof'}</span>
              {showAgentDetails ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              {(['Draft', 'Sent', 'Won'] as QuoteStatus[]).map((statusOption) => (
                <button
                  key={statusOption}
                  type="button"
                  onClick={() => onUpdateQuote({ ...quote, status: statusOption })}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    quote.status === statusOption
                      ? statusOption === 'Won'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {statusOption}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Collapsible Agent Transcript / Vision OCR & Reasoning Drawer */}
        {showAgentDetails && (
          <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs">
            {quote.overallSummary && (
              <div>
                <div className="font-semibold text-slate-800">Agent Summary</div>
                <p className="mt-0.5 text-slate-600">{quote.overallSummary}</p>
              </div>
            )}
            {quote.attachmentTranscript && (
              <div>
                <div className="font-semibold text-slate-800">
                  Audio Transcript / Handwritten OCR Extracted
                </div>
                <p className="mt-1 rounded border border-slate-200 bg-white p-2.5 font-mono text-[11px] leading-relaxed text-slate-700">
                  {quote.attachmentTranscript}
                </p>
              </div>
            )}
            {quote.lines.length > 0 && (
              <div>
                <div className="font-semibold text-slate-800">Per-Item Catalog Matching Proof</div>
                <ul className="mt-1 space-y-1 text-slate-600">
                  {quote.lines.map((line) => (
                    <li key={line.id}>
                      <span className="font-medium text-slate-900">{line.name}</span>:{' '}
                      {line.reasoning || line.dimensionsNote || 'Matched via catalog keywords.'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Missing Info / Clarification Needed Alerts */}
        {quote.missingInfoFlags.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                Missing Info / Clarification Needed Before Sending ({quote.missingInfoFlags.length})
              </span>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900">
              {quote.missingInfoFlags.map((flag, i) => (
                <li key={i}>{flag}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Unmatched Items Alert */}
        {quote.unmatchedItems.length > 0 && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Items not in Rate Card: </span>
              <span>{quote.unmatchedItems.join(', ')}</span>
            </div>
            <button
              type="button"
              onClick={onOpenRateCard}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 whitespace-nowrap shrink-0"
            >
              Add to Rate Card →
            </button>
          </div>
        )}
      </section>

      {/* Printable Executive Indian GST Quotation Sheet */}
      <section className="print-only-container rounded-xl border border-slate-200 bg-white p-6 sm:p-8 print-sheet">
        {/* Quotation Header */}
        <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 sm:flex-row">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {quote.businessSnapshot.businessName}
            </h2>
            <p className="mt-1 text-xs text-slate-600">{quote.businessSnapshot.address}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-slate-700 tabular-nums">
              {quote.businessSnapshot.gstin && (
                <span>GSTIN: {quote.businessSnapshot.gstin}</span>
              )}
              {quote.businessSnapshot.gstin && quote.businessSnapshot.phone && (
                <span aria-hidden="true">·</span>
              )}
              {quote.businessSnapshot.phone && <span>Tel: {quote.businessSnapshot.phone}</span>}
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-xs font-semibold tracking-wider text-indigo-700">
              TAX QUOTATION / ESTIMATE
            </div>
            <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
              {quote.quoteNumber}
            </div>
            <div className="mt-1.5 space-y-0.5 text-xs text-slate-600 tabular-nums">
              <div>
                Date:{' '}
                <span className="font-mono text-slate-900">
                  {new Date(quote.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div>
                Valid Until:{' '}
                <span className="font-mono text-slate-900">
                  {new Date(quote.validUntil).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Supply Details */}
        <div className="mt-5 grid grid-cols-1 gap-4 rounded-lg border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Prepared For</div>
            <input
              type="text"
              aria-label="Customer Name"
              value={quote.customerName}
              onChange={(e) => onUpdateQuote({ ...quote, customerName: e.target.value })}
              className="mt-0.5 w-full bg-transparent text-sm font-semibold text-slate-900 focus:bg-white focus:outline-1 focus:outline-indigo-500"
            />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Site / Delivery Location</div>
            <input
              type="text"
              aria-label="Customer Location"
              value={quote.customerLocation}
              onChange={(e) => onUpdateQuote({ ...quote, customerLocation: e.target.value })}
              className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-800 focus:bg-white focus:outline-1 focus:outline-indigo-500"
            />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Customer WhatsApp / Phone</div>
            <input
              type="text"
              aria-label="Customer Phone"
              placeholder="+91 ..."
              value={quote.customerPhone}
              onChange={(e) => onUpdateQuote({ ...quote, customerPhone: e.target.value })}
              className="mt-0.5 w-full bg-transparent font-mono text-sm text-slate-800 focus:bg-white focus:outline-1 focus:outline-indigo-500"
            />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Place of Supply & GST Mode</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <input
                type="text"
                aria-label="Place of Supply"
                value={quote.placeOfSupply || 'Karnataka (29)'}
                onChange={(e) => onUpdateQuote({ ...quote, placeOfSupply: e.target.value })}
                className="w-full min-w-0 bg-transparent text-xs font-medium text-slate-800 focus:bg-white focus:outline-1 focus:outline-indigo-500"
              />
              <select
                aria-label="GST Supply Type"
                value={supplyType}
                onChange={(e) => onUpdateSupplyType(e.target.value as SupplyType)}
                className="no-print shrink-0 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700"
              >
                <option value="intra">CGST+SGST</option>
                <option value="inter">IGST</option>
              </select>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-slate-600">
                <th className="py-2.5 pr-2 font-semibold">#</th>
                <th className="py-2.5 pr-3 font-semibold">Description & Specifications</th>
                <th className="py-2.5 px-2 font-semibold">HSN/SAC</th>
                <th className="py-2.5 px-2 text-right font-semibold">Qty</th>
                <th className="py-2.5 px-2 font-semibold">Unit</th>
                <th className="py-2.5 px-2 text-right font-semibold">Rate (₹)</th>
                <th className="py-2.5 px-2 text-right font-semibold">GST %</th>
                <th className="py-2.5 pl-2 text-right font-semibold">Amount (₹)</th>
                <th className="no-print py-2.5 pl-2 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quote.lines.map((line, index) => {
                const isSqFt = line.unit.toLowerCase().includes('sq');
                const isDimOpen = dimensionLineId === line.id;
                return (
                  <tr key={line.id}>
                    <td className="py-3 pr-2 align-top font-mono text-slate-500 tabular-nums">
                      {index + 1}
                    </td>
                    <td className="py-3 pr-3 align-top">
                      <div className="font-semibold text-slate-900">{line.name}</div>
                      {line.dimensionsNote && (
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {line.dimensionsNote}
                        </div>
                      )}
                      {isDimOpen && (
                        <div className="no-print mt-2 flex flex-wrap items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50/70 p-2">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Width (ft)"
                            value={dimWidth}
                            onChange={(e) => setDimWidth(e.target.value)}
                            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[11px]"
                          />
                          <span className="text-slate-500">×</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Height (ft)"
                            value={dimHeight}
                            onChange={(e) => setDimHeight(e.target.value)}
                            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyDimensions(line.id)}
                            className="rounded bg-indigo-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-800"
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            onClick={() => setDimensionLineId(null)}
                            className="rounded px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 align-top font-mono text-[11px] text-slate-500 tabular-nums">
                      {line.hsnSac || '—'}
                    </td>
                    <td className="py-3 px-2 align-top text-right font-mono tabular-nums">
                      <div className="inline-flex items-center justify-end gap-1">
                        {isSqFt && (
                          <button
                            type="button"
                            title="Calculate Width × Height"
                            onClick={() => {
                              setDimensionLineId(isDimOpen ? null : line.id);
                              setDimWidth('');
                              setDimHeight('');
                            }}
                            className="no-print rounded border border-slate-200 bg-slate-50 p-1 text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                            aria-label={`Set W x H dimensions for ${line.name}`}
                          >
                            <Ruler className="h-3 w-3" />
                          </button>
                        )}
                        <input
                          type="number"
                          min="0"
                          step="any"
                          aria-label={`Quantity for ${line.name}`}
                          value={line.quantity}
                          onChange={(e) =>
                            onUpdateLineQuantity(line.id, parseFloat(e.target.value) || 0)
                          }
                          className="no-print w-20 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                      <span className="hidden print:inline font-mono font-semibold text-slate-900">
                        {line.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-2 align-top text-slate-600">{line.unit}</td>
                    <td className="py-3 px-2 align-top text-right font-mono text-slate-800 tabular-nums">
                      {formatINRCompact(line.unitPrice)}
                    </td>
                    <td className="py-3 px-2 align-top text-right font-mono text-slate-700 tabular-nums">
                      {line.gstPercent}%
                    </td>
                    <td className="py-3 pl-2 align-top text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(line.lineTotal)}
                    </td>
                    <td className="no-print py-3 pl-2 align-top text-right">
                      <button
                        type="button"
                        onClick={() => onRemoveLine(line.id)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${line.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {quote.lines.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-xs text-slate-500">
                    No matched catalog items. Use the selector below to add items from your Rate Card.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Extra Catalog Line Item (No Print) */}
        <div className="no-print mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <select
            aria-label="Add catalog item to quote"
            value={selectedAddItemId}
            onChange={(e) => setSelectedAddItemId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
          >
            <option value="">+ Add item from {activeBusiness.presetName} catalog...</option>
            {activeBusiness.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({formatINRCompact(item.unitPrice)} / {item.unit})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedAddItemId}
            onClick={() => {
              if (!selectedAddItemId) return;
              onAddCatalogItemToQuote(selectedAddItemId);
              setSelectedAddItemId('');
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Line</span>
          </button>
        </div>

        {/* Totals, Amount in Words & Tax Split */}
        <div className="mt-6 flex flex-col justify-between gap-6 border-t border-slate-200 pt-5 sm:flex-row">
          <div className="max-w-md space-y-3 text-[11px] leading-relaxed text-slate-500">
            <div className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2 text-slate-800">
              <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Total Amount Chargeable (In Words)
              </div>
              <div className="mt-0.5 text-xs font-semibold text-slate-900">
                {formatINRInWords(quote.totals.grandTotal)}
              </div>
            </div>
            {quote.businessSnapshot.upiId && (
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700">
                <span className="font-semibold text-slate-900">UPI Payment ID: </span>
                <span className="font-mono text-xs text-indigo-800">
                  {quote.businessSnapshot.upiId}
                </span>
              </div>
            )}
            <div>
              <div className="font-semibold text-slate-700">Terms & Tax Notes</div>
              <p className="mt-1">
                {quote.businessSnapshot.termsNote && (
                  <>
                    1. {quote.businessSnapshot.termsNote}
                    <br />
                  </>
                )}
                {quote.businessSnapshot.termsNote ? '2.' : '1.'} Prices are quoted in Indian Rupees
                (INR); final billing follows confirmed site measurements / headcount.
                <br />
                {quote.businessSnapshot.termsNote ? '3.' : '2.'}{' '}
                {supplyType === 'inter'
                  ? 'Inter-state supply: IGST applied as per Place of Supply.'
                  : 'Intra-state supply: GST split equally into CGST & SGST.'}
              </p>
            </div>
            <div className="pt-2 text-[11px] text-slate-500">
              For <strong className="text-slate-800">{quote.businessSnapshot.businessName}</strong> ·{' '}
              Authorized Signatory
            </div>
          </div>

          <div className="w-full sm:w-80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Gross Taxable Value</span>
              <span className="font-mono font-medium text-slate-900 tabular-nums">
                {formatINR(quote.totals.grossSubtotal)}
              </span>
            </div>

            <div className="no-print flex items-center justify-between text-slate-600">
              <label htmlFor="quote-discount-input">Discount (%)</label>
              <div className="flex items-center gap-2">
                <input
                  id="quote-discount-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={quote.discountPercent}
                  onChange={(e) => onUpdateDiscount(parseFloat(e.target.value) || 0)}
                  className="w-16 rounded border border-slate-300 px-2 py-1 text-right font-mono text-xs text-slate-900 tabular-nums focus:border-indigo-600 focus:outline-none"
                />
                <span className="font-mono text-slate-700 tabular-nums">
                  -{formatINR(quote.totals.discountAmount)}
                </span>
              </div>
            </div>

            {quote.discountPercent > 0 && (
              <div className="hidden print:flex items-center justify-between text-slate-600">
                <span>Discount ({quote.discountPercent}%)</span>
                <span className="font-mono tabular-nums">
                  -{formatINR(quote.totals.discountAmount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-slate-700">
              <span>Taxable Subtotal</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatINR(quote.totals.taxableSubtotal)}
              </span>
            </div>

            {supplyType === 'inter' ? (
              <div className="flex items-center justify-between text-slate-600">
                <span>IGST</span>
                <span className="font-mono tabular-nums">
                  {formatINR(quote.totals.totalIgst || 0)}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-slate-600">
                  <span>CGST</span>
                  <span className="font-mono tabular-nums">
                    {formatINR(quote.totals.totalCgst)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>SGST</span>
                  <span className="font-mono tabular-nums">
                    {formatINR(quote.totals.totalSgst)}
                  </span>
                </div>
              </>
            )}

            {Math.abs(quote.totals.roundOff || 0) > 0 && (
              <div className="flex items-center justify-between text-slate-500">
                <span>Round Off</span>
                <span className="font-mono tabular-nums">
                  {quote.totals.roundOff > 0 ? '+' : ''}
                  {quote.totals.roundOff.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between border-t-2 border-slate-900 pt-2.5 text-sm font-bold text-slate-900">
              <span>Grand Total (Incl. GST)</span>
              <span className="font-mono text-base tabular-nums text-indigo-800">
                {formatINR(quote.totals.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Action Panel: Print PDF + Shareable Link + WhatsApp Follow-Up (No Print) */}
      <section className="no-print rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Customer Follow-Up & Export Actions
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Review the AI-drafted reply, switch between English and Hinglish, copy the online quote link, or send directly on WhatsApp.
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 self-start">
            {(['english', 'hinglish'] as FollowUpTone[]).map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => onUpdateQuote({ ...quote, activeTone: tone })}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  quote.activeTone === tone
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tone === 'english' ? 'English Tone' : 'Hinglish Tone'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="whatsapp-followup-textarea"
            className="block text-xs font-medium text-slate-700"
          >
            AI-Drafted Opening Message (combined automatically with itemized ₹ GST summary & share link)
          </label>
          <textarea
            id="whatsapp-followup-textarea"
            rows={3}
            value={
              quote.activeTone === 'hinglish'
                ? quote.whatsappFollowUpHinglish
                : quote.whatsappFollowUpEn
            }
            onChange={(e) => {
              if (quote.activeTone === 'hinglish') {
                onUpdateQuote({ ...quote, whatsappFollowUpHinglish: e.target.value });
              } else {
                onUpdateQuote({ ...quote, whatsappFollowUpEn: e.target.value });
              }
            }}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Download / Print Clean PDF</span>
          </button>

          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Quote Link Copied</span>
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy Customer Quote Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
          >
            {copiedSummary ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copied Summary</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (quote.status === 'Draft') {
                onUpdateQuote({ ...quote, status: 'Sent' });
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Send via WhatsApp</span>
          </a>
        </div>
      </section>
    </div>
  );
}
