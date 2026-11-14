import type { LocalizationResult } from '../types/localization';

export const SAMPLE_STORY_SCRIPT = `[00:00 - 00:04] Narrator: Before dawn broke over the Mekong river, the old lantern maker lit his final silk flame.
[00:04 - 00:08] Sokha: Father, why are we keeping the workshop open so late tonight?
[00:08 - 00:13] Arun: Because someone traveling downriver still needs a light to guide them home, daughter.
[00:13 - 00:18] Little Dara: Look! Three golden lanterns are already floating past the wooden pier!`;

export const SAMPLE_LOCALIZATION_RESULT: LocalizationResult = {
  projectTitle: "The Lantern Maker's Promise",
  detectedSourceLanguage: 'English',
  sourceLanguage: 'Auto-Detect',
  targetLanguage: 'Khmer',
  localizationOption: 'full_package',
  summary:
    'An atmospheric 18-second riverfront drama scene featuring a storyteller, a daughter, her father, and a young child watching lanterns drift at dawn.',
  characters: [
    {
      id: 'char-narrator',
      name: 'Narrator',
      role: 'Documentary Storyteller',
      archetype: 'Narrator',
      toneDescription: 'Measured, warm, reflective cadence',
      voiceName: 'Charon',
      pitch: 0.95,
      speed: 0.98,
      colorHex: '#94A3B8',
    },
    {
      id: 'char-sokha',
      name: 'Sokha',
      role: 'Daughter',
      archetype: 'Female',
      toneDescription: 'Curious, gentle, inquisitive tone',
      voiceName: 'Kore',
      pitch: 1.08,
      speed: 1.0,
      colorHex: '#F59E0B',
    },
    {
      id: 'char-arun',
      name: 'Arun',
      role: 'Old Lantern Maker',
      archetype: 'Male',
      toneDescription: 'Deep, calm, reassuring baritone',
      voiceName: 'Fenrir',
      pitch: 0.88,
      speed: 0.95,
      colorHex: '#38BDF8',
    },
    {
      id: 'char-dara',
      name: 'Little Dara',
      role: 'Young Brother',
      archetype: 'Child',
      toneDescription: 'Bright, excited, energetic wonder',
      voiceName: 'Puck',
      pitch: 1.28,
      speed: 1.05,
      colorHex: '#34D399',
    },
  ],
  segments: [
    {
      id: 'seg-1',
      index: 1,
      startTimeSec: 0.2,
      endTimeSec: 4.1,
      startTimestamp: '00:00',
      endTimestamp: '00:04',
      speakerId: 'char-narrator',
      speakerName: 'Narrator',
      originalText:
        'Before dawn broke over the Mekong river, the old lantern maker lit his final silk flame.',
      translatedText:
        'មុនពេលថ្ងៃរះលើដងទន្លេមេគង្គ ជាងធ្វើគោមចំណាស់បានអុជភ្លើងគោមសូត្រចុងក្រោយរបស់គាត់។',
      dubbingText:
        'មុនថ្ងៃរះលើទន្លេមេគង្គ ជាងធ្វើគោមចំណាស់បានអុជភ្លើងគោមចុងក្រោយ។',
      emotion: 'Calm, reflective',
      lipSyncNotes: 'Condensed slightly to fit 3.9s calm narration window.',
    },
    {
      id: 'seg-2',
      index: 2,
      startTimeSec: 4.4,
      endTimeSec: 8.1,
      startTimestamp: '00:04',
      endTimestamp: '00:08',
      speakerId: 'char-sokha',
      speakerName: 'Sokha',
      originalText: 'Father, why are we keeping the workshop open so late tonight?',
      translatedText: 'ពុក ហេតុអ្វីបានជាយើងបើករោងជាងដល់យប់ជ្រៅម្ល៉េះនៅយប់នេះ?',
      dubbingText: 'ពុក ហេតុអ្វីយើងបើករោងជាងដល់យប់ជ្រៅម្ល៉េះយប់នេះ?',
      emotion: 'Curious, gentle',
      lipSyncNotes: 'Natural spoken Khmer phrasing ("ពុក") matching 3.7s breath.',
    },
    {
      id: 'seg-3',
      index: 3,
      startTimeSec: 8.5,
      endTimeSec: 13.0,
      startTimestamp: '00:08',
      endTimestamp: '00:13',
      speakerId: 'char-arun',
      speakerName: 'Arun',
      originalText:
        'Because someone traveling downriver still needs a light to guide them home, daughter.',
      translatedText:
        'ព្រោះអ្នកធ្វើដំណើរតាមទន្លេនៅត្រូវការពន្លឺនាំផ្លូវត្រឡប់មកផ្ទះវិញ កូនស្រី។',
      dubbingText:
        'ព្រោះអ្នកដំណើរតាមទន្លេ នៅត្រូវការពន្លឺនាំផ្លូវមកផ្ទះវិញ កូន។',
      emotion: 'Warm, reassuring',
      lipSyncNotes: 'Paused softly before "កូន" to match head nod cadence.',
    },
    {
      id: 'seg-4',
      index: 4,
      startTimeSec: 13.4,
      endTimeSec: 17.8,
      startTimestamp: '00:13',
      endTimestamp: '00:18',
      speakerId: 'char-dara',
      speakerName: 'Little Dara',
      originalText:
        'Look! Three golden lanterns are already floating past the wooden pier!',
      translatedText:
        'មើលហ្ន៎! គោមពណ៌មាសបីកំពុងអណ្តែតកាត់ផែឈើហើយ!',
      dubbingText:
        'មើលហ្ន៎! គោមមាសបីកំពុងអណ្តែតកាត់ផែឈើហើយ!',
      emotion: 'Excited, joyful',
      lipSyncNotes: 'Crisp opening exclamation aligned with pointing gesture.',
    },
  ],
};

