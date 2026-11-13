import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  FileAudio,
  Image as ImageIcon,
  Loader2,
  Mic,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Volume2,
  CheckCircle2,
} from 'lucide-react';
import sampleHandwrittenNoteUrl from '../assets/images/sample_handwritten_note_1794568290874.jpg';
import type { BusinessProfile } from '../types.ts';

export interface MediaAttachment {
  name: string;
  mimeType: string;
  data: string;
  previewUrl: string;
}

interface InquiryInputCardProps {
  activeBusiness: BusinessProfile;
  inquiryText: string;
  onChangeText: (text: string) => void;
  imageAttachment: MediaAttachment | null;
  onChangeImage: (img: MediaAttachment | null) => void;
  audioAttachment: MediaAttachment | null;
  onChangeAudio: (aud: MediaAttachment | null) => void;
  onLoadSampleNote: (img: MediaAttachment) => void;
  onGenerateQuote: () => void;
  isGenerating: boolean;
  agentStepIndex: number;
  errorMessage: string | null;
}

const AGENT_STEPS = [
  'Reading inquiry & attachments',
  'Matching rate card',
  'Computing GST',
  'Drafting WhatsApp follow-up',
];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error('Failed to encode file as base64.'));
        return;
      }
      resolve(result.slice(commaIdx + 1));
    };
    reader.onerror = () => reject(new Error('Failed to read media file.'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlobUrl(base64: string, mimeType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

function normalizeAudioMimeType(rawMime: string, fileName?: string): string {
  const clean = rawMime.split(';')[0].trim().toLowerCase();
  if (clean && clean !== 'application/octet-stream') {
    return clean;
  }
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.ogg') || lower.endsWith('.opus')) return 'audio/ogg';
  return 'audio/webm';
}

export function InquiryInputCard({
  activeBusiness,
  inquiryText,
  onChangeText,
  imageAttachment,
  onChangeImage,
  audioAttachment,
  onChangeAudio,
  onLoadSampleNote,
  onGenerateQuote,
  isGenerating,
  agentStepIndex,
  errorMessage,
}: InquiryInputCardProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isLoadingSampleNote, setIsLoadingSampleNote] = useState(false);
  const [isLoadingSampleVoice, setIsLoadingSampleVoice] = useState(false);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleImageFile = async (file: File) => {
    setMediaError(null);
    if (!file.type.startsWith('image/')) {
      setMediaError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }
    try {
      const base64 = await blobToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      onChangeImage({
        name: file.name,
        mimeType: file.type || 'image/jpeg',
        data: base64,
        previewUrl,
      });
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to load image.');
    }
  };

  const handleAudioFile = async (file: File) => {
    setMediaError(null);
    try {
      const base64 = await blobToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      onChangeAudio({
        name: file.name,
        mimeType: normalizeAudioMimeType(file.type, file.name),
        data: base64,
        previewUrl,
      });
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to load audio clip.');
    }
  };

  const handleTrySampleNote = async () => {
    setMediaError(null);
    setIsLoadingSampleNote(true);
    try {
      const resp = await fetch(sampleHandwrittenNoteUrl);
      if (!resp.ok) throw new Error('Could not load sample handwritten note asset.');
      const blob = await resp.blob();
      const base64 = await blobToBase64(blob);
      onLoadSampleNote({
        name: 'indiranagar-site-handwritten-note.jpg',
        mimeType: blob.type || 'image/jpeg',
        data: base64,
        previewUrl: sampleHandwrittenNoteUrl,
      });
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Unable to load sample note.');
    } finally {
      setIsLoadingSampleNote(false);
    }
  };

  const handleTrySampleVoice = async () => {
    setMediaError(null);
    setIsLoadingSampleVoice(true);
    try {
      const resp = await fetch(`/api/sample-voice/${activeBusiness.presetKey}`);
      const payload = await resp.json();
      if (!resp.ok) {
        throw new Error(payload.error || 'Could not load sample voice note.');
      }
      const previewUrl = base64ToBlobUrl(payload.data, payload.mimeType);
      onChangeAudio({
        name: payload.fileName || 'sample-hinglish-voice-note.wav',
        mimeType: payload.mimeType || 'audio/wav',
        data: payload.data,
        previewUrl,
      });
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Unable to generate sample voice note.');
    } finally {
      setIsLoadingSampleVoice(false);
    }
  };

  const startRecording = async () => {
    setMediaError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMediaError('Voice recording is not supported in this browser. Upload an audio clip instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const chosenMime = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const mimeType = normalizeAudioMimeType(recorder.mimeType || chosenMime || 'audio/webm');
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        if (blob.size === 0) {
          setMediaError('Recorded audio was empty. Please speak closer to the microphone.');
          return;
        }
        try {
          const base64 = await blobToBase64(blob);
          const previewUrl = URL.createObjectURL(blob);
          const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
          onChangeAudio({
            name: `voice-note-${recordingSeconds || 1}s.${ext}`,
            mimeType,
            data: base64,
            previewUrl,
          });
        } catch (err) {
          setMediaError(err instanceof Error ? err.message : 'Failed to encode voice recording.');
        }
      };

      mediaRecorderRef.current = recorder;
      setRecordingSeconds(0);
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setMediaError(
        err instanceof Error
          ? `Microphone access unavailable (${err.message}). Try the Sample Voice Note or upload an audio clip.`
          : 'Microphone access denied. Try the Sample Voice Note or upload an audio clip.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const hasAnyInput = Boolean(inquiryText.trim() || imageAttachment || audioAttachment);

  return (
    <section className="no-print rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            02. Messy Customer Inquiry Input
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Paste WhatsApp messages, upload handwritten site notes, or attach a voice note — simultaneously or individually.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTrySampleNote}
            disabled={isLoadingSampleNote || isGenerating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 whitespace-nowrap transition-colors disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isLoadingSampleNote ? 'Loading Note...' : 'Try Sample Handwritten Note'}</span>
          </button>

          <button
            type="button"
            onClick={handleTrySampleVoice}
            disabled={isLoadingSampleVoice || isGenerating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap transition-colors disabled:opacity-50"
          >
            {isLoadingSampleVoice ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{isLoadingSampleVoice ? 'Generating Voice...' : 'Try Sample Voice Note'}</span>
          </button>
        </div>
      </div>

      {/* Realistic One-Click Preset Test Buttons */}
      <div className="mt-4">
        <div className="mb-1.5 text-[11px] font-medium text-slate-500">
          One-click {activeBusiness.presetName} WhatsApp inquiries:
        </div>
        <div className="flex flex-wrap gap-2">
          {activeBusiness.sampleInquiries.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => onChangeText(sample.text)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-900 transition-colors text-left"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* WhatsApp / Text Input */}
      <div className="mt-4">
        <label htmlFor="inquiry-textarea" className="sr-only">
          Customer WhatsApp or SMS inquiry text
        </label>
        <textarea
          id="inquiry-textarea"
          rows={4}
          value={inquiryText}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={`Paste customer WhatsApp / SMS inquiry here (English, Hinglish, or mixed)... e.g., "Bhaiya 2BHK whitefield mein wardrobe chahiye 8x7 ft laminate..."`}
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
        />
      </div>

      {/* Multimodal Attachments Grid: Photo + Voice */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Image Upload Slot */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const droppedFile = e.dataTransfer.files?.[0];
            if (droppedFile) void handleImageFile(droppedFile);
          }}
          className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-3.5"
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImageFile(file);
              e.target.value = '';
            }}
            className="hidden"
          />

          {imageAttachment ? (
            <div className="flex items-start gap-3">
              <img
                src={imageAttachment.previewUrl}
                alt="Attached handwritten note or site sketch"
                referrerPolicy="no-referrer"
                className="h-16 w-20 shrink-0 rounded-md border border-slate-200 object-cover bg-white"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-slate-900">
                  {imageAttachment.name}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-emerald-700">
                  Image ready for Gemini Vision
                </div>
                <button
                  type="button"
                  onClick={() => onChangeImage(null)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  <span>Remove photo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800">
                    Handwritten Note / Site Photo
                  </div>
                  <div className="text-[11px] text-slate-500">Drop photo or upload JPG/PNG</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Upload</span>
              </button>
            </div>
          )}
        </div>

        {/* Voice Note / Audio Upload Slot */}
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-3.5">
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleAudioFile(file);
              e.target.value = '';
            }}
            className="hidden"
          />

          {audioAttachment ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileAudio className="h-4 w-4 shrink-0 text-indigo-700" aria-hidden="true" />
                  <span className="truncate text-xs font-semibold text-slate-900">
                    {audioAttachment.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeAudio(null)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700 shrink-0"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  <span>Remove</span>
                </button>
              </div>
              <audio controls src={audioAttachment.previewUrl} className="h-8 w-full" />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                    isRecording
                      ? 'border-red-300 bg-red-50 text-red-600'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <Mic className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800">
                    {isRecording
                      ? `Recording Voice Note (${formatDuration(recordingSeconds)})`
                      : 'Voice Note / Audio Clip'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isRecording ? 'Speak Hinglish or English clearly' : 'Record mic or upload clip'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 whitespace-nowrap"
                  >
                    <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={startRecording}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Record</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Clip</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Errors */}
      {(mediaError || errorMessage) && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
        >
          {mediaError || errorMessage}
        </div>
      )}

      {/* Agent Loading Stepper */}
      {isGenerating && (
        <div
          aria-live="polite"
          className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50/70 p-4"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-700" aria-hidden="true" />
            <span>QuoteSnap AI Agent Processing</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
            {AGENT_STEPS.map((step, idx) => {
              const isDone = idx < agentStepIndex;
              const isCurrent = idx === agentStepIndex;
              return (
                <div
                  key={step}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors ${
                    isCurrent
                      ? 'border-indigo-400 bg-white font-semibold text-indigo-900'
                      : isDone
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                        : 'border-slate-200 bg-white/60 text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <span className="font-mono text-[11px] shrink-0">0{idx + 1}</span>
                  )}
                  <span className="truncate">{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Generate CTA */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="text-xs text-slate-500">
          AI extracts catalog IDs & flags missing specs · TypeScript computes exact INR & GST math.
        </div>
        <button
          type="button"
          disabled={!hasAnyInput || isGenerating || isRecording}
          onClick={onGenerateQuote}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Generating GST Quote...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Generate GST Quote</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
