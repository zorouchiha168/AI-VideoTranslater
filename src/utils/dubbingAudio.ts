import type {
  CharacterVoiceProfile,
  DialogueSegment,
  DubAudioEngine,
  SubtitleStyle,
} from '../types/localization';
import { TARGET_LANGUAGES } from '../types/localization';
import { findActiveSegment } from './subtitleUtils';
import { drawSampleStoryFrame } from '../data/sampleStories';

let activeAudioElement: HTMLAudioElement | null = null;

export function stopAllDubbingPlayback(): void {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function getBcp47ForLanguage(lang: string): string {
  const found = TARGET_LANGUAGES.find(
    (l) => l.value.toLowerCase() === lang.toLowerCase() || l.label.toLowerCase() === lang.toLowerCase(),
  );
  return found?.bcp47 ?? 'en-US';
}

/**
 * Plays a single dubbed dialogue segment using either pre-synthesized Gemini TTS WAV audio
 * or the browser Web Speech API with the character's configured pitch and speed.
 */
export async function playSegmentDubbing(params: {
  segment: DialogueSegment;
  character: CharacterVoiceProfile | undefined;
  targetLanguage: string;
  engine: DubAudioEngine;
  onAudioCached?: (segmentId: string, audioBase64: string) => void;
  onError?: (msg: string) => void;
}): Promise<void> {
  const { segment, character, targetLanguage, engine, onAudioCached, onError } = params;
  const text = (segment.dubbingText || segment.translatedText || segment.originalText).trim();
  if (!text) return;

  stopAllDubbingPlayback();

  const speed = character?.speed ?? 1.0;
  const pitch = character?.pitch ?? 1.0;
  const voiceName = character?.voiceName ?? 'Kore';

  if (engine === 'gemini_tts') {
    try {
      let base64 = segment.audioBase64;
      if (!base64) {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceName,
            style: `${character?.archetype ?? 'Actor'} voice, ${character?.toneDescription ?? ''}, emotion: ${segment.emotion}`,
            targetLanguage,
          }),
        });
        const data = (await res.json()) as { audioBase64?: string; error?: string };
        if (!res.ok || !data.audioBase64) {
          throw new Error(data.error || 'Gemini TTS failed');
        }
        base64 = data.audioBase64;
        onAudioCached?.(segment.id, base64);
      }

      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      audio.playbackRate = Math.min(2, Math.max(0.5, speed));
      activeAudioElement = audio;
      await audio.play();
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'TTS playback failed';
      onError?.(msg);
      // Graceful fallback to Web Speech API if Gemini TTS fails
    }
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getBcp47ForLanguage(targetLanguage);
    utterance.pitch = Math.min(2, Math.max(0.5, pitch));
    utterance.rate = Math.min(2, Math.max(0.5, speed));

    const voices = window.speechSynthesis.getVoices();
    const langPrefix = utterance.lang.split('-')[0].toLowerCase();
    const matchedVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) || voices[0];
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
    window.speechSynthesis.speak(utterance);
  }
}

/**
 * Draws wrapped subtitle text on an HTML5 Canvas with custom styling.
 */
