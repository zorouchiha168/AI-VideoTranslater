import { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mic,
  Film,
  Sparkles,
} from 'lucide-react';
import type {
  CharacterVoiceProfile,
  DialogueSegment,
  DubAudioEngine,
  SubtitleStyle,
} from '../types/localization';
import { findActiveSegment, formatSecondsToMmSs } from '../utils/subtitleUtils';
import { drawSampleStoryFrame } from '../data/sampleStories';

interface VideoPlayerStageProps {
  mediaUrl: string | null;
  mediaType: 'sample' | 'video' | 'audio';
  projectTitle: string;
  segments: DialogueSegment[];
  characters: CharacterVoiceProfile[];
  subtitleStyle: SubtitleStyle;
  currentTimeSec: number;
  durationSec: number;
  isPlaying: boolean;
  muteOriginal: boolean;
  dubbingEnabled: boolean;
  dubEngine: DubAudioEngine;
  isExportingVideo: boolean;
  exportProgress: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate: (timeSec: number) => void;
  onDurationChange: (durSec: number) => void;
  onTogglePlay: () => void;
  onSeek: (timeSec: number) => void;
  onToggleMuteOriginal: () => void;
  onToggleDubbing: () => void;
  onChangeDubEngine: (engine: DubAudioEngine) => void;
  onExportVideo: () => void;
}

