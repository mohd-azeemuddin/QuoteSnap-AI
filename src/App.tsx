import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { PRESET_BUSINESSES } from './data/presets.ts';
import type { AgentExtractionResult, BusinessProfile, QuoteStatus, SavedQuote } from './types.ts';
import {
  buildQuoteFromExtraction,
  computeQuoteLine,
  recomputeQuoteLines,
} from './utils/quoteMath.ts';
import { TopBar, type AppView } from './components/TopBar.tsx';
import { RateCardManager, RateCardSidebar } from './components/RateCardPanel.tsx';
import { InquiryInputCard, type MediaAttachment } from './components/InquiryInputCard.tsx';
import { QuoteOutputPanel } from './components/QuoteOutputPanel.tsx';
import { HistoryImpactView } from './components/HistoryImpactView.tsx';

const STORAGE_KEYS = {
  businesses: 'quotesnap_businesses_v1',
  activeBusinessId: 'quotesnap_active_business_id_v1',
  savedQuotes: 'quotesnap_saved_quotes_v1',
};

function loadInitialBusinesses(): BusinessProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.businesses);
    if (!raw) return PRESET_BUSINESSES;
    const parsed = JSON.parse(raw) as BusinessProfile[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : PRESET_BUSINESSES;
  } catch {
    return PRESET_BUSINESSES;
  }
}

function loadInitialActiveBusinessId(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.activeBusinessId) || PRESET_BUSINESSES[0].id;
  } catch {
    return PRESET_BUSINESSES[0].id;
  }
}

