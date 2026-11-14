export type LocalizationOption =
  | 'translate_only'
  | 'dubbing_script'
  | 'subtitles_only'
  | 'full_package';

export type VoiceArchetype = 'Male' | 'Female' | 'Child' | 'Narrator';

export type GeminiVoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export type DubAudioEngine = 'gemini_tts' | 'web_speech';

export interface CharacterVoiceProfile {
  id: string;
  name: string;
  role: string;
  archetype: VoiceArchetype;
  toneDescription: string;
  voiceName: GeminiVoiceName;
  pitch: number; // 0.6 to 1.6 (Web Speech & AudioContext playback rate/detune)
  speed: number; // 0.7 to 1.5
  colorHex: string;
}

export interface DialogueSegment {
  id: string;
  index: number;
  startTimeSec: number;
  endTimeSec: number;
  startTimestamp: string;
  endTimestamp: string;
  speakerId: string;
  speakerName: string;
  originalText: string;
  translatedText: string;
  dubbingText: string;
  emotion: string;
  lipSyncNotes: string;
  audioBase64?: string;
}

export interface LocalizationResult {
  projectTitle: string;
  detectedSourceLanguage: string;
  sourceLanguage: string;
  targetLanguage: string;
  localizationOption: LocalizationOption;
  summary: string;
  characters: CharacterVoiceProfile[];
  segments: DialogueSegment[];
}

export type SubtitleFontFamily =
  | 'Kantumruy Pro'
  | 'Battambang'
  | 'Noto Sans Khmer'
  | 'Plus Jakarta Sans'
  | 'JetBrains Mono';

export type SubtitlePosition = 'bottom' | 'middle' | 'top';

export interface SubtitleStyle {
  fontFamily: SubtitleFontFamily;
  fontSize: number; // px relative to 1080p or scaled preview (16-40)
  textColor: string;
  bgOpacity: number; // 0 to 1
  position: SubtitlePosition;
  showSpeakerLabel: boolean;
}

export interface LanguageOption {
  value: string;
  label: string;
  nativeLabel: string;
  bcp47: string;
}

export const SOURCE_LANGUAGES: LanguageOption[] = [
  { value: 'Auto-Detect', label: 'Auto-Detect', nativeLabel: 'Automatic', bcp47: 'en-US' },
  { value: 'English', label: 'English', nativeLabel: 'English', bcp47: 'en-US' },
  { value: 'Khmer', label: 'Khmer', nativeLabel: 'ភាសាខ្មែរ', bcp47: 'km-KH' },
  { value: 'Chinese', label: 'Chinese (Mandarin)', nativeLabel: '中文', bcp47: 'zh-CN' },
  { value: 'Thai', label: 'Thai', nativeLabel: 'ภาษาไทย', bcp47: 'th-TH' },
  { value: 'Vietnamese', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', bcp47: 'vi-VN' },
  { value: 'French', label: 'French', nativeLabel: 'Français', bcp47: 'fr-FR' },
  { value: 'Japanese', label: 'Japanese', nativeLabel: '日本語', bcp47: 'ja-JP' },
  { value: 'Korean', label: 'Korean', nativeLabel: '한국어', bcp47: 'ko-KR' },
  { value: 'Spanish', label: 'Spanish', nativeLabel: 'Español', bcp47: 'es-ES' },
];

export const TARGET_LANGUAGES: LanguageOption[] = [
  { value: 'Khmer', label: 'Khmer', nativeLabel: 'ភាសាខ្មែរ', bcp47: 'km-KH' },
  { value: 'English', label: 'English', nativeLabel: 'English', bcp47: 'en-US' },
  { value: 'Chinese', label: 'Chinese (Mandarin)', nativeLabel: '中文', bcp47: 'zh-CN' },
  { value: 'Thai', label: 'Thai', nativeLabel: 'ภาษาไทย', bcp47: 'th-TH' },
  { value: 'Vietnamese', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', bcp47: 'vi-VN' },
  { value: 'French', label: 'French', nativeLabel: 'Français', bcp47: 'fr-FR' },
  { value: 'Japanese', label: 'Japanese', nativeLabel: '日本語', bcp47: 'ja-JP' },
  { value: 'Korean', label: 'Korean', nativeLabel: '한국어', bcp47: 'ko-KR' },
];

export const LOCALIZATION_MODES: {
  id: LocalizationOption;
  shortTitle: string;
  label: string;
  description: string;
}[] = [
  {
    id: 'translate_only',
    shortTitle: 'Option 1',
    label: 'Translate Script Only',
    description: 'Contextual translation with speaker alignment.',
  },
  {
    id: 'dubbing_script',
    shortTitle: 'Option 2',
    label: 'Dubbing Script + Voices',
    description: 'Lip-sync pacing, emotions, and character voice map.',
  },
  {
    id: 'subtitles_only',
    shortTitle: 'Option 3',
    label: 'Hard/Soft Subtitles',
    description: 'Timestamped .SRT and .VTT subtitle generation.',
  },
  {
    id: 'full_package',
    shortTitle: 'Option 4',
    label: 'Full Localization Package',
    description: 'All 4 sections: Config, Transcript, Dubbing, and .SRT.',
  },
];

export const GEMINI_VOICE_CATALOG: {
  name: GeminiVoiceName;
  archetype: VoiceArchetype;
  description: string;
}[] = [
  { name: 'Fenrir', archetype: 'Male', description: 'Deep, grounded resonant baritone' },
  { name: 'Puck', archetype: 'Male', description: 'Agile, expressive youthful tenor' },
  { name: 'Kore', archetype: 'Female', description: 'Clear, warm energetic lead' },
  { name: 'Zephyr', archetype: 'Female', description: 'Soft, lyrical expressive tone' },
  { name: 'Charon', archetype: 'Narrator', description: 'Measured, documentary storyteller' },
];
