import { useRef, useState, type ChangeEvent } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';

import { ApiError, apiGet, apiPost, uploadToSignedUrl } from '@/lib/api-client';

type UploadInfo = { uploadUrl: string; uploadHeaders: Record<string, string>; inputUrl: string };
type Task = { taskId: string; taskStatus: string; taskStatusMessage: string | null; videoUrl: string | null };
type Media = { file: File; url: string; width: number; height: number; duration?: number };
type Orientation = 'image' | 'video';

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Unexpected error';
}

function readMedia(file: File, kind: 'image' | 'video'): Promise<Media> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    if (kind === 'image') {
      const image = new Image();
      image.onload = () => resolve({ file, url, width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('Could not read image'));
      image.src = url;
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve({ file, url, width: video.videoWidth, height: video.videoHeight, duration: video.duration });
    video.onerror = () => reject(new Error('Could not read video'));
    video.src = url;
  });
}

function validate(media: Media | null, kind: 'image' | 'video', orientation: Orientation) {
  if (!media) return '';
  if (kind === 'image') {
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(media.file.type)) return 'Use JPG, JPEG, or PNG';
    if (media.file.size > 10 * 1024 * 1024) return 'Image must be 10 MB or smaller';
    if (media.width < 300 || media.height < 300 || media.width > 65536 || media.height > 65536) return 'Image dimensions are outside Kling limits';
    const ratio = media.width / media.height;
    return ratio < 0.4 || ratio > 2.5 ? 'Image ratio must be between 1:2.5 and 2.5:1' : '';
  }
  if (!['video/mp4', 'video/quicktime'].includes(media.file.type)) return 'Use MP4 or MOV';
  if (media.file.size > 100 * 1024 * 1024) return 'Video must be 100 MB or smaller';
  if (media.width < 340 || media.height < 340 || media.width > 3850 || media.height > 3850) return 'Video dimensions are outside Kling limits';
  const duration = media.duration || 0;
  const max = orientation === 'image' ? 10 : 30;
  return duration < 3 || duration > max ? `Video duration must be 3-${max}s` : '';
}

function Picker({ kind, media, error, onPick }: { kind: 'image' | 'video'; media: Media | null; error: string; onPick: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onPick(file);
    event.target.value = '';
  };
  return <div className="space-y-2"><div><b className="text-sm">{kind === 'image' ? 'Reference image' : 'Motion video'}</b><p className="text-[11px] text-white/40">{kind === 'image' ? 'JPG / PNG, max 10 MB' : 'MP4 / MOV, 3-30s, max 100 MB'}</p></div><input ref={ref} className="hidden" type="file" accept={kind === 'image' ? '.jpg,.jpeg,.png' : '.mp4,.mov'} onChange={onChange} /><button type="button" onClick={() => ref.current?.click()} className="relative flex min-h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/15 hover:border-white/30">{media ? kind === 'image' ? <img src={media.url} alt="reference" className="absolute inset-0 size-full object-contain p-2" /> : <video src={media.url} muted className="absolute inset-0 size-full object-contain p-2" /> : <span className="flex items-center gap-2 text-xs text-white/45"><Upload className="size-4" />Click to upload</span>}{media ? <span className="absolute inset-x-2 bottom-2 rounded-lg bg-black/70 px-2 py-1.5 text-left text-[10px] text-white/60">{media.file.name} - {media.width}x{media.height}{media.duration ? ` - ${media.duration.toFixed(1)}s` : ''}</span> : null}</button>{error ? <p className="text-xs text-red-300">{error}</p> : null}</div>;
}

