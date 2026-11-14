import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(apiVersion: 'v1beta' | 'v1alpha' = 'v1beta') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured in the server environment. Please add it in Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion,
    httpOptions: {
      apiVersion,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 80 * 1024 * 1024, // 80 MB max media upload
  },
});

const LOCALIZATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    projectTitle: {
      type: Type.STRING,
      description: 'Short descriptive title for the video or story.',
    },
    detectedSourceLanguage: {
      type: Type.STRING,
      description: 'The detected or confirmed source language name.',
    },
    summary: {
      type: Type.STRING,
      description: '1-2 sentence summary of the story and emotional arc.',
    },
    characters: {
      type: Type.ARRAY,
      description: 'Distinct speakers/characters detected in the audio or script.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          archetype: {
            type: Type.STRING,
            description: 'One of: Male, Female, Child, Narrator',
          },
          toneDescription: { type: Type.STRING },
          recommendedVoiceName: {
            type: Type.STRING,
            description: 'One of: Fenrir, Puck, Kore, Zephyr, Charon',
          },
        },
        required: ['name', 'role', 'archetype', 'toneDescription', 'recommendedVoiceName'],
      },
    },
    segments: {
      type: Type.ARRAY,
      description: 'Chronological dialogue segments with timestamps and dubbing.',
      items: {
        type: Type.OBJECT,
        properties: {
          startTimeSec: { type: Type.NUMBER },
          endTimeSec: { type: Type.NUMBER },
          speakerName: { type: Type.STRING },
          originalText: { type: Type.STRING },
          translatedText: { type: Type.STRING },
          dubbingText: {
            type: Type.STRING,
            description:
              'Lip-sync optimized phrasing in the Target Language matching original duration and emotion.',
          },
          emotion: { type: Type.STRING },
          lipSyncNotes: { type: Type.STRING },
        },
        required: [
          'startTimeSec',
          'endTimeSec',
          'speakerName',
          'originalText',
          'translatedText',
          'dubbingText',
          'emotion',
          'lipSyncNotes',
        ],
      },
    },
  },
  required: ['projectTitle', 'detectedSourceLanguage', 'summary', 'characters', 'segments'],
};

const VOICE_COLORS = ['#F59E0B', '#38BDF8', '#34D399', '#A78BFA', '#FB7185', '#94A3B8'];

function formatMmSs(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function normalizeVoiceName(raw: string, archetype: string): 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' {
  const allowed = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] as const;
  const match = allowed.find((v) => v.toLowerCase() === (raw || '').trim().toLowerCase());
  if (match) return match;
  if (archetype === 'Female') return 'Kore';
  if (archetype === 'Narrator') return 'Charon';
  if (archetype === 'Child') return 'Puck';
  return 'Fenrir';
}

