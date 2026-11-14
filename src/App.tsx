import { useCallback, useEffect, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { VideoPlayerStage } from './components/VideoPlayerStage';
import { InputConfigPanel } from './components/InputConfigPanel';
import {
  LocalizationWorkbench,
  type WorkbenchTab,
} from './components/LocalizationWorkbench';
import {
  SAMPLE_LOCALIZATION_RESULT,
  SAMPLE_STORY_SCRIPT,
} from './data/sampleStories';
import type {
  CharacterVoiceProfile,
  DialogueSegment,
  DubAudioEngine,
  LocalizationOption,
  LocalizationResult,
  SubtitleStyle,
} from './types/localization';
import {
  findActiveSegment,
  generateFullLocalizationReport,
} from './utils/subtitleUtils';
import {
  exportSubtitledWebmVideo,
  playSegmentDubbing,
  stopAllDubbingPlayback,
} from './utils/dubbingAudio';

export default function App() {
  const [sourceLanguage, setSourceLanguage] = useState<string>('Auto-Detect');
  const [targetLanguage, setTargetLanguage] = useState<string>('Khmer');
  const [localizationOption, setLocalizationOption] =
    useState<LocalizationOption>('full_package');
  const [scriptText, setScriptText] = useState<string>(SAMPLE_STORY_SCRIPT);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'sample' | 'video' | 'audio'>('sample');

  const [result, setResult] = useState<LocalizationResult>(SAMPLE_LOCALIZATION_RESULT);
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('characters');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Player & Dubbing state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0.5);
  const [durationSec, setDurationSec] = useState(18);
  const [muteOriginal, setMuteOriginal] = useState(true);
  const [dubbingEnabled, setDubbingEnabled] = useState(true);
  const [dubEngine, setDubEngine] = useState<DubAudioEngine>('gemini_tts');
  const [synthesizingSegmentId, setSynthesizingSegmentId] = useState<string | null>(null);
  const [isBatchSynthesizing, setIsBatchSynthesizing] = useState(false);
  const lastSpokenSegmentIdRef = useRef<string | null>(null);

  // Subtitle styling state
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({
    fontFamily: 'Kantumruy Pro',
    fontSize: 20,
    textColor: '#FFFFFF',
    bgOpacity: 0.78,
    position: 'bottom',
    showSpeakerLabel: true,
  });

  // Video export state
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Clean up object URLs on unmount or change
  useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [mediaUrl]);

  // Sample canvas timeline loop when playing the built-in sample reel
  useEffect(() => {
    if (!isPlaying || mediaType !== 'sample') return;
    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      setCurrentTimeSec((prev) => {
        const next = prev + dt;
        if (next >= durationSec) {
          setIsPlaying(false);
          lastSpokenSegmentIdRef.current = null;
          return 0;
        }
        return next;
      });
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, mediaType, durationSec]);

  // Trigger synchronized AI dubbing when playhead enters a new dialogue segment
  useEffect(() => {
    if (!isPlaying || !dubbingEnabled) return;
    const activeSeg = findActiveSegment(result.segments, currentTimeSec);
    if (!activeSeg) {
      lastSpokenSegmentIdRef.current = null;
      return;
    }
    if (lastSpokenSegmentIdRef.current === activeSeg.id) return;
    lastSpokenSegmentIdRef.current = activeSeg.id;

    const char = result.characters.find((c) => c.id === activeSeg.speakerId);
    void playSegmentDubbing({
      segment: activeSeg,
      character: char,
      targetLanguage: result.targetLanguage,
      engine: dubEngine,
      onAudioCached: (segId, base64) => {
        setResult((prev) => ({
          ...prev,
          segments: prev.segments.map((s) =>
            s.id === segId ? { ...s, audioBase64: base64 } : s,
          ),
        }));
      },
    });
  }, [isPlaying, dubbingEnabled, currentTimeSec, result.segments, result.characters, result.targetLanguage, dubEngine]);

  const handleFileSelected = useCallback(
    (file: File | null) => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
      setIsPlaying(false);
      stopAllDubbingPlayback();
      lastSpokenSegmentIdRef.current = null;
      setCurrentTimeSec(0);

      if (!file) {
        setUploadedFile(null);
        setMediaUrl(null);
        setMediaType('sample');
        setDurationSec(18);
        return;
      }

      const url = URL.createObjectURL(file);
      setUploadedFile(file);
      setMediaUrl(url);
      setMediaType(file.type.startsWith('audio/') ? 'audio' : 'video');
      setErrorMsg(null);
    },
    [mediaUrl],
  );

  const handleLoadSampleStory = useCallback(() => {
    handleFileSelected(null);
    setScriptText(SAMPLE_STORY_SCRIPT);
    setSourceLanguage('Auto-Detect');
    setTargetLanguage('Khmer');
    setLocalizationOption('full_package');
    setResult(SAMPLE_LOCALIZATION_RESULT);
    setCurrentTimeSec(0.5);
    setDurationSec(18);
    setErrorMsg(null);
  }, [handleFileSelected]);

  const handleRunLocalization = async () => {
    if (!uploadedFile && !scriptText.trim()) {
      setErrorMsg('Please upload a video/audio file or paste a story script first.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    stopAllDubbingPlayback();
    setIsPlaying(false);

    try {
      let response: Response;
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('media', uploadedFile);
        formData.append('sourceLanguage', sourceLanguage);
        formData.append('targetLanguage', targetLanguage);
        formData.append('localizationOption', localizationOption);
        if (scriptText.trim() && scriptText.trim() !== SAMPLE_STORY_SCRIPT.trim()) {
          formData.append('scriptText', scriptText.trim());
        }
        response = await fetch('/api/localize', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/localize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scriptText: scriptText.trim(),
            sourceLanguage,
            targetLanguage,
            localizationOption,
          }),
        });
      }

      const data = (await response.json()) as LocalizationResult & { error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Localization request failed.');
      }

      setResult(data);
      if (data.segments.length > 0 && mediaType === 'sample') {
        const lastEnd = Math.max(...data.segments.map((s) => s.endTimeSec));
        setDurationSec(Math.max(12, Math.ceil(lastEnd + 1)));
      }
      setCurrentTimeSec(data.segments[0]?.startTimeSec ?? 0);
      setActiveTab('characters');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to complete AI localization.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopAllDubbingPlayback();
      if (videoRef.current) videoRef.current.pause();
    } else {
      lastSpokenSegmentIdRef.current = null;
      setIsPlaying(true);
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleSeek = (sec: number) => {
    lastSpokenSegmentIdRef.current = null;
    stopAllDubbingPlayback();
    setCurrentTimeSec(sec);
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
    }
  };

  const handleUpdateCharacter = (
    charId: string,
    patch: Partial<CharacterVoiceProfile>,
  ) => {
    setResult((prev) => ({
      ...prev,
      characters: prev.characters.map((c) =>
        c.id === charId ? { ...c, ...patch } : c,
      ),
      // Invalidate cached audio for that character if voiceName changed
      segments: patch.voiceName
        ? prev.segments.map((s) =>
            s.speakerId === charId ? { ...s, audioBase64: undefined } : s,
          )
        : prev.segments,
    }));
  };

  const handleUpdateSegmentText = (
    segmentId: string,
    field: 'translatedText' | 'dubbingText',
    value: string,
  ) => {
    setResult((prev) => ({
      ...prev,
      segments: prev.segments.map((s) =>
        s.id === segmentId
          ? {
              ...s,
              [field]: value,
              translatedText: field === 'dubbingText' ? value : s.translatedText,
              audioBase64: undefined,
            }
          : s,
      ),
    }));
  };

  const handlePlayDubLine = async (segment: DialogueSegment) => {
    const char = result.characters.find((c) => c.id === segment.speakerId);
    setSynthesizingSegmentId(segment.id);
    setErrorMsg(null);
    try {
      await playSegmentDubbing({
        segment,
        character: char,
        targetLanguage: result.targetLanguage,
        engine: dubEngine,
        onAudioCached: (segId, base64) => {
          setResult((prev) => ({
            ...prev,
            segments: prev.segments.map((s) =>
              s.id === segId ? { ...s, audioBase64: base64 } : s,
            ),
          }));
        },
        onError: (msg) => setErrorMsg(`Voice synthesis notice: ${msg} (played fallback speech)`),
      });
    } finally {
      setSynthesizingSegmentId(null);
    }
  };

  const handlePreviewCharacterVoice = async (character: CharacterVoiceProfile) => {
    const sampleSeg =
      result.segments.find((s) => s.speakerId === character.id) ||
      result.segments[0];
    if (!sampleSeg) return;
    await handlePlayDubLine(sampleSeg);
  };

  const handleBatchSynthesizeAll = async () => {
    if (result.segments.length === 0) return;
    setIsBatchSynthesizing(true);
    setErrorMsg(null);
    try {
      for (const seg of result.segments) {
        if (seg.audioBase64) continue;
        const char = result.characters.find((c) => c.id === seg.speakerId);
        const text = (seg.dubbingText || seg.translatedText).trim();
        if (!text) continue;
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceName: char?.voiceName ?? 'Kore',
            style: `${char?.archetype ?? 'Actor'}, ${char?.toneDescription ?? ''}, ${seg.emotion}`,
            targetLanguage: result.targetLanguage,
          }),
        });
        const data = (await res.json()) as { audioBase64?: string; error?: string };
        if (!res.ok || !data.audioBase64) {
          throw new Error(data.error || 'Gemini TTS synthesis failed.');
        }
        setResult((prev) => ({
          ...prev,
          segments: prev.segments.map((s) =>
            s.id === seg.id ? { ...s, audioBase64: data.audioBase64 } : s,
          ),
        }));
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Batch TTS synthesis encountered an error.',
      );
    } finally {
      setIsBatchSynthesizing(false);
    }
  };

  const handleDownloadTextFile = (
    filename: string,
    content: string,
    mimeType = 'text/plain;charset=utf-8',
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPackage = () => {
    const report = generateFullLocalizationReport(result);
    const slug = result.projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    handleDownloadTextFile(`${slug || 'localization'}-package.md`, report, 'text/markdown;charset=utf-8');
  };

  const handleExportVideo = async () => {
    setIsExportingVideo(true);
    setExportProgress(0);
    setErrorMsg(null);
    stopAllDubbingPlayback();
    setIsPlaying(false);

    try {
      const blob = await exportSubtitledWebmVideo({
        videoElement: videoRef.current,
        hasUploadedVideo: mediaType === 'video' && Boolean(mediaUrl),
        durationSec,
        segments: result.segments,
        subtitleStyle,
        projectTitle: result.projectTitle,
        onProgress: (pct) => setExportProgress(pct),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const slug = result.projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.download = `${slug || 'subtitled'}-${result.targetLanguage.toLowerCase()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Video export failed.');
    } finally {
      setIsExportingVideo(false);
      setExportProgress(0);
    }
  };

  const handleTopBarNavigate = (
    section: 'source' | 'characters' | 'dubbing' | 'subtitles',
  ) => {
    if (section === 'source') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setActiveTab(section);
  };

  const activeNavSection =
    activeTab === 'characters' || activeTab === 'dubbing' || activeTab === 'subtitles'
      ? activeTab
      : 'source';

  return (
    <div id="top" className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      <TopBar
        activeSection={activeNavSection}
        onNavigateSection={handleTopBarNavigate}
        onExportPackage={handleExportPackage}
        hasResult={result.segments.length > 0}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5/12): Video Preview Stage + Input Pipeline Config */}
          <div className="lg:col-span-5 space-y-6">
            <VideoPlayerStage
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              projectTitle={result.projectTitle}
              segments={result.segments}
              characters={result.characters}
              subtitleStyle={subtitleStyle}
              currentTimeSec={currentTimeSec}
              durationSec={durationSec}
              isPlaying={isPlaying}
              muteOriginal={muteOriginal}
              dubbingEnabled={dubbingEnabled}
              dubEngine={dubEngine}
              isExportingVideo={isExportingVideo}
              exportProgress={exportProgress}
              videoRef={videoRef}
              onTimeUpdate={setCurrentTimeSec}
              onDurationChange={setDurationSec}
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
              onToggleMuteOriginal={() => setMuteOriginal((m) => !m)}
              onToggleDubbing={() => {
                setDubbingEnabled((d) => {
                  if (d) stopAllDubbingPlayback();
                  return !d;
                });
              }}
              onChangeDubEngine={setDubEngine}
              onExportVideo={handleExportVideo}
            />

            <InputConfigPanel
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              localizationOption={localizationOption}
              scriptText={scriptText}
              uploadedFile={uploadedFile}
              isProcessing={isProcessing}
              errorMsg={errorMsg}
              onSourceLanguageChange={setSourceLanguage}
              onTargetLanguageChange={setTargetLanguage}
              onLocalizationOptionChange={setLocalizationOption}
              onScriptTextChange={setScriptText}
              onFileSelected={handleFileSelected}
              onRunLocalization={handleRunLocalization}
              onLoadSampleStory={handleLoadSampleStory}
            />
          </div>

          {/* Right Column (7/12): 4-Section Localization Output & Customizer */}
          <div className="lg:col-span-7">
            <LocalizationWorkbench
              result={result}
              activeTab={activeTab}
              currentTimeSec={currentTimeSec}
              subtitleStyle={subtitleStyle}
              isBatchSynthesizing={isBatchSynthesizing}
              synthesizingSegmentId={synthesizingSegmentId}
              onChangeTab={setActiveTab}
              onUpdateCharacter={handleUpdateCharacter}
              onUpdateSegmentText={handleUpdateSegmentText}
              onSeekToSegment={(sec) => {
                handleSeek(sec);
              }}
              onPlayDubLine={handlePlayDubLine}
              onPreviewCharacterVoice={handlePreviewCharacterVoice}
              onBatchSynthesizeAll={handleBatchSynthesizeAll}
              onUpdateSubtitleStyle={(patch) =>
                setSubtitleStyle((prev) => ({ ...prev, ...patch }))
              }
              onDownloadTextFile={handleDownloadTextFile}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
