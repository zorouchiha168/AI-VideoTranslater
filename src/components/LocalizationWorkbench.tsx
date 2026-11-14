import { useState } from 'react';
import {
  Volume2,
  Copy,
  Check,
  Download,
  Play,
  Sparkles,
  Sliders,
} from 'lucide-react';
import {
  GEMINI_VOICE_CATALOG,
  type CharacterVoiceProfile,
  type DialogueSegment,
  type GeminiVoiceName,
  type LocalizationResult,
  type SubtitleFontFamily,
  type SubtitlePosition,
  type SubtitleStyle,
  type VoiceArchetype,
} from '../types/localization';
import {
  estimateSyllableFit,
  generateFullLocalizationReport,
  generateSrt,
  generateVtt,
} from '../utils/subtitleUtils';

export type WorkbenchTab = 'characters' | 'transcript' | 'dubbing' | 'subtitles';

interface LocalizationWorkbenchProps {
  result: LocalizationResult;
  activeTab: WorkbenchTab;
  currentTimeSec: number;
  subtitleStyle: SubtitleStyle;
  isBatchSynthesizing: boolean;
  synthesizingSegmentId: string | null;
  onChangeTab: (tab: WorkbenchTab) => void;
  onUpdateCharacter: (charId: string, patch: Partial<CharacterVoiceProfile>) => void;
  onUpdateSegmentText: (segmentId: string, field: 'translatedText' | 'dubbingText', value: string) => void;
  onSeekToSegment: (startSec: number) => void;
  onPlayDubLine: (segment: DialogueSegment) => void;
  onPreviewCharacterVoice: (character: CharacterVoiceProfile) => void;
  onBatchSynthesizeAll: () => void;
  onUpdateSubtitleStyle: (patch: Partial<SubtitleStyle>) => void;
  onDownloadTextFile: (filename: string, content: string, mimeType?: string) => void;
}

const FONT_OPTIONS: { value: SubtitleFontFamily; label: string; note: string }[] = [
  { value: 'Kantumruy Pro', label: 'Kantumruy Pro', note: 'Khmer Unicode' },
  { value: 'Battambang', label: 'Battambang', note: 'Khmer Display' },
  { value: 'Noto Sans Khmer', label: 'Noto Sans Khmer', note: 'Khmer Sans' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', note: 'Multilingual' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono', note: 'Timecode Mono' },
];

const COLOR_SWATCHES = ['#FFFFFF', '#FDE047', '#F59E0B', '#38BDF8', '#A7F3D0'];

