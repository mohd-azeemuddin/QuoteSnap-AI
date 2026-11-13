import { useMemo, useState } from 'react';
import { ArrowRight, Check, ClipboardList, ExternalLink, FileText, Search, Trash2 } from 'lucide-react';
import type { QuoteStatus, SavedQuote } from '../types.ts';
import { formatINR, formatINRCompact } from '../utils/quoteMath.ts';

interface HistoryImpactViewProps {
  quotes: SavedQuote[];
  onOpenQuote: (quoteId: string) => void;
  onUpdateStatus: (quoteId: string, status: QuoteStatus) => void;
  onUpdateManualBaseline: (quoteId: string, mins: number) => void;
  onDeleteQuote: (quoteId: string) => void;
  onGoToWorkspace: () => void;
}

export function HistoryImpactView({
  quotes,
  onOpenQuote,
  onUpdateStatus,
  onUpdateManualBaseline,
  onDeleteQuote,
  onGoToWorkspace,
}: HistoryImpactViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | QuoteStatus>('All');
  const [copiedReport, setCopiedReport] = useState(false);

  const metrics = useMemo(() => {
    const totalCount = quotes.length;
    const totalPipeline = quotes.reduce((sum, q) => sum + q.totals.grandTotal, 0);
    const wonQuotes = quotes.filter((q) => q.status === 'Won');
    const wonValue = wonQuotes.reduce((sum, q) => sum + q.totals.grandTotal, 0);
    const uniqueBusinesses = new Set(quotes.map((q) => q.businessSnapshot.businessName)).size;

    const avgAiSeconds =
      totalCount > 0
        ? quotes.reduce((sum, q) => sum + (q.processingTimeMs || 0), 0) / totalCount / 1000
        : 0;

    const avgManualMins =
      totalCount > 0
        ? quotes.reduce((sum, q) => sum + (q.manualBaselineMins ?? 20), 0) / totalCount
        : 20;

    const minutesSaved = quotes.reduce((sum, q) => {
      const baseline = q.manualBaselineMins ?? 20;
      const aiMins = Math.min(baseline, (q.processingTimeMs || 15000) / 60000);
      return sum + (baseline - aiMins);
    }, 0);
    const hoursSaved = minutesSaved / 60;

    const timeReductionPct =
      totalCount > 0 && avgManualMins > 0
        ? Math.max(0, ((avgManualMins * 60 - avgAiSeconds) / (avgManualMins * 60)) * 100)
        : 0;

    return {
      totalCount,
      uniqueBusinesses,
      totalPipeline,
      wonCount: wonQuotes.length,
      wonValue,
      avgAiSeconds,
      avgManualMins,
      hoursSaved,
      timeReductionPct,
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return quotes.filter((quote) => {
      if (statusFilter !== 'All' && quote.status !== statusFilter) return false;
      if (!qLower) return true;
      return (
        quote.quoteNumber.toLowerCase().includes(qLower) ||
        quote.customerName.toLowerCase().includes(qLower) ||
        quote.customerLocation.toLowerCase().includes(qLower) ||
        quote.businessSnapshot.businessName.toLowerCase().includes(qLower)
      );
    });
  }, [quotes, searchQuery, statusFilter]);

  const handleCopyPilotReport = async () => {
    const report = [
      `QuoteSnap AI Pilot Impact Summary`,
      `- Real Inquiries Tested: ${metrics.totalCount} across ${metrics.uniqueBusinesses} business profiles`,
      `- Average Manual Quoting Time: ${metrics.avgManualMins.toFixed(1)} mins/quote`,
      `- Average QuoteSnap AI Turnaround: ${metrics.avgAiSeconds.toFixed(1)} seconds (${metrics.timeReductionPct.toFixed(1)}% faster)`,
      `- Estimated Admin Hours Saved: ${metrics.hoursSaved.toFixed(2)} hours`,
      `- Total Quoted Pipeline Value: ${formatINRCompact(metrics.totalPipeline)}`,
      `- Won Revenue Tracked: ${formatINRCompact(metrics.wonValue)} (${metrics.wonCount} quotes)`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(report);
      setCopiedReport(true);
      window.setTimeout(() => setCopiedReport(false), 2000);
    } catch {
      setCopiedReport(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Business Impact & Quote History
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track quoted pipeline, log actual manual quoting times during your SMB pilot, and export verifiable impact numbers.
          </p>
        </div>

        {quotes.length > 0 && (
          <button
            type="button"
            onClick={handleCopyPilotReport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            {copiedReport ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Pilot Report Copied</span>
              </>
            ) : (
              <>
                <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy Pilot Impact Report</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 4-Column KPI Strip */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Total Pipeline Value</div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatINRCompact(metrics.totalPipeline)}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Across {metrics.totalCount} {metrics.totalCount === 1 ? 'quote' : 'quotes'} generated
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Won Revenue</div>
          <div className="mt-2 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {formatINRCompact(metrics.wonValue)}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {metrics.wonCount} {metrics.wonCount === 1 ? 'quote' : 'quotes'} marked Won
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Estimated Admin Hours Saved</div>
          <div className="mt-2 font-mono text-2xl font-bold text-indigo-700 tabular-nums">
            {metrics.hoursSaved.toFixed(1)} hrs
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Vs. {metrics.avgManualMins.toFixed(0)} min avg manual baseline
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Avg. Quote Turnaround</div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {metrics.totalCount > 0 ? `${metrics.avgAiSeconds.toFixed(1)}s` : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {metrics.totalCount > 0
              ? `${metrics.timeReductionPct.toFixed(1)}% faster than manual`
              : 'End-to-end multimodal extraction + GST'}
          </div>
        </div>
      </div>

      {/* Saved Quotes Table / Empty State */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search customer, quote #, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 self-start">
            {(['All', 'Draft', 'Sent', 'Won'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {quotes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-900">No quotes saved yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              Generate your first GST quote in the Workspace using a WhatsApp inquiry, handwritten note, or voice clip.
            </p>
            <button
              type="button"
              onClick={onGoToWorkspace}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-800"
            >
              <span>Go to Quote Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No quotes match your current search or status filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                  <th className="py-3 pl-5 pr-3 font-medium">Quote #</th>
                  <th className="py-3 px-3 font-medium">Date</th>
                  <th className="py-3 px-3 font-medium">Customer & Site</th>
                  <th className="py-3 px-3 font-medium">Business</th>
                  <th className="py-3 px-3 text-right font-medium">Manual (min)</th>
                  <th className="py-3 px-3 text-right font-medium">AI (sec)</th>
                  <th className="py-3 px-3 text-right font-medium">Total (Incl. GST)</th>
                  <th className="py-3 px-3 font-medium">Status</th>
                  <th className="py-3 pl-3 pr-5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pl-5 pr-3 font-mono font-semibold text-indigo-700 tabular-nums whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenQuote(q.id)}
                        className="hover:underline"
                      >
                        {q.quoteNumber}
                      </button>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(q.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{q.customerName}</div>
                      <div className="text-[11px] text-slate-500">{q.customerLocation}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{q.businessSnapshot.businessName}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      <input
                        type="number"
                        min="1"
                        max="240"
                        aria-label={`Manual baseline minutes for ${q.quoteNumber}`}
                        value={q.manualBaselineMins ?? 20}
                        onChange={(e) =>
                          onUpdateManualBaseline(q.id, Math.max(1, parseFloat(e.target.value) || 20))
                        }
                        className="w-14 rounded border border-slate-200 bg-white px-1.5 py-1 text-right font-mono text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {((q.processingTimeMs || 0) / 1000).toFixed(1)}s
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatINR(q.totals.grandTotal)}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        aria-label={`Status for ${q.quoteNumber}`}
                        value={q.status}
                        onChange={(e) => onUpdateStatus(q.id, e.target.value as QuoteStatus)}
                        className={`rounded-md border px-2 py-1 text-xs font-medium focus:outline-none ${
                          q.status === 'Won'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : q.status === 'Sent'
                              ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                              : 'border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Won">Won</option>
                      </select>
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenQuote(q.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          <span>Open</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteQuote(q.id)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${q.quoteNumber}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