function normalizeArchetype(raw: string): 'Male' | 'Female' | 'Child' | 'Narrator' {
  const v = (raw || '').trim().toLowerCase();
  if (v.includes('female') || v.includes('woman') || v.includes('girl')) return 'Female';
  if (v.includes('child') || v.includes('kid') || v.includes('boy')) return 'Child';
  if (v.includes('narrator') || v.includes('story')) return 'Narrator';
  return 'Male';
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'ai-videotranslater' });
  });

  /**
   * POST /api/localize
   * Processes an uploaded video/audio file OR pasted script using Gemini (gemini-4-hydrogen)
   * and returns structured character voice mappings, timestamped transcripts, lip-sync dubbing, and SRT data.
   */
  app.post('/api/localize', upload.single('media'), async (req, res) => {
    let tempFilePath: string | null = null;
    let uploadedGeminiFileName: string | null = null;

    try {
      const ai = getGeminiClient();
      const sourceLanguage = String(req.body?.sourceLanguage || 'Auto-Detect');
      const targetLanguage = String(req.body?.targetLanguage || 'Khmer');
      const localizationOption = String(req.body?.localizationOption || 'full_package');
      const scriptText = String(req.body?.scriptText || '').trim();
      const mediaFile = req.file;

      if (!mediaFile && !scriptText) {
        res.status(400).json({
          error: 'Please upload a video/audio file or paste a story script to localize.',
        });
        return;
      }

      const systemInstruction = `You are an expert AI Video Localization, Dubbing, and Subtitle Engine.
Your mission is to transcribe/parse the provided video, audio, or script, detect every distinct speaker/character, translate accurately from ${sourceLanguage} into natural, culturally authentic ${targetLanguage}, and craft lip-sync-ready dubbing lines.

Rules:
1. If ${targetLanguage} is Khmer, produce natural spoken conversational Khmer (using authentic pronouns like ខ្ញុំ, អ្នក, ពុក, ម៉ែ, កូន, បង, អូន where contextually appropriate rather than stiff textbook translation), preserving emotional nuance.
2. Adjust syllable count and phrasing length in "dubbingText" so that when spoken aloud at natural pace, it fits within each segment's [startTimeSec, endTimeSec] duration.
3. For "characters", detect all speakers and assign each an archetype ("Male", "Female", "Child", or "Narrator") and one recommendedVoiceName from: Fenrir (Male deep), Puck (Male/Child energetic), Kore (Female warm), Zephyr (Female soft), Charon (Narrator).
4. Ensure every segment has valid, non-negative, monotonically ordered startTimeSec and endTimeSec (endTimeSec > startTimeSec). If only an untimestamped script is provided, assign realistic speaking durations (roughly 2.5 to 5.5 seconds per line based on length).
5. Requested mode is "${localizationOption}". Always return complete valid JSON matching the schema.`;

      const userPrompt = scriptText
        ? `Process and localize this story/script from ${sourceLanguage} into ${targetLanguage} (Mode: ${localizationOption}):\n\n${scriptText}`
        : `Transcribe all spoken dialogue with exact timestamps, identify all speakers/characters, translate into natural ${targetLanguage}, and generate lip-sync dubbing lines (Mode: ${localizationOption}).`;

      const parts: Array<Record<string, unknown>> = [];

      if (mediaFile) {
        const mimeType = mediaFile.mimetype || 'video/mp4';
        if (mediaFile.size <= 18 * 1024 * 1024) {
          parts.push({
            inlineData: {
              mimeType,
              data: mediaFile.buffer.toString('base64'),
            },
          });
        } else {
          // Use Gemini Files API for larger video/audio files
          const ext = path.extname(mediaFile.originalname) || '.mp4';
          tempFilePath = path.join(os.tmpdir(), `lingadub-${Date.now()}${ext}`);
          await fs.writeFile(tempFilePath, mediaFile.buffer);

          const uploaded = await ai.files.upload({
            file: tempFilePath,
            config: { mimeType },
          });
          uploadedGeminiFileName = uploaded.name || null;

          let fileState = uploaded.state;
          let activeFile = uploaded;
          let attempts = 0;
          while (fileState === 'PROCESSING' && attempts < 30) {
            await new Promise((r) => setTimeout(r, 2000));
            activeFile = await ai.files.get({ name: uploaded.name! });
            fileState = activeFile.state;
            attempts++;
          }
          if (fileState === 'FAILED') {
            throw new Error('Gemini media file processing failed. Try a smaller or standard MP4/WebM/MP3 clip.');
          }
          parts.push({
            fileData: {
              fileUri: activeFile.uri,
              mimeType: activeFile.mimeType || mimeType,
            },
          });
        }
      }

      parts.push({ text: userPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts: parts as never },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: LOCALIZATION_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawText = (response.text || '{}').trim();
      const parsed = JSON.parse(rawText) as {
        projectTitle?: string;
        detectedSourceLanguage?: string;
        summary?: string;
        characters?: Array<{
          name: string;
          role: string;
          archetype: string;
          toneDescription: string;
          recommendedVoiceName: string;
        }>;
        segments?: Array<{
          startTimeSec: number;
          endTimeSec: number;
          speakerName: string;
          originalText: string;
          translatedText: string;
          dubbingText: string;
          emotion: string;
          lipSyncNotes: string;
        }>;
      };

      const rawCharacters = Array.isArray(parsed.characters) ? parsed.characters : [];
      const characterMap = new Map<string, string>();

      const characters = rawCharacters.map((c, idx) => {
        const archetype = normalizeArchetype(c.archetype);
        const voiceName = normalizeVoiceName(c.recommendedVoiceName, archetype);
        const id = `char-${idx + 1}`;
        characterMap.set(c.name.trim().toLowerCase(), id);
        return {
          id,
          name: c.name || `Speaker ${idx + 1}`,
          role: c.role || archetype,
          archetype,
          toneDescription: c.toneDescription || 'Natural expressive delivery',
          voiceName,
          pitch: archetype === 'Child' ? 1.24 : archetype === 'Female' ? 1.06 : archetype === 'Male' ? 0.92 : 1.0,
          speed: 1.0,
          colorHex: VOICE_COLORS[idx % VOICE_COLORS.length],
        };
      });

      const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
      const segments = rawSegments.map((s, idx) => {
        const start = Math.max(0, Number(s.startTimeSec) || idx * 4);
        const end = Math.max(start + 0.8, Number(s.endTimeSec) || start + 3.5);
        const speakerName = (s.speakerName || 'Narrator').trim();
        let speakerId = characterMap.get(speakerName.toLowerCase());
        if (!speakerId) {
          speakerId = `char-${characters.length + 1}`;
          characterMap.set(speakerName.toLowerCase(), speakerId);
          characters.push({
            id: speakerId,
            name: speakerName,
            role: 'Speaker',
            archetype: 'Narrator',
            toneDescription: 'Clear storytelling voice',
            voiceName: 'Charon',
            pitch: 1.0,
            speed: 1.0,
            colorHex: VOICE_COLORS[characters.length % VOICE_COLORS.length],
          });
        }

        return {
          id: `seg-${idx + 1}`,
          index: idx + 1,
          startTimeSec: Number(start.toFixed(2)),
          endTimeSec: Number(end.toFixed(2)),
          startTimestamp: formatMmSs(start),
          endTimestamp: formatMmSs(end),
          speakerId,
          speakerName,
          originalText: s.originalText || '',
          translatedText: s.translatedText || s.dubbingText || '',
          dubbingText: s.dubbingText || s.translatedText || '',
          emotion: s.emotion || 'Neutral',
          lipSyncNotes: s.lipSyncNotes || 'Balanced phrasing',
        };
      });

      res.json({
        projectTitle: parsed.projectTitle || 'Localized Story',
        detectedSourceLanguage: parsed.detectedSourceLanguage || sourceLanguage,
        sourceLanguage,
        targetLanguage,
        localizationOption,
        summary: parsed.summary || '',
        characters,
        segments,
      });
    } catch (err) {
      console.error('Localization error:', err);
      const message = err instanceof Error ? err.message : 'Localization failed';
      res.status(500).json({ error: message });
    } finally {
      if (tempFilePath) {
        fs.unlink(tempFilePath).catch(() => {});
      }
      if (uploadedGeminiFileName) {
        try {
          const ai = getGeminiClient();
          await ai.files.delete({ name: uploadedGeminiFileName });
        } catch {
          // ignore cleanup failure
        }
      }
    }
  });

  /**
   * POST /api/tts
   * Synthesizes a character's dubbed dialogue line using gemini-3.8-flash-lite-tts
   * and returns base64 WAV audio.
   */
  app.post('/api/tts', async (req, res) => {
    try {
      const text = String(req.body?.text || '').trim();
      const voiceName = String(req.body?.voiceName || 'Kore');
      const style = String(req.body?.style || 'Expressive film dubbing actor');
      const targetLanguage = String(req.body?.targetLanguage || 'Khmer');

      if (!text) {
        res.status(400).json({ error: 'Text is required for speech synthesis.' });
        return;
      }

      const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
      const selectedVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';
      const styleInstruction = `${style}. Speak naturally in ${targetLanguage}.`;

      const callTts = async (
        version: 'v1beta' | 'v1alpha',
        includeSpeechMetadata: boolean,
      ) => {
        const client = getGeminiClient(version);
        const part = includeSpeechMetadata
          ? {
              text,
              speechMetadata: {
                style: styleInstruction,
              },
            }
          : {
              text: `[Style: ${styleInstruction}] ${text}`,
            };

        return client.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [part],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        });
      };

      let response;
      try {
        response = await callTts('v1beta', true);
      } catch (primaryErr) {
        const errMsg = primaryErr instanceof Error ? primaryErr.message : '';
        if (errMsg.includes('speechMetadata') || errMsg.includes('Unknown name')) {
          try {
            response = await callTts('v1alpha', true);
          } catch {
            response = await callTts('v1beta', false);
          }
        } else {
          throw primaryErr;
        }
      }

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({
          error: 'No audio stream returned from Gemini TTS model.',
        });
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        voiceName: selectedVoice,
      });
    } catch (err) {
      console.error('TTS error:', err);
      const message = err instanceof Error ? err.message : 'TTS generation failed';
      res.status(500).json({ error: message });
    }
  });

  // Vite middleware for dev, static dist for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AI VideoTranslater running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
