import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  MessageSquare,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import type { BusinessProfile, FollowUpTone, QuoteStatus, SavedQuote } from '../types.ts';
import { buildWhatsAppMessage, formatINR, formatINRCompact } from '../utils/quoteMath.ts';

interface QuoteOutputPanelProps {
  quote: SavedQuote | null;
  activeBusiness: BusinessProfile;
  onUpdateQuote: (updated: SavedQuote) => void;
  onUpdateLineQuantity: (lineId: string, quantity: number) => void;
  onRemoveLine: (lineId: string) => void;
  onAddCatalogItemToQuote: (catalogItemId: string) => void;
  onUpdateDiscount: (discountPercent: number) => void;
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
  onOpenRateCard,
}: QuoteOutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const [selectedAddItemId, setSelectedAddItemId] = useState<string>('');

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
          Click a one-click sample inquiry above, try the sample handwritten note, or record a voice note and click Generate GST Quote.
        </p>
      </section>
    );
  }

  const fullWhatsAppText = buildWhatsAppMessage(quote);
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
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API restricted
      setCopied(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const confidencePct = Math.round((quote.confidenceScore || 0.85) * 100);
  const secondsTaken = (quote.processingTimeMs / 1000).toFixed(1);

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

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Status:</span>
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

        {/* Missing Info / Clarification Needed Alerts (Amber, all-around hairline border) */}
        {quote.missingInfoFlags.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <span>Missing Info / Clarification Needed Before Sending ({quote.missingInfoFlags.length})</span>
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
              <span>GSTIN: {quote.businessSnapshot.gstin}</span>
              <span aria-hidden="true">·</span>
              <span>Tel: {quote.businessSnapshot.phone}</span>
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

        {/* Customer / Site Details */}
        <div className="mt-5 grid grid-cols-1 gap-4 rounded-lg border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-3">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Prepared For</div>
            <input
              type="text"
              aria-label="Customer Name"
              value={quote.customerName}
              onChange={(e) => onUpdateQuote({ ...quote, customerName: e.target.value })}
              className="mt-0.5 w-full bg-transparent text-sm font-semibold text-slate-900 focus:bg-white focus:outline-1 focus:outline-indigo-500 print:border-none"
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
        </div>

        {/* Itemized Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-slate-600">
                <th className="py-2.5 pr-2 font-semibold">#</th>
                <th className="py-2.5 pr-4 font-semibold">Description & Specifications</th>
                <th className="py-2.5 px-2 text-right font-semibold">Qty</th>
                <th className="py-2.5 px-2 font-semibold">Unit</th>
                <th className="py-2.5 px-2 text-right font-semibold">Rate (₹)</th>
                <th className="py-2.5 px-2 text-right font-semibold">GST %</th>
                <th className="py-2.5 pl-2 text-right font-semibold">Amount (₹)</th>
                <th className="no-print py-2.5 pl-2 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quote.lines.map((line, index) => (
                <tr key={line.id}>
                  <td className="py-3 pr-2 align-top font-mono text-slate-500 tabular-nums">
                    {index + 1}
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <div className="font-semibold text-slate-900">{line.name}</div>
                    {line.dimensionsNote && (
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {line.dimensionsNote}
                        {line.hsnSac ? ` · HSN/SAC ${line.hsnSac}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 align-top text-right font-mono tabular-nums">
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
              ))}
              {quote.lines.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-xs text-slate-500">
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

        {/* Totals & CGST/SGST Split */}
        <div className="mt-6 flex flex-col justify-between gap-6 border-t border-slate-200 pt-5 sm:flex-row">
          <div className="max-w-sm text-[11px] leading-relaxed text-slate-500">
            <div className="font-semibold text-slate-700">Terms & Tax Notes</div>
            <p className="mt-1">
              1. Prices are quoted in Indian Rupees (INR) based on the active business rate card.
              <br />
              2. Final billing will follow actual on-site measurements / confirmed headcount.
              <br />
              3. Intra-state supply: GST split equally into CGST & SGST.
            </p>
          </div>

          <div className="w-full sm:w-80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Gross Taxable Value</span>
              <span className="font-mono font-medium text-slate-900 tabular-nums">
                {formatINR(quote.totals.grossSubtotal)}
              </span>
            </div>

            <div className="no-print flex items-center justify-between text-slate-600">
              <label htmlFor="quote-discount-input" className="flex items-center gap-1.5">
                <span>Discount (%)</span>
              </label>
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
            <div className="flex items-center justify-between text-slate-600">
              <span>CGST</span>
              <span className="font-mono tabular-nums">{formatINR(quote.totals.totalCgst)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>SGST</span>
              <span className="font-mono tabular-nums">{formatINR(quote.totals.totalSgst)}</span>
            </div>
            <div className="flex items-center justify-between border-t-2 border-slate-900 pt-2.5 text-sm font-bold text-slate-900">
              <span>Grand Total (Incl. GST)</span>
              <span className="font-mono text-base tabular-nums text-indigo-800">
                {formatINR(quote.totals.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Action Panel: Print PDF + WhatsApp Follow-Up (No Print) */}
      <section className="no-print rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Customer Follow-Up & Export Actions
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Review the AI-drafted reply, switch between English and Hinglish, and send directly on WhatsApp.
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
            AI-Drafted Opening Message (combined automatically with itemized ₹ GST summary)
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

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Download / Print Clean PDF</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copied Summary</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy Customer Summary</span>
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