export function LocalizationWorkbench({
  result,
  activeTab,
  currentTimeSec,
  subtitleStyle,
  isBatchSynthesizing,
  synthesizingSegmentId,
  onChangeTab,
  onUpdateCharacter,
  onUpdateSegmentText,
  onSeekToSegment,
  onPlayDubLine,
  onPreviewCharacterVoice,
  onBatchSynthesizeAll,
  onUpdateSubtitleStyle,
  onDownloadTextFile,
}: LocalizationWorkbenchProps) {
  const [subtitleFormat, setSubtitleFormat] = useState<'srt' | 'vtt' | 'report'>('srt');
  const [includeSpeakerInSubs, setIncludeSpeakerInSubs] = useState(false);
  const [copiedFlag, setCopiedFlag] = useState(false);

  const srtText = generateSrt(result.segments, includeSpeakerInSubs);
  const vttText = generateVtt(result.segments, includeSpeakerInSubs);
  const reportText = generateFullLocalizationReport(result);

  const activeExportPreview =
    subtitleFormat === 'srt' ? srtText : subtitleFormat === 'vtt' ? vttText : reportText;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeExportPreview);
      setCopiedFlag(true);
      setTimeout(() => setCopiedFlag(false), 1800);
    } catch {
      // Fallback ignored
    }
  };

  const tabs: { id: WorkbenchTab; label: string }[] = [
    { id: 'characters', label: '1. Language & Characters' },
    { id: 'transcript', label: '2. Original Transcript' },
    { id: 'dubbing', label: '3. Dubbing & Lip-Sync' },
    { id: 'subtitles', label: '4. Subtitles & Customizer' },
  ];

  return (
    <section
      aria-label="Localization Output Workbench"
      className="rounded-xl border border-slate-800 bg-[#111827] flex flex-col overflow-hidden"
    >
      {/* 4-Section Tab Bar */}
      <div
        role="tablist"
        aria-label="Localization output sections"
        className="flex flex-wrap items-center gap-1 border-b border-slate-800 bg-[#0D131F] px-3 py-2.5"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => onChangeTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="p-5 space-y-5 flex-1">
        {/* SECTION 1: LANGUAGE & CHARACTER CONFIGURATION */}
        {activeTab === 'characters' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1 min-w-0">
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  Language & Character Voice Mapping
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>
                    Source: <strong className="text-slate-200">{result.detectedSourceLanguage}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Target: <strong className="text-amber-400">{result.targetLanguage}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{result.characters.length} detected speakers</span>
                </div>
                {result.summary && (
                  <p className="text-xs text-slate-400 pt-1 max-w-2xl leading-relaxed">
                    {result.summary}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onBatchSynthesizeAll}
                disabled={isBatchSynthesizing || result.segments.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sparkles
                  className={`h-3.5 w-3.5 text-amber-400 ${isBatchSynthesizing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>
                  {isBatchSynthesizing ? 'Synthesizing Gemini Dubs...' : 'Pre-Synthesize All Dub Clips'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {result.characters.map((char) => (
                <div
                  key={char.id}
                  className="rounded-lg border border-slate-800 bg-[#0B0F17] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 rounded-sm shrink-0"
                        style={{ backgroundColor: char.colorHex }}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-100">
                          {char.name}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            · {char.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{char.toneDescription}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onPreviewCharacterVoice(char)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Volume2 className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                      <span>Preview {char.name}</span>
                    </button>
                  </div>

                  {/* Voice Switcher Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label
                        htmlFor={`archetype-${char.id}`}
                        className="block text-[11px] font-medium text-slate-400 mb-1"
                      >
                        Archetype
                      </label>
                      <select
                        id={`archetype-${char.id}`}
                        value={char.archetype}
                        onChange={(e) =>
                          onUpdateCharacter(char.id, {
                            archetype: e.target.value as VoiceArchetype,
                          })
                        }
                        className="w-full rounded-md border border-slate-700 bg-[#111827] px-2.5 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Child">Child</option>
                        <option value="Narrator">Narrator</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor={`voice-${char.id}`}
                        className="block text-[11px] font-medium text-slate-400 mb-1"
                      >
                        AI Voice Persona
                      </label>
                      <select
                        id={`voice-${char.id}`}
                        value={char.voiceName}
                        onChange={(e) =>
                          onUpdateCharacter(char.id, {
                            voiceName: e.target.value as GeminiVoiceName,
                          })
                        }
                        className="w-full rounded-md border border-slate-700 bg-[#111827] px-2.5 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                      >
                        {GEMINI_VOICE_CATALOG.map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name} ({v.archetype})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <label htmlFor={`pitch-${char.id}`}>Pitch</label>
                        <span className="font-mono text-slate-200">{char.pitch.toFixed(2)}x</span>
                      </div>
                      <input
                        id={`pitch-${char.id}`}
                        type="range"
                        min={0.65}
                        max={1.55}
                        step={0.05}
                        value={char.pitch}
                        onChange={(e) =>
                          onUpdateCharacter(char.id, { pitch: Number(e.target.value) })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <label htmlFor={`speed-${char.id}`}>Speed</label>
                        <span className="font-mono text-slate-200">{char.speed.toFixed(2)}x</span>
                      </div>
                      <input
                        id={`speed-${char.id}`}
                        type="range"
                        min={0.75}
                        max={1.45}
                        step={0.05}
                        value={char.speed}
                        onChange={(e) =>
                          onUpdateCharacter(char.id, { speed: Number(e.target.value) })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: ORIGINAL TRANSCRIPT WITH TIMESTAMPS */}
        {activeTab === 'transcript' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  Original Transcript with Timestamps
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any dialogue cue to jump the video playhead directly to that moment.
                </p>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {result.segments.length} lines
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-[#0B0F17]">
              {result.segments.map((seg) => {
                const isActive =
                  currentTimeSec >= seg.startTimeSec && currentTimeSec <= seg.endTimeSec;
                const char = result.characters.find((c) => c.id === seg.speakerId);
                return (
                  <div
                    key={seg.id}
                    className={`p-3.5 transition-colors ${
                      isActive ? 'bg-amber-500/10' : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <button
                        type="button"
                        onClick={() => onSeekToSegment(seg.startTimeSec)}
                        className="inline-flex items-center gap-2 text-xs font-mono text-amber-400 hover:text-amber-300 cursor-pointer"
                      >
                        <span>
                          [{seg.startTimestamp} - {seg.endTimestamp}]
                        </span>
                        <span
                          className="font-sans font-semibold"
                          style={{ color: char?.colorHex || '#E2E8F0' }}
                        >
                          {seg.speakerName}
                        </span>
                      </button>

                      <span className="text-[11px] text-slate-500">
                        {seg.emotion}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{seg.originalText}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 3: AI CHARACTER DUBBING & LIP-SYNC SCRIPT */}
        {activeTab === 'dubbing' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  AI Character Dubbing & Lip-Sync Script ({result.targetLanguage})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Culturally natural phrasing tuned to match speaking duration. Edit any line to refine lip-sync.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {result.segments.map((seg) => {
                const isActive =
                  currentTimeSec >= seg.startTimeSec && currentTimeSec <= seg.endTimeSec;
                const char = result.characters.find((c) => c.id === seg.speakerId);
                const fit = estimateSyllableFit(seg.originalText, seg.dubbingText);
                const isSynthesizing = synthesizingSegmentId === seg.id;

                return (
                  <div
                    key={seg.id}
                    className={`rounded-lg border p-3.5 space-y-2.5 transition-colors ${
                      isActive
                        ? 'border-amber-500/70 bg-amber-500/5'
                        : 'border-slate-800 bg-[#0B0F17]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => onSeekToSegment(seg.startTimeSec)}
                          className="font-mono text-amber-400 hover:underline cursor-pointer"
                        >
                          [{seg.startTimestamp} - {seg.endTimestamp}]
                        </button>
                        <span
                          className="font-semibold"
                          style={{ color: char?.colorHex || '#E2E8F0' }}
                        >
                          [{seg.speakerName}]
                        </span>
                        <span className="text-slate-400">({seg.emotion})</span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span
                          className={
                            fit.status === 'ideal'
                              ? 'text-emerald-400'
                              : fit.status === 'compact'
                                ? 'text-sky-400'
                                : 'text-amber-400'
                          }
                        >
                          Sync ratio {fit.ratio}x ({fit.status})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onPlayDubLine(seg)}
                        disabled={isSynthesizing}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {isSynthesizing ? (
                          <Sparkles className="h-3 w-3 animate-spin text-amber-400" aria-hidden="true" />
                        ) : (
                          <Play className="h-3 w-3 text-amber-400 fill-current" aria-hidden="true" />
                        )}
                        <span>{seg.audioBase64 ? 'Play Cached Dub' : 'Speak Dub Line'}</span>
                      </button>
                    </div>

                    <label htmlFor={`dub-input-${seg.id}`} className="sr-only">
                      Dubbing dialogue for {seg.speakerName}
                    </label>
                    <textarea
                      id={`dub-input-${seg.id}`}
                      rows={2}
                      value={seg.dubbingText}
                      onChange={(e) =>
                        onUpdateSegmentText(seg.id, 'dubbingText', e.target.value)
                      }
                      style={{ fontFamily: `"Kantumruy Pro", "Plus Jakarta Sans", sans-serif` }}
                      className="w-full rounded-md border border-slate-800 bg-[#111827] px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none leading-relaxed"
                    />

                    <p className="text-[11px] text-slate-400">
                      Original: <span className="text-slate-300">&ldquo;{seg.originalText}&rdquo;</span>
                      {seg.lipSyncNotes ? ` — ${seg.lipSyncNotes}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 4: SUBTITLE CUSTOMIZER & .SRT / .VTT GENERATION */}
        {activeTab === 'subtitles' && (
          <div className="space-y-5">
            {/* Subtitle Overlay Customizer */}
            <div className="rounded-lg border border-slate-800 bg-[#0B0F17] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  <h3 className="font-display text-sm font-semibold text-slate-100">
                    Subtitle Overlay Customizer
                  </h3>
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subtitleStyle.showSpeakerLabel}
                    onChange={(e) =>
                      onUpdateSubtitleStyle({ showSpeakerLabel: e.target.checked })
                    }
                    className="rounded border-slate-600 accent-amber-500"
                  />
                  <span>Show speaker name on video</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="subtitle-font-select"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Font Family (Khmer Unicode Ready)
                  </label>
                  <select
                    id="subtitle-font-select"
                    value={subtitleStyle.fontFamily}
                    onChange={(e) =>
                      onUpdateSubtitleStyle({
                        fontFamily: e.target.value as SubtitleFontFamily,
                      })
                    }
                    className="w-full rounded-md border border-slate-700 bg-[#111827] px-2.5 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label} ({f.note})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                    <label htmlFor="subtitle-size-range">Font Size</label>
                    <span className="font-mono text-slate-200">{subtitleStyle.fontSize}px</span>
                  </div>
                  <input
                    id="subtitle-size-range"
                    type="range"
                    min={14}
                    max={36}
                    step={1}
                    value={subtitleStyle.fontSize}
                    onChange={(e) =>
                      onUpdateSubtitleStyle({ fontSize: Number(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                    <label htmlFor="subtitle-opacity-range">Background Opacity</label>
                    <span className="font-mono text-slate-200">
                      {Math.round(subtitleStyle.bgOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    id="subtitle-opacity-range"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={subtitleStyle.bgOpacity}
                    onChange={(e) =>
                      onUpdateSubtitleStyle({ bgOpacity: Number(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">
                    Text Color
                  </span>
                  <div className="flex items-center gap-2">
                    {COLOR_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Set subtitle color ${hex}`}
                        onClick={() => onUpdateSubtitleStyle({ textColor: hex })}
                        style={{ backgroundColor: hex }}
                        className={`h-6 w-6 rounded-md border cursor-pointer transition-transform ${
                          subtitleStyle.textColor.toLowerCase() === hex.toLowerCase()
                            ? 'border-amber-400 scale-110 ring-2 ring-amber-400/40'
                            : 'border-slate-700'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="Custom subtitle color"
                      value={subtitleStyle.textColor}
                      onChange={(e) =>
                        onUpdateSubtitleStyle({ textColor: e.target.value })
                      }
                      className="h-6 w-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">
                    Vertical Position
                  </span>
                  <div className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-[#111827] p-1">
                    {(['bottom', 'middle', 'top'] as SubtitlePosition[]).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => onUpdateSubtitleStyle({ position: pos })}
                        className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors cursor-pointer ${
                          subtitleStyle.position === pos
                            ? 'bg-slate-800 text-amber-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* .SRT / .VTT / Full Report Code Output & Downloads */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0B0F17] p-1">
                  <button
                    type="button"
                    onClick={() => setSubtitleFormat('srt')}
                    className={`rounded-md px-3 py-1 text-xs font-mono font-medium transition-colors cursor-pointer ${
                      subtitleFormat === 'srt'
                        ? 'bg-slate-800 text-amber-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    .SRT Subtitles
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubtitleFormat('vtt')}
                    className={`rounded-md px-3 py-1 text-xs font-mono font-medium transition-colors cursor-pointer ${
                      subtitleFormat === 'vtt'
                        ? 'bg-slate-800 text-amber-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    .VTT Subtitles
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubtitleFormat('report')}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      subtitleFormat === 'report'
                        ? 'bg-slate-800 text-amber-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    4-Section Package
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-400 mr-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSpeakerInSubs}
                      onChange={(e) => setIncludeSpeakerInSubs(e.target.checked)}
                      className="rounded border-slate-600 accent-amber-500"
                    />
                    <span>Include [Speaker]</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    {copiedFlag ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{copiedFlag ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onDownloadTextFile(
                        `${result.projectTitle.toLowerCase().replace(/\s+/g, '-')}.srt`,
                        srtText,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Download .SRT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onDownloadTextFile(
                        `${result.projectTitle.toLowerCase().replace(/\s+/g, '-')}.vtt`,
                        vttText,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>.VTT</span>
                  </button>
                </div>
              </div>

              <pre
                data-testid="subtitle-code-output"
                className="rounded-lg border border-slate-800 bg-[#060911] p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-72 leading-relaxed whitespace-pre-wrap"
              >
                {activeExportPreview}
              </pre>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