export function VideoPlayerStage({
  mediaUrl,
  mediaType,
  projectTitle,
  segments,
  characters,
  subtitleStyle,
  currentTimeSec,
  durationSec,
  isPlaying,
  muteOriginal,
  dubbingEnabled,
  dubEngine,
  isExportingVideo,
  exportProgress,
  videoRef,
  onTimeUpdate,
  onDurationChange,
  onTogglePlay,
  onSeek,
  onToggleMuteOriginal,
  onToggleDubbing,
  onChangeDubEngine,
  onExportVideo,
}: VideoPlayerStageProps) {
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeSegment = findActiveSegment(segments, currentTimeSec);
  const activeCharacter = activeSegment
    ? characters.find((c) => c.id === activeSegment.speakerId)
    : undefined;

  // Render animated sample canvas whenever mediaType === 'sample'
  useEffect(() => {
    if (mediaType !== 'sample') return;
    const canvas = sampleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSampleStoryFrame(ctx, canvas.width, canvas.height, currentTimeSec);
  }, [mediaType, currentTimeSec]);

  // Sync <video> mute property
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muteOriginal;
    }
  }, [muteOriginal, videoRef]);

  const positionClass =
    subtitleStyle.position === 'top'
      ? 'top-5 bottom-auto'
      : subtitleStyle.position === 'middle'
        ? 'top-1/2 -translate-y-1/2'
        : 'bottom-6 top-auto';

  const subtitleDisplayText = activeSegment
    ? subtitleStyle.showSpeakerLabel
      ? `${activeSegment.speakerName}: ${activeSegment.translatedText || activeSegment.dubbingText}`
      : activeSegment.translatedText || activeSegment.dubbingText
    : '';

  return (
    <section
      aria-label="Video Preview Player and Live Subtitle Overlay"
      className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden"
    >
      {/* Stage Header */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base font-semibold text-slate-100 truncate">
            {projectTitle || 'Preview Monitor'}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 mt-0.5">
            <span className="whitespace-nowrap">
              {mediaType === 'sample' ? 'Sample Story Reel' : mediaType === 'audio' ? 'Audio Track' : 'Uploaded Video'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono whitespace-nowrap">{segments.length} dialogue cues</span>
            {activeSegment && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400 font-medium whitespace-nowrap">
                  Speaking: {activeSegment.speakerName} ({activeSegment.emotion})
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onExportVideo}
          disabled={isExportingVideo || segments.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          {isExportingVideo ? (
            <>
              <Sparkles className="h-3.5 w-3.5 animate-spin text-amber-400" aria-hidden="true" />
              <span className="font-mono">Rendering {exportProgress}%</span>
            </>
          ) : (
            <>
              <Film className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              <span>Export Subtitled Video</span>
            </>
          )}
        </button>
      </div>

      {/* 16:9 Video Viewport with Real-Time Subtitle Overlay */}
      <div
        style={{ containerType: 'inline-size' }}
        className="relative aspect-video w-full bg-[#060911] select-none overflow-hidden"
      >
        {mediaType === 'video' && mediaUrl ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            playsInline
            muted={muteOriginal}
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration;
              if (Number.isFinite(dur) && dur > 0) onDurationChange(dur);
            }}
            onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
            onEnded={() => {
              if (isPlaying) onTogglePlay();
            }}
            className="h-full w-full object-contain"
          />
        ) : mediaType === 'audio' && mediaUrl ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#070B14] px-6 text-center">
            <audio
              ref={videoRef as React.RefObject<HTMLAudioElement | null>}
              src={mediaUrl}
              muted={muteOriginal}
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                if (Number.isFinite(dur) && dur > 0) onDurationChange(dur);
              }}
              onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
              onEnded={() => {
                if (isPlaying) onTogglePlay();
              }}
            />
            <p className="font-display text-lg font-semibold text-slate-200">
              Audio Localization Track
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Subtitles and AI character dubbing are synchronized to the audio timeline below.
            </p>
          </div>
        ) : (
          <canvas
            ref={sampleCanvasRef}
            data-testid="sample-video-canvas"
            width={960}
            height={540}
            className="h-full w-full object-cover"
          />
        )}

        {/* Real-time Subtitle Overlay (scaled proportionally via cqw to match 960px export canvas) */}
        {subtitleDisplayText && (
          <div
            data-testid="live-subtitle-overlay"
            className={`pointer-events-none absolute inset-x-0 flex justify-center px-4 transition-all duration-150 ${positionClass}`}
          >
            <div
              style={{
                fontFamily: `"${subtitleStyle.fontFamily}", "Noto Sans Khmer", sans-serif`,
                fontSize: `calc(${subtitleStyle.fontSize} * 0.12cqw)`,
                color: subtitleStyle.textColor,
                backgroundColor: `rgba(9, 13, 22, ${subtitleStyle.bgOpacity})`,
              }}
              className="max-w-[90%] rounded-md px-3 py-1.5 text-center font-semibold leading-snug shadow-lg backdrop-blur-[2px]"
            >
              {activeCharacter && subtitleStyle.showSpeakerLabel && (
                <span
                  className="mr-1.5 font-bold"
                  style={{ color: activeCharacter.colorHex }}
                >
                  [{activeCharacter.name}]
                </span>
              )}
              <span>
                {activeSegment?.translatedText || activeSegment?.dubbingText}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Transport & Audio Routing Controls */}
      <div className="border-t border-slate-800 bg-[#0D131F] px-5 py-3.5 space-y-3">
        {/* Scrubber with Dialogue Cue Ticks */}
        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause playback' : 'Play preview'}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer shrink-0"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" aria-hidden="true" />
            )}
          </button>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              aria-label="Timeline scrubber"
              min={0}
              max={Math.max(durationSec, 1)}
              step={0.1}
              value={Math.min(currentTimeSec, Math.max(durationSec, 1))}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          <div className="font-mono text-xs text-slate-300 shrink-0 tabular-nums">
            {formatSecondsToMmSs(currentTimeSec)} / {formatSecondsToMmSs(durationSec)}
          </div>
        </div>

        {/* Vocal Mute & AI Dubbing Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleMuteOriginal}
              aria-pressed={muteOriginal}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                muteOriginal
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                  : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600'
              }`}
            >
              {muteOriginal ? (
                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{muteOriginal ? 'Original Vocals Muted' : 'Mute Original Vocals'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleDubbing}
              aria-pressed={dubbingEnabled}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                dubbingEnabled
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                  : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600'
              }`}
            >
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{dubbingEnabled ? 'AI Dubbing Active' : 'Enable AI Dubbing'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="dub-engine-select" className="text-xs text-slate-400">
              Voice Engine:
            </label>
            <select
              id="dub-engine-select"
              value={dubEngine}
              onChange={(e) => onChangeDubEngine(e.target.value as DubAudioEngine)}
              className="rounded-lg border border-slate-700 bg-[#0B0F17] px-2.5 py-1 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="gemini_tts">Gemini Neural TTS</option>
              <option value="web_speech">Browser Web Speech</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}
