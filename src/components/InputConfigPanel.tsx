import { useRef, useState } from 'react';
import { Upload, FileVideo, FileText, Wand2, Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
import {
  LOCALIZATION_MODES,
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  type LocalizationOption,
} from '../types/localization';

interface InputConfigPanelProps {
  sourceLanguage: string;
  targetLanguage: string;
  localizationOption: LocalizationOption;
  scriptText: string;
  uploadedFile: File | null;
  isProcessing: boolean;
  errorMsg: string | null;
  onSourceLanguageChange: (val: string) => void;
  onTargetLanguageChange: (val: string) => void;
  onLocalizationOptionChange: (val: LocalizationOption) => void;
  onScriptTextChange: (val: string) => void;
  onFileSelected: (file: File | null) => void;
  onRunLocalization: () => void;
  onLoadSampleStory: () => void;
}

export function InputConfigPanel({
  sourceLanguage,
  targetLanguage,
  localizationOption,
  scriptText,
  uploadedFile,
  isProcessing,
  errorMsg,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onLocalizationOptionChange,
  onScriptTextChange,
  onFileSelected,
  onRunLocalization,
  onLoadSampleStory,
}: InputConfigPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [inputTab, setInputTab] = useState<'media' | 'script'>('media');
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <section
      aria-label="Localization Input and Configuration"
      className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100">
            01. Source Media & Language Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload a video/audio clip or paste dialogue to transcribe, translate, and dub.
          </p>
        </div>

        <button
          type="button"
          onClick={onLoadSampleStory}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          <span>Load Sample Reel</span>
        </button>
      </div>

      {/* Language Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="source-language-select"
            className="block text-xs font-medium text-slate-300 mb-1.5"
          >
            Source Language
          </label>
          <select
            id="source-language-select"
            value={sourceLanguage}
            onChange={(e) => onSourceLanguageChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-[#0B0F17] px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
          >
            {SOURCE_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label} ({lang.nativeLabel})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="target-language-select"
            className="block text-xs font-medium text-slate-300 mb-1.5"
          >
            Target Language
          </label>
          <select
            id="target-language-select"
            value={targetLanguage}
            onChange={(e) => onTargetLanguageChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-[#0B0F17] px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
          >
            {TARGET_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label} ({lang.nativeLabel})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Localization Mode (Options 1 - 4) */}
      <div>
        <span className="block text-xs font-medium text-slate-300 mb-2">
          Localization Package Mode
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LOCALIZATION_MODES.map((mode) => {
            const active = localizationOption === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onLocalizationOptionChange(mode.id)}
                className={`text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                  active
                    ? 'border-amber-500/80 bg-amber-500/10 text-slate-100'
                    : 'border-slate-800 bg-[#0B0F17]/70 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{mode.label}</span>
                  <span className="text-[11px] font-mono text-slate-400">{mode.shortTitle}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{mode.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Type Switcher: Video/Audio File vs Script Text */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1 rounded-lg bg-[#0B0F17] p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setInputTab('media')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              inputTab === 'media'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileVideo className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Upload Video / Audio</span>
          </button>
          <button
            type="button"
            onClick={() => setInputTab('script')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              inputTab === 'script'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Paste Story Script</span>
          </button>
        </div>

        {inputTab === 'media' ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-lg border border-dashed p-5 text-center transition-colors ${
              isDragging
                ? 'border-amber-500 bg-amber-500/5'
                : 'border-slate-700 bg-[#0B0F17]/60 hover:border-slate-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              aria-label="Upload video or audio file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                onFileSelected(f);
              }}
            />

            <Upload className="mx-auto h-6 w-6 text-slate-400 mb-2" aria-hidden="true" />

            {uploadedFile ? (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-100 truncate max-w-xs mx-auto">
                  {uploadedFile.name}
                </p>
                <p className="text-xs font-mono text-slate-400">
                  {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB · {uploadedFile.type || 'media'}
                </p>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    Replace file
                  </button>
                  <button
                    type="button"
                    onClick={() => onFileSelected(null)}
                    className="text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-300">
                  Drop an MP4, WebM, MOV, MP3, or WAV file here (up to 80 MB)
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Choose Media File
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="story-script-input" className="sr-only">
              Story or dialogue script
            </label>
            <textarea
              id="story-script-input"
              rows={5}
              value={scriptText}
              onChange={(e) => onScriptTextChange(e.target.value)}
              placeholder="[00:00 - 00:04] Narrator: Enter dialogue lines with optional timestamps..."
              className="w-full rounded-lg border border-slate-700 bg-[#0B0F17] p-3 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none leading-relaxed"
            />
          </div>
        )}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-200"
        >
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onRunLocalization}
        disabled={isProcessing}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors duration-150 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Sparkles className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Processing AI Localization...</span>
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            <span>Process Localization Package</span>
          </>
        )}
      </button>
    </section>
  );
}
