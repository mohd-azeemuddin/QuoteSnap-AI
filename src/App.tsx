import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { PRESET_BUSINESSES } from './data/presets.ts';
import type {
  AgentExtractionResult,
  BusinessProfile,
  QuoteStatus,
  SavedQuote,
  SupplyType,
} from './types.ts';
import {
  buildQuoteFromExtraction,
  computeQuoteLine,
  decodeShareableQuote,
  recomputeQuoteLines,
} from './utils/quoteMath.ts';
import { TopBar, type AppView } from './components/TopBar.tsx';
import { RateCardManager, RateCardSidebar } from './components/RateCardPanel.tsx';
import { InquiryInputCard, type MediaAttachment } from './components/InquiryInputCard.tsx';
import { QuoteOutputPanel } from './components/QuoteOutputPanel.tsx';
import { HistoryImpactView } from './components/HistoryImpactView.tsx';
import { ShareableQuoteView } from './components/ShareableQuoteView.tsx';

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

function loadSharedQuoteFromUrl(): SavedQuote | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('quote');
    if (!encoded) return null;
    return decodeShareableQuote(encoded);
  } catch {
    return null;
  }
}

export default function App() {
  const [sharedQuote, setSharedQuote] = useState<SavedQuote | null>(loadSharedQuoteFromUrl);
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
  const [startAddingBusiness, setStartAddingBusiness] = useState(false);

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

  if (sharedQuote) {
    return (
      <ShareableQuoteView
        quote={sharedQuote}
        onExitShareView={() => {
          setSharedQuote(null);
          window.history.replaceState({}, '', window.location.pathname);
        }}
      />
    );
  }

  const handleUpdateBusiness = (updated: BusinessProfile) => {
    setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleCreateBusiness = (newBusiness: BusinessProfile) => {
    setBusinesses((prev) => [...prev, newBusiness]);
    setActiveBusinessId(newBusiness.id);
    setStartAddingBusiness(false);
  };

  const handleDeleteBusiness = (businessId: string) => {
    setBusinesses((prev) => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter((b) => b.id !== businessId);
      if (activeBusinessId === businessId && remaining.length > 0) {
        setActiveBusinessId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleResetPreset = (presetId: string) => {
    const original = PRESET_BUSINESSES.find((p) => p.id === presetId);
    if (!original) return;
    setBusinesses((prev) => prev.map((b) => (b.id === presetId ? original : b)));
  };

  const handleAddBusinessClick = () => {
    setMobileDrawerOpen(false);
    setStartAddingBusiness(true);
    setActiveView('ratecard');
  };

  const handleSelectView = (view: AppView) => {
    if (view !== 'ratecard') {
      setStartAddingBusiness(false);
    }
    setActiveView(view);
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

  const handleUpdateLineQuantity = (
    lineId: string,
    quantity: number,
    dimensionsNote?: string
  ) => {
    if (!activeQuote) return;
    const supplyType = activeQuote.supplyType || 'intra';
    const modified = activeQuote.lines.map((line) =>
      line.id === lineId
        ? {
            ...line,
            quantity: Math.max(0, quantity),
            dimensionsNote: dimensionsNote ?? line.dimensionsNote,
          }
        : line
    );
    const { lines, totals } = recomputeQuoteLines(
      modified,
      activeQuote.discountPercent,
      supplyType
    );
    updateQuoteRecord({ ...activeQuote, lines, totals });
  };

  const handleRemoveLine = (lineId: string) => {
    if (!activeQuote) return;
    const supplyType = activeQuote.supplyType || 'intra';
    const filtered = activeQuote.lines.filter((line) => line.id !== lineId);
    const { lines, totals } = recomputeQuoteLines(
      filtered,
      activeQuote.discountPercent,
      supplyType
    );
    updateQuoteRecord({ ...activeQuote, lines, totals });
  };

  const handleAddCatalogItemToQuote = (catalogItemId: string) => {
    if (!activeQuote) return;
    const item = activeBusiness.items.find((i) => i.id === catalogItemId);
    if (!item) return;
    const supplyType = activeQuote.supplyType || 'intra';
    const newLine = computeQuoteLine(
      item,
      1,
      activeQuote.discountPercent,
      'Added manually',
      'high',
      supplyType,
      'Manually added by business owner'
    );
    const { lines, totals } = recomputeQuoteLines(
      [...activeQuote.lines, newLine],
      activeQuote.discountPercent,
      supplyType
    );
    updateQuoteRecord({ ...activeQuote, lines, totals });
  };

  const handleUpdateDiscount = (discountPercent: number) => {
    if (!activeQuote) return;
    const supplyType = activeQuote.supplyType || 'intra';
    const safePct = Math.min(100, Math.max(0, discountPercent));
    const { lines, totals } = recomputeQuoteLines(activeQuote.lines, safePct, supplyType);
    updateQuoteRecord({ ...activeQuote, discountPercent: safePct, lines, totals });
  };

  const handleUpdateSupplyType = (supplyType: SupplyType) => {
    if (!activeQuote) return;
    const { lines, totals } = recomputeQuoteLines(
      activeQuote.lines,
      activeQuote.discountPercent,
      supplyType
    );
    updateQuoteRecord({ ...activeQuote, supplyType, lines, totals });
  };

  const handleUpdateQuoteStatus = (quoteId: string, status: QuoteStatus) => {
    setSavedQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, status } : q)));
  };

  const handleUpdateManualBaseline = (quoteId: string, mins: number) => {
    setSavedQuotes((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, manualBaselineMins: mins } : q))
    );
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
        onSelectView={handleSelectView}
        onNewQuote={handleNewQuote}
      />

      {activeView === 'workspace' && (
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="no-print mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-slate-900">
                {activeBusiness.presetName}
              </div>
              <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                {activeBusiness.items.length} items · GSTIN {activeBusiness.gstin || 'Not set'}
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
                    setStartAddingBusiness(false);
                    setActiveView('ratecard');
                  }}
                  onAddBusiness={handleAddBusinessClick}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            <div className="no-print hidden lg:col-span-4 lg:block xl:col-span-3">
              <RateCardSidebar
                presets={businesses}
                activeBusiness={activeBusiness}
                onSelectPreset={setActiveBusinessId}
                onOpenFullEditor={() => {
                  setStartAddingBusiness(false);
                  setActiveView('ratecard');
                }}
                onAddBusiness={handleAddBusinessClick}
              />
            </div>

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
                onUpdateSupplyType={handleUpdateSupplyType}
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
          onCreateBusiness={handleCreateBusiness}
          onDeleteBusiness={handleDeleteBusiness}
          startAddingBusiness={startAddingBusiness}
          onDismissAddBusiness={() => setStartAddingBusiness(false)}
        />
      )}

      {activeView === 'history' && (
        <HistoryImpactView
          quotes={savedQuotes}
          onOpenQuote={handleOpenQuoteFromHistory}
          onUpdateStatus={handleUpdateQuoteStatus}
          onUpdateManualBaseline={handleUpdateManualBaseline}
          onDeleteQuote={handleDeleteQuote}
          onGoToWorkspace={() => setActiveView('workspace')}
        />
      )}
    </div>
  );
}
