import { AlertTriangle, ArrowLeft, MessageSquare, Printer } from 'lucide-react';
import type { SavedQuote } from '../types.ts';
import { formatINR, formatINRCompact, formatINRInWords } from '../utils/quoteMath.ts';

interface ShareableQuoteViewProps {
  quote: SavedQuote;
  onExitShareView: () => void;
}

export function ShareableQuoteView({ quote, onExitShareView }: ShareableQuoteViewProps) {
  const supplyType = quote.supplyType || 'intra';
  const cleanedBusinessPhone = quote.businessSnapshot.phone.replace(/[^0-9]/g, '');
  const waPhone =
    cleanedBusinessPhone.length === 10 ? `91${cleanedBusinessPhone}` : cleanedBusinessPhone;

  const confirmMessage = `Hi ${quote.businessSnapshot.businessName}, I reviewed GST Quote ${quote.quoteNumber} (${formatINR(quote.totals.grandTotal)}) and would like to proceed / confirm the details.`;
  const waConfirmUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(confirmMessage)}`;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="no-print mx-auto mb-4 flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExitShareView}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Open QuoteSnap AI Workspace</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Save / Print PDF</span>
          </button>
          <a
            href={waConfirmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Confirm Quote on WhatsApp</span>
          </a>
        </div>
      </div>

      <main className="print-only-container mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 sm:p-8 print-sheet">
        <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 sm:flex-row">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {quote.businessSnapshot.businessName}
            </h1>
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

        <div className="mt-5 grid grid-cols-1 gap-4 rounded-lg border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-3">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Prepared For</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">{quote.customerName}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Site / Delivery Location</div>
            <div className="mt-0.5 text-sm font-medium text-slate-800">
              {quote.customerLocation}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Place of Supply</div>
            <div className="mt-0.5 text-sm font-medium text-slate-800">
              {quote.placeOfSupply || 'Karnataka (29)'}
            </div>
          </div>
        </div>

        {quote.missingInfoFlags.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <span>Clarifications Requested by Vendor</span>
            </div>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-amber-900">
              {quote.missingInfoFlags.map((flag, i) => (
                <li key={i}>{flag}</li>
              ))}
            </ul>
          </div>
        )}

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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quote.lines.map((line, index) => (
                <tr key={line.id}>
                  <td className="py-3 pr-2 font-mono text-slate-500 tabular-nums">{index + 1}</td>
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-slate-900">{line.name}</div>
                    {line.dimensionsNote && (
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {line.dimensionsNote}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 font-mono text-[11px] text-slate-500 tabular-nums">
                    {line.hsnSac || '—'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {line.quantity}
                  </td>
                  <td className="py-3 px-2 text-slate-600">{line.unit}</td>
                  <td className="py-3 px-2 text-right font-mono text-slate-800 tabular-nums">
                    {formatINRCompact(line.unitPrice)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-700 tabular-nums">
                    {line.gstPercent}%
                  </td>
                  <td className="py-3 pl-2 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {formatINR(line.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-6 border-t border-slate-200 pt-5 sm:flex-row">
          <div className="max-w-md space-y-3 text-[11px] text-slate-500">
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
            <p>
              {quote.businessSnapshot.termsNote
                ? `${quote.businessSnapshot.termsNote} `
                : ''}
              Generated for customer review. Final tax invoice will be issued upon order confirmation.
            </p>
            <div className="pt-1 text-[11px] text-slate-500">
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
            {quote.discountPercent > 0 && (
              <div className="flex items-center justify-between text-slate-600">
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
      </main>
    </div>
  );
}