export function KlingMotionControlTester() {
  const [image, setImage] = useState<Media | null>(null);
  const [video, setVideo] = useState<Media | null>(null);
  const [model, setModel] = useState<'kling-v3' | 'kling-v2-6'>('kling-v3');
  const [mode, setMode] = useState<'std' | 'pro'>('std');
  const [orientation, setOrientation] = useState<Orientation>('video');
  const [prompt, setPrompt] = useState('');
  const [keepSound, setKeepSound] = useState(true);
  const [status, setStatus] = useState('idle');
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState('');
  const runRef = useRef(0);
  const imageError = validate(image, 'image', orientation);
  const videoError = validate(video, 'video', orientation);
  const busy = ['uploading', 'submitted', 'processing'].includes(status);

  const pick = async (file: File, kind: 'image' | 'video') => {
    try { const media = await readMedia(file, kind); kind === 'image' ? setImage(media) : setVideo(media); setError(''); }
    catch (cause) { setError(errorText(cause)); }
  };
  const fetchTask = (id: string) => apiGet<Task>(`/api/admin/kling-motion-control/status/${encodeURIComponent(id)}`);
  const applyTask = (next: Task) => {
    setTask(next);
    if (next.taskStatus === 'succeed') { setStatus('succeed'); return true; }
    if (next.taskStatus === 'failed') { setStatus('failed'); setError(next.taskStatusMessage || 'Kling task failed'); return true; }
    setStatus(next.taskStatus === 'submitted' ? 'submitted' : 'processing');
    return false;
  };

  const generate = async () => {
    if (!image || !video || imageError || videoError || prompt.length > 2500 || busy) return;
    const runId = ++runRef.current;
    const requestId = crypto.randomUUID();
    setTask(null); setError(''); setStatus('uploading');
    try {
      const [imageUpload, videoUpload] = await Promise.all([
        apiPost<UploadInfo>('/api/admin/kling-motion-control/upload-url', { requestId, kind: 'image', contentType: image.file.type, contentLength: image.file.size }),
        apiPost<UploadInfo>('/api/admin/kling-motion-control/upload-url', { requestId, kind: 'video', contentType: video.file.type, contentLength: video.file.size }),
      ]);
      await Promise.all([
        uploadToSignedUrl({ url: imageUpload.uploadUrl, headers: imageUpload.uploadHeaders, file: image.file }),
        uploadToSignedUrl({ url: videoUpload.uploadUrl, headers: videoUpload.uploadHeaders, file: video.file }),
      ]);
      if (runRef.current !== runId) return;
      setStatus('submitted');
      const created = await apiPost<Task>('/api/admin/kling-motion-control/generate', { imageUrl: imageUpload.inputUrl, videoUrl: videoUpload.inputUrl, prompt: prompt.trim(), modelName: model, mode, characterOrientation: orientation, keepOriginalSound: keepSound, watermarkEnabled: false, externalTaskId: `genjutsu-${requestId}` });
      if (applyTask(created)) return;
      for (let i = 0; i < 200; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (runRef.current !== runId) return;
        if (applyTask(await fetchTask(created.taskId))) return;
      }
      setError('Polling stopped after 10 minutes. Use Check status.');
    } catch (cause) { if (runRef.current === runId) { setStatus('failed'); setError(errorText(cause)); } }
  };

  const disabled = !image || !video || !!imageError || !!videoError || prompt.length > 2500 || busy;
  return <div className="overflow-hidden rounded-3xl bg-[rgb(41,30,23)] text-[rgb(237,234,222)]"><div className="border-b border-white/10 px-5 py-3"><b>Kling Motion Control</b><p className="text-[11px] text-white/40">Isolated admin test flow. No Genjutsu credits, orders, or generation records.</p></div><div className="grid gap-4 p-5 lg:grid-cols-[1fr_320px]"><div className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Picker kind="image" media={image} error={imageError} onPick={(file) => pick(file, 'image')} /><Picker kind="video" media={video} error={videoError} onPick={(file) => pick(file, 'video')} /></div><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="Optional prompt, max 2500 characters" className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm outline-none" /><p className="text-right text-[10px] text-white/35">{prompt.length}/2500</p></div><aside className="space-y-3 rounded-2xl border border-white/10 bg-black/15 p-3"><select value={model} onChange={(e) => setModel(e.target.value as typeof model)} className="w-full rounded-xl bg-black/30 p-2"><option value="kling-v3">Kling 3.0</option><option value="kling-v2-6">Kling 2.6</option></select><select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="w-full rounded-xl bg-black/30 p-2"><option value="std">Standard</option><option value="pro">Professional</option></select><select value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)} className="w-full rounded-xl bg-black/30 p-2"><option value="video">Follow video orientation</option><option value="image">Follow image orientation</option></select><label className="flex justify-between rounded-xl border border-white/10 p-2 text-xs"><span>Keep original sound</span><input type="checkbox" checked={keepSound} onChange={(e) => setKeepSound(e.target.checked)} /></label><button type="button" disabled={disabled} onClick={generate} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[rgb(204,144,92)] text-sm font-semibold disabled:bg-white/10 disabled:text-white/30">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{busy ? status : 'Generate with Kling'}</button></aside></div>{task || error || busy ? <div className="border-t border-white/10 p-5">{error ? <p className="mb-3 rounded-xl bg-red-950/30 p-3 text-xs text-red-200">{error}</p> : null}{task?.videoUrl ? <video src={task.videoUrl} controls playsInline className="max-h-[640px] w-full rounded-2xl bg-black/30" /> : busy ? <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-white/50"><LoaderCircle className="size-4 animate-spin" />{status}</div> : null}{task?.taskId ? <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-white/35"><span>Task ID: {task.taskId}</span><button type="button" onClick={async () => { try { applyTask(await fetchTask(task.taskId)); } catch (cause) { setError(errorText(cause)); } }} className="rounded-lg border border-white/10 px-2 py-1">Check status</button></div> : null}</div> : null}</div>;
}
