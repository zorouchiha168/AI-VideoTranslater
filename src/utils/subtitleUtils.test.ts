import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTimestampToSeconds,
  formatSecondsToSrt,
  formatSecondsToVtt,
  formatSecondsToMmSs,
  generateSrt,
  generateVtt,
  findActiveSegment,
  estimateSyllableFit,
  generateFullLocalizationReport,
} from './subtitleUtils';
import type { DialogueSegment, LocalizationResult } from '../types/localization';

const sampleSegments: DialogueSegment[] = [
  {
    id: 'seg-1',
    index: 1,
    startTimeSec: 0.5,
    endTimeSec: 4.2,
    startTimestamp: '00:00',
    endTimestamp: '00:04',
    speakerId: 'char-1',
    speakerName: 'Narrator',
    originalText: 'Before dawn broke over the river, the old lantern maker lit his final flame.',
    translatedText: 'មុនពេលថ្ងៃរះលើដងទន្លេ ជាងធ្វើគោមចំណាស់បានអុជភ្លើងចុងក្រោយរបស់គាត់។',
    dubbingText: 'មុនថ្ងៃរះលើទន្លេ ជាងធ្វើគោមចំណាស់បានអុជភ្លើងចុងក្រោយ។',
    emotion: 'Calm, reflective',
    lipSyncNotes: 'Measured narrator cadence',
  },
  {
    id: 'seg-2',
    index: 2,
    startTimeSec: 4.8,
    endTimeSec: 8.5,
    startTimestamp: '00:04',
    endTimestamp: '00:08',
    speakerId: 'char-2',
    speakerName: 'Sokha',
    originalText: 'Father, why are we keeping the workshop open tonight?',
    translatedText: 'ពុក ហេតុអ្វីបានជាយើងបើករោងជាងនៅយប់នេះ?',
    dubbingText: 'ពុក ហេតុអ្វីយើងបើករោងជាងយប់នេះ?',
    emotion: 'Curious, gentle',
    lipSyncNotes: 'Matches 3.7s breath window',
  },
];

test('parseTimestampToSeconds handles MM:SS, HH:MM:SS, and comma milliseconds', () => {
  assert.equal(parseTimestampToSeconds('01:30'), 90);
  assert.equal(parseTimestampToSeconds('00:04.500'), 4.5);
  assert.equal(parseTimestampToSeconds('01:02:03,250'), 3723.25);
});

test('formatSecondsToSrt and formatSecondsToVtt produce standard timecodes', () => {
  assert.equal(formatSecondsToSrt(4.5), '00:00:04,500');
  assert.equal(formatSecondsToVtt(4.5), '00:00:04.500');
  assert.equal(formatSecondsToMmSs(125.9), '02:05');
});

test('generateSrt formats valid numbered cues with Khmer Unicode', () => {
  const srt = generateSrt(sampleSegments, false);
  assert.match(srt, /^1\n00:00:00,500 --> 00:00:04,200\n/);
  assert.ok(srt.includes('មុនពេលថ្ងៃរះលើដងទន្លេ'));
  assert.ok(srt.includes('2\n00:00:04,800 --> 00:00:08,500\n'));
});

test('generateVtt starts with WEBVTT header and uses dot milliseconds', () => {
  const vtt = generateVtt(sampleSegments, true);
  assert.ok(vtt.startsWith('WEBVTT\n\n'));
  assert.ok(vtt.includes('00:00:00.500 --> 00:00:04.200'));
  assert.ok(vtt.includes('<v Sokha>'));
});

test('findActiveSegment matches timecode range accurately', () => {
  assert.equal(findActiveSegment(sampleSegments, 2.0)?.id, 'seg-1');
  assert.equal(findActiveSegment(sampleSegments, 4.5), null);
  assert.equal(findActiveSegment(sampleSegments, 6.1)?.speakerName, 'Sokha');
});

test('estimateSyllableFit computes ratio for Latin and Khmer text', () => {
  const fit = estimateSyllableFit(
    'Hello my friend how are you today',
    'សួស្តីមិត្តភក្តិ តើអ្នកសុខសប្បាយទេ?',
  );
  assert.ok(fit.originalUnits > 0);
  assert.ok(fit.targetUnits > 0);
  assert.ok(['ideal', 'compact', 'long'].includes(fit.status));
});

test('generateFullLocalizationReport outputs all 4 required sections', () => {
  const result: LocalizationResult = {
    projectTitle: 'Lantern Maker',
    detectedSourceLanguage: 'English',
    sourceLanguage: 'Auto-Detect',
    targetLanguage: 'Khmer',
    localizationOption: 'full_package',
    summary: 'Short story test',
    characters: [
      {
        id: 'char-1',
        name: 'Narrator',
        role: 'Storyteller',
        archetype: 'Narrator',
        toneDescription: 'Warm and measured',
        voiceName: 'Charon',
        pitch: 1.0,
        speed: 1.0,
        colorHex: '#F59E0B',
      },
    ],
    segments: sampleSegments,
  };
  const report = generateFullLocalizationReport(result);
  assert.ok(report.includes('1. LANGUAGE & CHARACTER CONFIGURATION:'));
  assert.ok(report.includes('2. ORIGINAL TRANSCRIPT WITH TIMESTAMPS:'));
  assert.ok(report.includes('3. AI CHARACTER DUBBING & LIP-SYNC SCRIPT (Khmer):'));
  assert.ok(report.includes('4. SUBTITLE FILE GENERATION (.SRT Format):'));
  assert.ok(report.includes('```srt'));
});