/**
 * Generates an 18-second animated cinematic canvas preview frame renderer.
 * Used both as a real-time interactive stage fallback and to encode a real .webm sample video.
 */
export function drawSampleStoryFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
) {
  // Deep dawn-over-river gradient sky
  const dawnProgress = Math.min(1, timeSec / 18);
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.68);
  skyGrad.addColorStop(0, '#070B14');
  skyGrad.addColorStop(0.55, `rgb(${15 + Math.round(dawnProgress * 22)}, ${24 + Math.round(dawnProgress * 18)}, ${44 + Math.round(dawnProgress * 20)})`);
  skyGrad.addColorStop(1, `rgb(${40 + Math.round(dawnProgress * 55)}, ${28 + Math.round(dawnProgress * 30)}, ${34 + Math.round(dawnProgress * 12)})`);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle crescent moon & stars
  ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
  const stars = [
    [0.12, 0.14],
    [0.27, 0.09],
    [0.48, 0.18],
    [0.64, 0.11],
    [0.82, 0.16],
    [0.91, 0.24],
  ];
  for (const [sx, sy] of stars) {
    ctx.beginPath();
    ctx.arc(width * sx, height * sy, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant silhouettes / mountains
  ctx.fillStyle = '#0D1320';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.64);
  ctx.lineTo(width * 0.18, height * 0.56);
  ctx.lineTo(width * 0.42, height * 0.61);
  ctx.lineTo(width * 0.68, height * 0.53);
  ctx.lineTo(width * 0.88, height * 0.59);
  ctx.lineTo(width, height * 0.57);
  ctx.lineTo(width, height * 0.68);
  ctx.lineTo(0, height * 0.68);
  ctx.closePath();
  ctx.fill();

  // River water plane
  const riverGrad = ctx.createLinearGradient(0, height * 0.65, 0, height);
  riverGrad.addColorStop(0, '#0E1726');
  riverGrad.addColorStop(1, '#060911');
  ctx.fillStyle = riverGrad;
  ctx.fillRect(0, height * 0.65, width, height * 0.35);

  // Animated floating golden lanterns
  const lanterns = [
    { baseX: 0.22, speed: 0.018, yRatio: 0.46, scale: 1.0, phase: 0 },
    { baseX: 0.52, speed: 0.014, yRatio: 0.41, scale: 0.82, phase: 1.7 },
    { baseX: 0.76, speed: 0.02, yRatio: 0.49, scale: 1.15, phase: 3.1 },
  ];

  for (const l of lanterns) {
    const lx = ((l.baseX + timeSec * l.speed) % 1.15 - 0.07) * width;
    const ly = l.yRatio * height + Math.sin(timeSec * 1.4 + l.phase) * 9;
    const r = 20 * l.scale;

    // Soft ambient glow
    const glow = ctx.createRadialGradient(lx, ly, r * 0.2, lx, ly, r * 3.4);
    glow.addColorStop(0, 'rgba(245, 158, 11, 0.55)');
    glow.addColorStop(0.5, 'rgba(245, 158, 11, 0.14)');
    glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, ly, r * 3.4, 0, Math.PI * 2);
    ctx.fill();

    // Lantern silk body
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.ellipse(lx, ly, r * 0.68, r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.ellipse(lx, ly + r * 0.15, r * 0.3, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Reflection on water
    const refY = height * 0.74 + (0.5 - l.yRatio) * 60;
    const refGrad = ctx.createRadialGradient(lx, refY, 2, lx, refY, r * 2.2);
    refGrad.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
    refGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = refGrad;
    ctx.beginPath();
    ctx.ellipse(lx, refY, r * 1.9, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wooden pier foreground silhouette
  ctx.fillStyle = '#070A10';
  ctx.fillRect(0, height * 0.8, width * 0.34, height * 0.04);
  ctx.fillRect(width * 0.08, height * 0.8, 10, height * 0.2);
  ctx.fillRect(width * 0.26, height * 0.8, 10, height * 0.2);

  // Subtle scene cue label in corner
  ctx.fillStyle = 'rgba(248, 250, 252, 0.55)';
  ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillText(`SAMPLE REEL · ${timeSec.toFixed(1)}s / 18.0s`, 20, 28);
}
