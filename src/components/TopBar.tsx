import { Download } from 'lucide-react';

interface TopBarProps {
  activeSection: 'source' | 'characters' | 'dubbing' | 'subtitles';
  onNavigateSection: (section: 'source' | 'characters' | 'dubbing' | 'subtitles') => void;
  onExportPackage: () => void;
  hasResult: boolean;
}

export function TopBar({
  activeSection,
  onNavigateSection,
  onExportPackage,
  hasResult,
}: TopBarProps) {
  const navItems: { id: 'source' | 'characters' | 'dubbing' | 'subtitles'; label: string }[] = [
    { id: 'source', label: 'Video & Source' },
    { id: 'characters', label: 'Character Voices' },
    { id: 'dubbing', label: 'Lip-Sync Script' },
    { id: 'subtitles', label: 'Subtitles & Export' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigateSection('source');
          }}
          className="font-display text-lg font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          AI VideoTranslater
        </a>

        {/* Zone 2: 4 Clean Single-Line Nav Links */}
        <nav
          aria-label="Studio sections"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400"
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigateSection(item.id)}
                className={`whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer pb-0.5 border-b-2 ${
                  isActive
                    ? 'text-slate-100 border-amber-500'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onExportPackage}
            disabled={!hasResult}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors duration-150 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export Package</span>
          </button>
        </div>
      </div>
    </header>
  );
}
