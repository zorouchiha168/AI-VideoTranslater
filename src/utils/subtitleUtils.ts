import type { DialogueSegment, LocalizationResult } from '../types/localization';

/**
 * Parses MM:SS, MM:SS.mmm, HH:MM:SS, or HH:MM:SS,mmm into seconds.
 */
export function parseTimestampToSeconds(raw: string): number {
  const cleaned = raw.trim().replace(',', '.');
  const parts = cleaned.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) {
    return 0;
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] ?? 0;
}

/**
 * Formats seconds into standard SRT timestamp HH:MM:SS,mmm
 */
export function formatSecondsToSrt(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 1000);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(ms === 1000 ? 999 : ms).padStart(3, '0');
  return `${hh}:${mm}:${ss},${mmm}`;
}

/**
 * Formats seconds into WebVTT timestamp HH:MM:SS.mmm
 */
export function formatSecondsToVtt(totalSeconds: number): string {
  return formatSecondsToSrt(totalSeconds).replace(',', '.');
}

/**
 * Formats seconds into MM:SS for display and transcripts.
 */
export function formatSecondsToMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Generates a clean, valid .SRT subtitle string from dialogue segments.
 */
export function generateSrt(
  segments: DialogueSegment[],
  includeSpeaker = false,
): string {
  if (!segments.length) return '';

  return segments
    .map((seg, idx) => {
      const start = formatSecondsToSrt(seg.startTimeSec);
      const end = formatSecondsToSrt(Math.max(seg.endTimeSec, seg.startTimeSec + 0.5));
      const lineText = (seg.translatedText || seg.dubbingText || seg.originalText).trim();
      const body = includeSpeaker ? `[${seg.speakerName}] ${lineText}` : lineText;
      return `${idx + 1}\n${start} --> ${end}\n${body}`;
    })
    .join('\n\n');
}

/**
 * Generates a clean, valid WebVTT (.vtt) subtitle string from dialogue segments.
 */
export function generateVtt(
  segments: DialogueSegment[],
  includeSpeaker = false,
): string {
  if (!segments.length) return 'WEBVTT\n';

  const cues = segments
    .map((seg, idx) => {
      const start = formatSecondsToVtt(seg.startTimeSec);
      const end = formatSecondsToVtt(Math.max(seg.endTimeSec, seg.startTimeSec + 0.5));
      const lineText = (seg.translatedText || seg.dubbingText || seg.originalText).trim();
      const body = includeSpeaker ? `<v ${seg.speakerName}>${lineText}` : lineText;
      return `${idx + 1}\n${start} --> ${end}\n${body}`;
    })
    .join('\n\n');

  return `WEBVTT\n\n${cues}`;
}

/**
 * Finds the active dialogue segment at a given playback timestamp.
 */
export function findActiveSegment(
  segments: DialogueSegment[],
  currentTimeSec: number,
): DialogueSegment | null {
  for (const seg of segments) {
    if (currentTimeSec >= seg.startTimeSec && currentTimeSec <= seg.endTimeSec) {
      return seg;
    }
  }
  return null;
}

/**
 * Estimates lip-sync phrasing ratio between original dialogue and target dubbing text.
 * Handles both Latin word/syllable clusters and Southeast Asian / CJK character pacing.
 */
export function estimateSyllableFit(
  originalText: string,
  dubbingText: string,
): {
  originalUnits: number;
  targetUnits: number;
  ratio: number;
  status: 'ideal' | 'compact' | 'long';
} {
  const countUnits = (txt: string): number => {
    const trimmed = txt.trim();
    if (!trimmed) return 0;
    // Check if mostly non-Latin (Khmer, Thai, Chinese, Japanese, Korean)
    const nonAscii = (trimmed.match(/[^\x00-\x7F]/g) || []).length;
    if (nonAscii > trimmed.length * 0.35) {
      // Approximate spoken syllable weight for Khmer/CJK/Thai scripts
      return Math.max(1, Math.round(trimmed.replace(/\s+/g, '').length * 0.45));
    }
    const words = trimmed.split(/\s+/).filter(Boolean);
    let syllables = 0;
    for (const w of words) {
      const cleaned = w.toLowerCase().replace(/[^a-z]/g, '');
      if (!cleaned) continue;
      const groups = cleaned.match(/[aeiouy]+/g);
      syllables += Math.max(1, groups ? groups.length : 1);
    }
    return Math.max(1, syllables);
  };

  const originalUnits = countUnits(originalText);
  const targetUnits = countUnits(dubbingText);
  if (originalUnits === 0) {
    return { originalUnits: 0, targetUnits, ratio: 1, status: 'ideal' };
  }
  const ratio = Number((targetUnits / originalUnits).toFixed(2));
  if (ratio > 1.28) {
    return { originalUnits, targetUnits, ratio, status: 'long' };
  }
  if (ratio < 0.72) {
    return { originalUnits, targetUnits, ratio, status: 'compact' };
  }
  return { originalUnits, targetUnits, ratio, status: 'ideal' };
}

/**
 * Formats the complete 4-section Localization Package report matching the studio specification.
 */
export function generateFullLocalizationReport(result: LocalizationResult): string {
  const charLines = result.characters
    .map(
      (c) =>
        `- ${c.name} (${c.archetype}, ${c.toneDescription}) -> Voice: ${c.voiceName} | Pitch: ${c.pitch.toFixed(2)}x | Speed: ${c.speed.toFixed(2)}x`,
    )
    .join('\n');

  const transcriptLines = result.segments
    .map(
      (s) =>
        `[${s.startTimestamp} - ${s.endTimestamp}] ${s.speakerName}: "${s.originalText}"`,
    )
    .join('\n');

  const dubbingLines = result.segments
    .map(
      (s) =>
        `[${s.startTimestamp} - ${s.endTimestamp}] [${s.speakerName}] (${s.emotion}): "${s.dubbingText}"`,
    )
    .join('\n');

  const srtBlock = generateSrt(result.segments, false);

  return [
    `1. LANGUAGE & CHARACTER CONFIGURATION:`,
    `- Project: ${result.projectTitle}`,
    `- Source Language: ${result.detectedSourceLanguage || result.sourceLanguage}`,
    `- Target Language: ${result.targetLanguage}`,
    `- Character Voice Mapping:`,
    charLines,
    ``,
    `2. ORIGINAL TRANSCRIPT WITH TIMESTAMPS:`,
    transcriptLines,
    ``,
    `3. AI CHARACTER DUBBING & LIP-SYNC SCRIPT (${result.targetLanguage}):`,
    dubbingLines,
    ``,
    `4. SUBTITLE FILE GENERATION (.SRT Format):`,
    '```srt',
    srtBlock,
    '```',
  ].join('\n');
}
