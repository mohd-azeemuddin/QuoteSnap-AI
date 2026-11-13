import React, { useRef, useState } from 'react';
import {
  Building2,
  Download,
  Edit3,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  Check,
  X,
} from 'lucide-react';
import type { BusinessProfile, CatalogItem } from '../types.ts';
import {
  exportRateCardCsv,
  formatINRCompact,
  getSampleRateCardCsv,
  isValidGSTIN,
  parseRateCardCsv,
} from '../utils/quoteMath.ts';

interface RateCardSidebarProps {
  presets: BusinessProfile[];
  activeBusiness: BusinessProfile;
  onSelectPreset: (presetId: string) => void;
  onOpenFullEditor: () => void;
}

export function RateCardSidebar({
  presets,
  activeBusiness,
  onSelectPreset,
  onOpenFullEditor,
}: RateCardSidebarProps) {
  return (
    <aside className="no-print flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">01. Business Rate Card</h2>
          <button
            type="button"
            onClick={onOpenFullEditor}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-800 whitespace-nowrap shrink-0"
          >
            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Edit / CSV</span>
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Switch Bangalore SMB presets or customize pricing.
        </p>
      </div>

      {/* Preset Switcher */}
      <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Business Presets">
        {presets.map((preset) => {
          const isSelected = preset.id === activeBusiness.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/70 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-xs font-semibold leading-snug">{preset.presetName}</span>
              <span className="mt-0.5 text-[11px] text-slate-500">{preset.categoryLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Active Business Snapshot */}
      <div className="border-t border-slate-100 pt-4 text-xs">
        <div className="font-semibold text-slate-900">{activeBusiness.businessName}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
          <span>GSTIN: {activeBusiness.gstin}</span>
          <span aria-hidden="true">·</span>
          <span>{activeBusiness.phone}</span>
        </div>
      </div>

      {/* Compact Rate Card Preview */}
      <div className="border-t border-slate-100 pt-4">
        <div className="mb-2.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700">Active Catalog</span>
          <span className="font-mono text-[11px] text-slate-500 tabular-nums">
            {activeBusiness.items.length} items
          </span>
        </div>
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {activeBusiness.items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-md border border-slate-100 bg-slate-50/70 px-2.5 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-slate-800" title={item.name}>
                  {item.name}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  per {item.unit} · {item.gstPercent}% GST
                </div>
              </div>
              <div className="shrink-0 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                {formatINRCompact(item.unitPrice)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

interface RateCardManagerProps {
  presets: BusinessProfile[];
  activeBusiness: BusinessProfile;
  onSelectPreset: (presetId: string) => void;
  onUpdateBusiness: (updated: BusinessProfile) => void;
  onResetPreset: (presetId: string) => void;
}

export function RateCardManager({
  presets,
  activeBusiness,
  onSelectPreset,
  onUpdateBusiness,
  onResetPreset,
}: RateCardManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CatalogItem | null>(null);
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<{
    name: string;
    unit: string;
    unitPrice: string;
    gstPercent: string;
    keywords: string;
    hsnSac: string;
  }>({
    name: '',
    unit: 'sq ft',
    unitPrice: '',
    gstPercent: '18',
    keywords: '',
    hsnSac: '',
  });

  const handleFieldChange = (field: keyof BusinessProfile, value: string) => {
    onUpdateBusiness({
      ...activeBusiness,
      [field]: value,
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newItem.unitPrice);
    const gst = parseFloat(newItem.gstPercent);
    if (!newItem.name.trim() || !Number.isFinite(price) || price < 0) return;

    const item: CatalogItem = {
      id: `custom-${Date.now()}`,
      name: newItem.name.trim(),
      unit: newItem.unit.trim() || 'unit',
      unitPrice: price,
      gstPercent: Number.isFinite(gst) ? gst : 18,
      keywords: newItem.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      hsnSac: newItem.hsnSac.trim() || undefined,
    };

    onUpdateBusiness({
      ...activeBusiness,
      items: [item, ...activeBusiness.items],
    });

    setNewItem({
      name: '',
      unit: 'sq ft',
      unitPrice: '',
      gstPercent: '18',
      keywords: '',
      hsnSac: '',
    });
  };

  const startEditItem = (item: CatalogItem) => {
    setEditingItemId(item.id);
    setEditDraft({ ...item });
  };

  const saveEditItem = () => {
    if (!editDraft) return;
    onUpdateBusiness({
      ...activeBusiness,
      items: activeBusiness.items.map((item) => (item.id === editDraft.id ? editDraft : item)),
    });
    setEditingItemId(null);
    setEditDraft(null);
  };

  const deleteItem = (itemId: string) => {
    onUpdateBusiness({
      ...activeBusiness,
      items: activeBusiness.items.filter((item) => item.id !== itemId),
    });
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const imported = parseRateCardCsv(text);
      if (imported.length === 0) {
        setCsvFeedback('Could not find valid rows in CSV. Expected columns: Item Name, Unit, Unit Price, GST %, Keywords.');
        return;
      }
      onUpdateBusiness({
        ...activeBusiness,
        items: imported,
      });
      setCsvFeedback(`Imported ${imported.length} catalog items from ${file.name}.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCsvDownload = () => {
    const csv = exportRateCardCsv(activeBusiness.items);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeBusiness.presetKey}-rate-card.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSampleCsvDownload = () => {
    const csv = getSampleRateCardCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quotesnap-sample-rate-card.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const gstinValid = !activeBusiness.gstin.trim() || isValidGSTIN(activeBusiness.gstin);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header & Preset Selector */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Business Profile & Rate Card
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure your GST details, pricing catalog, or upload a CSV rate card. Saved automatically in your browser.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  preset.id === activeBusiness.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.presetName}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onResetPreset(activeBusiness.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset Preset</span>
          </button>
        </div>
      </div>

      {/* Business Details Form */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Building2 className="h-4 w-4 text-indigo-700" aria-hidden="true" />
          <h2>Business & GST Details</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Legal / Trade Name</span>
            <input
              type="text"
              value={activeBusiness.businessName}
              onChange={(e) => handleFieldChange('businessName', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </label>
          <label className="block">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">GSTIN</span>
              {!gstinValid && (
                <span className="text-[11px] font-medium text-amber-700">
                  15-char format expected
                </span>
              )}
            </div>
            <input
              type="text"
              maxLength={15}
              value={activeBusiness.gstin}
              onChange={(e) => handleFieldChange('gstin', e.target.value.toUpperCase())}
              className={`mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 uppercase focus:outline-none ${
                gstinValid
                  ? 'border-slate-300 focus:border-indigo-600'
                  : 'border-amber-400 bg-amber-50/40 focus:border-amber-600'
              }`}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-700">WhatsApp / Phone</span>
            <input
              type="text"
              value={activeBusiness.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Office Address</span>
            <input
              type="text"
              value={activeBusiness.address}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Payment UPI ID (Optional)</span>
            <input
              type="text"
              placeholder="e.g. business@okicici"
              value={activeBusiness.upiId || ''}
              onChange={(e) => handleFieldChange('upiId', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-slate-700">Payment & Delivery Terms</span>
            <input
              type="text"
              placeholder="e.g. 50% booking advance, balance on delivery"
              value={activeBusiness.termsNote || ''}
              onChange={(e) => handleFieldChange('termsNote', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </label>
        </div>
      </section>

      {/* CSV Import / Export & Add New Item */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Service & Product Catalog ({activeBusiness.items.length} items)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Add Hinglish/English keywords so QuoteSnap AI matches customer slang accurately.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleSampleCsvDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>CSV Template</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Import CSV</span>
            </button>
            <button
              type="button"
              onClick={handleCsvDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {csvFeedback && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
            <span>{csvFeedback}</span>
            <button
              type="button"
              onClick={() => setCsvFeedback(null)}
              className="text-indigo-700 hover:text-indigo-900"
              aria-label="Dismiss CSV message"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Quick Add Form */}
        <form
          onSubmit={handleAddItem}
          className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-12"
        >
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-medium text-slate-600">Item / Service Name</label>
            <input
              type="text"
              required
              placeholder="e.g. WPC Louver Wall Panel"
              value={newItem.name}
              onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600">Unit</label>
            <input
              type="text"
              required
              placeholder="sq ft / unit / plate"
              value={newItem.unit}
              onChange={(e) => setNewItem((prev) => ({ ...prev, unit: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600">Unit Price (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="850"
              value={newItem.unitPrice}
              onChange={(e) => setNewItem((prev) => ({ ...prev, unitPrice: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 tabular-nums focus:border-indigo-600 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-[11px] font-medium text-slate-600">GST %</label>
            <select
              value={newItem.gstPercent}
              onChange={(e) => setNewItem((prev) => ({ ...prev, gstPercent: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
            >
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600">Keywords (comma)</label>
            <input
              type="text"
              placeholder="louver, panel, wall"
              value={newItem.keywords}
              onChange={(e) => setNewItem((prev) => ({ ...prev, keywords: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
          <div className="flex items-end sm:col-span-1">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Catalog Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-medium">Item Name</th>
                <th className="py-2.5 px-3 font-medium">Unit</th>
                <th className="py-2.5 px-3 text-right font-medium">Rate (₹)</th>
                <th className="py-2.5 px-3 text-right font-medium">GST %</th>
                <th className="py-2.5 px-3 font-medium">Match Keywords</th>
                <th className="py-2.5 pl-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeBusiness.items.map((item) => {
                const isEditing = editingItemId === item.id && editDraft;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 pr-4 font-medium text-slate-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDraft.name}
                          onChange={(e) =>
                            setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))
                          }
                          className="w-full rounded border border-indigo-400 px-2 py-1 text-xs"
                        />
                      ) : (
                        item.name
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDraft.unit}
                          onChange={(e) =>
                            setEditDraft((d) => (d ? { ...d, unit: e.target.value } : d))
                          }
                          className="w-20 rounded border border-indigo-400 px-2 py-1 text-xs"
                        />
                      ) : (
                        item.unit
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editDraft.unitPrice}
                          onChange={(e) =>
                            setEditDraft((d) =>
                              d ? { ...d, unitPrice: parseFloat(e.target.value) || 0 } : d
                            )
                          }
                          className="w-24 rounded border border-indigo-400 px-2 py-1 text-right font-mono text-xs"
                        />
                      ) : (
                        formatINRCompact(item.unitPrice)
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                      {isEditing ? (
                        <select
                          value={editDraft.gstPercent}
                          onChange={(e) =>
                            setEditDraft((d) =>
                              d ? { ...d, gstPercent: parseFloat(e.target.value) || 0 } : d
                            )
                          }
                          className="rounded border border-indigo-400 px-1.5 py-1 font-mono text-xs"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      ) : (
                        `${item.gstPercent}%`
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDraft.keywords.join(', ')}
                          onChange={(e) =>
                            setEditDraft((d) =>
                              d
                                ? {
                                    ...d,
                                    keywords: e.target.value
                                      .split(',')
                                      .map((k) => k.trim())
                                      .filter(Boolean),
                                  }
                                : d
                            )
                          }
                          className="w-full rounded border border-indigo-400 px-2 py-1 text-xs"
                        />
                      ) : (
                        item.keywords.join(', ')
                      )}
                    </td>
                    <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={saveEditItem}
                            className="rounded p-1 text-emerald-700 hover:bg-emerald-50"
                            aria-label="Save item"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemId(null);
                              setEditDraft(null);
                            }}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100"
                            aria-label="Cancel edit"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditItem(item)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