export function drawSubtitleOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  segment: DialogueSegment | null,
  style: SubtitleStyle,
): void {
  if (!segment) return;
  const rawText = (segment.translatedText || segment.dubbingText || segment.originalText).trim();
  if (!rawText) return;

  const displayLine = style.showSpeakerLabel
    ? `${segment.speakerName}: ${rawText}`
    : rawText;

  const scaleFactor = width / 960;
  const fontSizePx = Math.round(style.fontSize * scaleFactor);
  ctx.font = `600 ${fontSizePx}px "${style.fontFamily}", "Noto Sans Khmer", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxLineWidth = width * 0.84;
  const words = displayLine.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxLineWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSizePx * 1.42;
  const padX = Math.round(18 * scaleFactor);
  const padY = Math.round(10 * scaleFactor);
  const blockHeight = lines.length * lineHeight + padY * 2;
  const widestLine = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const blockWidth = Math.min(width * 0.92, widestLine + padX * 2);

  let centerY = height - blockHeight / 2 - Math.round(32 * scaleFactor);
  if (style.position === 'top') {
    centerY = blockHeight / 2 + Math.round(32 * scaleFactor);
  } else if (style.position === 'middle') {
    centerY = height / 2;
  }

  const boxX = width / 2 - blockWidth / 2;
  const boxY = centerY - blockHeight / 2;

  if (style.bgOpacity > 0) {
    ctx.fillStyle = `rgba(9, 13, 22, ${style.bgOpacity})`;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, blockWidth, blockHeight, Math.round(8 * scaleFactor));
    ctx.fill();
  }

  ctx.fillStyle = style.textColor;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 4;
  lines.forEach((line, idx) => {
    const lineY = boxY + padY + lineHeight * (idx + 0.5);
    ctx.fillText(line, width / 2, lineY);
  });
  ctx.shadowBlur = 0;
}

/**
 * Exports a subtitled .webm video using HTML5 Canvas + MediaRecorder.
 * Works with both uploaded <video> elements and the built-in sample story reel.
 */
export async function exportSubtitledWebmVideo(params: {
  videoElement: HTMLVideoElement | null;
  hasUploadedVideo: boolean;
  durationSec: number;
  segments: DialogueSegment[];
  subtitleStyle: SubtitleStyle;
  projectTitle: string;
  onProgress?: (pct: number) => void;
}): Promise<Blob> {
  const {
    videoElement,
    hasUploadedVideo,
    durationSec,
    segments,
    subtitleStyle,
    onProgress,
  } = params;

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not supported in this browser.');
  }

  const width = 960;
  const height = 540;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize Canvas 2D context for video export.');
  }

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data.size > 0) chunks.push(ev.data);
  };

  const totalDur = Math.min(Math.max(durationSec, 4), 25);

  return new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Video recording failed during export.'));
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };

    recorder.start(100);

    if (hasUploadedVideo && videoElement) {
      const prevTime = videoElement.currentTime;
      const prevMuted = videoElement.muted;
      videoElement.muted = true;
      videoElement.currentTime = 0;
      videoElement.play().catch(() => {});

      const startPerf = performance.now();
      const renderTick = () => {
        const elapsed = (performance.now() - startPerf) / 1000;
        const currentT = videoElement.currentTime || elapsed;
        ctx.drawImage(videoElement, 0, 0, width, height);
        const activeSeg = findActiveSegment(segments, currentT);
        drawSubtitleOnCanvas(ctx, width, height, activeSeg, subtitleStyle);

        const pct = Math.min(99, Math.round((currentT / totalDur) * 100));
        onProgress?.(pct);

        if (videoElement.ended || currentT >= totalDur) {
          videoElement.pause();
          videoElement.currentTime = prevTime;
          videoElement.muted = prevMuted;
          onProgress?.(100);
          recorder.stop();
          return;
        }
        requestAnimationFrame(renderTick);
      };
      requestAnimationFrame(renderTick);
    } else {
      // Sample story reel deterministic real-time export (capped cleanly for quick UX)
      const exportDuration = Math.min(totalDur, 18);
      const startPerf = performance.now();
      const renderTick = () => {
        const elapsed = (performance.now() - startPerf) / 1000;
        drawSampleStoryFrame(ctx, width, height, elapsed);
        const activeSeg = findActiveSegment(segments, elapsed);
        drawSubtitleOnCanvas(ctx, width, height, activeSeg, subtitleStyle);

        const pct = Math.min(99, Math.round((elapsed / exportDuration) * 100));
        onProgress?.(pct);

        if (elapsed >= exportDuration) {
          onProgress?.(100);
          recorder.stop();
          return;
        }
        requestAnimationFrame(renderTick);
      };
      requestAnimationFrame(renderTick);
    }
  });
}