function loadInitialQuotes(): SavedQuote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.savedQuotes);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedQuote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('workspace');
  const [businesses, setBusinesses] = useState<BusinessProfile[]>(loadInitialBusinesses);
  const [activeBusinessId, setActiveBusinessId] = useState<string>(loadInitialActiveBusinessId);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>(loadInitialQuotes);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);

  const [inquiryText, setInquiryText] = useState('');
  const [imageAttachment, setImageAttachment] = useState<MediaAttachment | null>(null);
  const [audioAttachment, setAudioAttachment] = useState<MediaAttachment | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [agentStepIndex, setAgentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.businesses, JSON.stringify(businesses));
    } catch {
      // Ignore storage quota issues
    }
  }, [businesses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.activeBusinessId, activeBusinessId);
    } catch {
      // Ignore storage errors
    }
  }, [activeBusinessId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.savedQuotes, JSON.stringify(savedQuotes));
    } catch {
      // Ignore storage errors
    }
  }, [savedQuotes]);

  const activeBusiness = useMemo(
    () => businesses.find((b) => b.id === activeBusinessId) || businesses[0],
    [businesses, activeBusinessId]
  );

  const activeQuote = useMemo(
    () => savedQuotes.find((q) => q.id === activeQuoteId) || null,
    [savedQuotes, activeQuoteId]
  );

  const handleUpdateBusiness = (updated: BusinessProfile) => {
    setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleResetPreset = (presetId: string) => {
    const original = PRESET_BUSINESSES.find((p) => p.id === presetId);
    if (!original) return;
    setBusinesses((prev) => prev.map((b) => (b.id === presetId ? original : b)));
  };

  const handleNewQuote = () => {
    setActiveView('workspace');
    setActiveQuoteId(null);
    setInquiryText('');
    setImageAttachment(null);
    setAudioAttachment(null);
    setErrorMessage(null);
  };

  const handleLoadSampleNote = (img: MediaAttachment) => {
    // Ensure Namma Interiors & Modular is selected since the sample note is an interior site list
    if (activeBusiness.presetKey !== 'interiors') {
      const interiors = businesses.find((b) => b.presetKey === 'interiors');
      if (interiors) setActiveBusinessId(interiors.id);
    }
    setImageAttachment(img);
    if (!inquiryText.trim()) {
      setInquiryText('Please review this site visit handwritten list and prepare a GST quote.');
    }
    setErrorMessage(null);
  };

  const handleGenerateQuote = async () => {
    setErrorMessage(null);
    setIsGenerating(true);
    setAgentStepIndex(0);

    // Visual progression through agent stages while waiting on Gemini server endpoint
    const stepTimer1 = window.setTimeout(() => setAgentStepIndex(1), 650);
    const stepTimer2 = window.setTimeout(() => setAgentStepIndex(2), 1400);

    try {
      const response = await fetch('/api/extract-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: activeBusiness.businessName,
          catalogItems: activeBusiness.items.map((item) => ({
            id: item.id,
            name: item.name,
            unit: item.unit,
            keywords: item.keywords,
          })),
          inquiryText,
          image: imageAttachment
            ? { mimeType: imageAttachment.mimeType, data: imageAttachment.data }
            : null,
          audio: audioAttachment
            ? { mimeType: audioAttachment.mimeType, data: audioAttachment.data }
            : null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `Server error (${response.status})`);
      }

      setAgentStepIndex(2);
      const extraction = payload.extraction as AgentExtractionResult;
      const processingTimeMs = Number(payload.processingTimeMs) || 1500;

      // Deterministic TypeScript calculation of all line totals, CGST, SGST, and Grand Total
      const newQuote = buildQuoteFromExtraction({
        business: activeBusiness,
        extraction,
        inquiryText,
        hasImage: Boolean(imageAttachment),
        hasAudio: Boolean(audioAttachment),
        processingTimeMs,
        existingQuoteCount: savedQuotes.length,
      });

      setAgentStepIndex(3);
      await new Promise((r) => setTimeout(r, 220));

      setSavedQuotes((prev) => [newQuote, ...prev]);
      setActiveQuoteId(newQuote.id);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to generate quote. Please try again.'
      );
    } finally {
      window.clearTimeout(stepTimer1);
      window.clearTimeout(stepTimer2);
      setIsGenerating(false);
    }
  };

  const updateQuoteRecord = (updated: SavedQuote) => {
    setSavedQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  };

  const handleUpdateLineQuantity = (lineId: string, quantity: number) => {
    if (!activeQuote) return;
    const modified = activeQuote.lines.map((line) =>
      line.id === lineId ? { ...line, quantity: Math.max(0, quantity) } : line
    );
    const { lines, totals } = recomputeQuoteLines(modified, activeQuote.discountPercent);
    updateQuoteRecord({ ...activeQuote, lines, totals });
  };

  const handleRemoveLine = (lineId: string) => {
    if (!activeQuote) return;
    const filtered = activeQuote.lines.filter((line) => line.id !== lineId);
    const { lines, totals } = recomputeQuoteLines(filtered, activeQuote.discountPercent);
    updateQuoteRecord({ ...activeQuote, lines, totals });
  };

  const handleAddCatalogItemToQuote = (catalogItemId: string) => {
    if (!activeQuote) return;
    const item = activeBusiness.items.find((i) => i.id === catalogItemId);
    if (!item) return;
    const newLine = computeQuoteLine(item, 1, activeQuote.discountPercent, 'Added manually', 'high');
    const { lines, totals } = recomputeQuoteLines(
      [...activeQuote.lines, newLine],
      activeQuote.discountPercent
    );
    updateQuoteRecord({ ...activeQuote, lines, totals });
  };

  const handleUpdateDiscount = (discountPercent: number) => {
    if (!activeQuote) return;
    const safePct = Math.min(100, Math.max(0, discountPercent));
    const { lines, totals } = recomputeQuoteLines(activeQuote.lines, safePct);
    updateQuoteRecord({ ...activeQuote, discountPercent: safePct, lines, totals });
  };

  const handleUpdateQuoteStatus = (quoteId: string, status: QuoteStatus) => {
    setSavedQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, status } : q)));
  };

  const handleDeleteQuote = (quoteId: string) => {
    setSavedQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    if (activeQuoteId === quoteId) {
      setActiveQuoteId(null);
    }
  };

  const handleOpenQuoteFromHistory = (quoteId: string) => {
    setActiveQuoteId(quoteId);
    setActiveView('workspace');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        onNewQuote={handleNewQuote}
      />

      {activeView === 'workspace' && (
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          {/* Mobile Rate Card Drawer Trigger */}
          <div className="no-print mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-slate-900">
                {activeBusiness.presetName}
              </div>
              <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                {activeBusiness.items.length} items · GSTIN {activeBusiness.gstin}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Rate Card</span>
            </button>
          </div>

          {/* Mobile Drawer Overlay */}
          {mobileDrawerOpen && (
            <div className="no-print fixed inset-0 z-40 flex lg:hidden">
              <div
                className="fixed inset-0 bg-slate-900/40"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <div className="relative z-10 flex h-full w-80 max-w-full flex-col overflow-y-auto bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">Business Rate Card</span>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200"
                    aria-label="Close Rate Card drawer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <RateCardSidebar
                  presets={businesses}
                  activeBusiness={activeBusiness}
                  onSelectPreset={(id) => {
                    setActiveBusinessId(id);
                    setMobileDrawerOpen(false);
                  }}
                  onOpenFullEditor={() => {
                    setMobileDrawerOpen(false);
                    setActiveView('ratecard');
                  }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            {/* Left Sidebar: Business Rate Card (Desktop) */}
            <div className="no-print hidden lg:col-span-4 lg:block xl:col-span-3">
              <RateCardSidebar
                presets={businesses}
                activeBusiness={activeBusiness}
                onSelectPreset={setActiveBusinessId}
                onOpenFullEditor={() => setActiveView('ratecard')}
              />
            </div>

            {/* Main Column: Inquiry Input + Live GST Quote Output */}
            <div className="flex flex-col gap-6 lg:col-span-8 xl:col-span-9">
              <InquiryInputCard
                activeBusiness={activeBusiness}
                inquiryText={inquiryText}
                onChangeText={setInquiryText}
                imageAttachment={imageAttachment}
                onChangeImage={setImageAttachment}
                audioAttachment={audioAttachment}
                onChangeAudio={setAudioAttachment}
                onLoadSampleNote={handleLoadSampleNote}
                onGenerateQuote={handleGenerateQuote}
                isGenerating={isGenerating}
                agentStepIndex={agentStepIndex}
                errorMessage={errorMessage}
              />

              <QuoteOutputPanel
                quote={activeQuote}
                activeBusiness={activeBusiness}
                onUpdateQuote={updateQuoteRecord}
                onUpdateLineQuantity={handleUpdateLineQuantity}
                onRemoveLine={handleRemoveLine}
                onAddCatalogItemToQuote={handleAddCatalogItemToQuote}
                onUpdateDiscount={handleUpdateDiscount}
                onOpenRateCard={() => setActiveView('ratecard')}
              />
            </div>
          </div>
        </main>
      )}

      {activeView === 'ratecard' && (
        <RateCardManager
          presets={businesses}
          activeBusiness={activeBusiness}
          onSelectPreset={setActiveBusinessId}
          onUpdateBusiness={handleUpdateBusiness}
          onResetPreset={handleResetPreset}
        />
      )}

      {activeView === 'history' && (
        <HistoryImpactView
          quotes={savedQuotes}
          onOpenQuote={handleOpenQuoteFromHistory}
          onUpdateStatus={handleUpdateQuoteStatus}
          onDeleteQuote={handleDeleteQuote}
          onGoToWorkspace={() => setActiveView('workspace')}
        />
      )}
    </div>
  );
}
