import { Plus } from 'lucide-react';

export type AppView = 'workspace' | 'ratecard' | 'history';

interface TopBarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onNewQuote: () => void;
}

export function TopBar({ activeView, onSelectView, onNewQuote }: TopBarProps) {
  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'workspace', label: 'Quote Workspace' },
    { id: 'ratecard', label: 'Rate Card' },
    { id: 'history', label: 'History & Impact' },
  ];

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectView('workspace')}
          className="text-left text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          QuoteSnap AI
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary Navigation" className="flex items-center gap-6 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                  isActive
                    ? 'text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-indigo-700" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewQuote}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-indigo-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New Quote</span>
          </button>
        </div>
      </div>
    </header>
  );
}
