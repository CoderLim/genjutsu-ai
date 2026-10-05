import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';

import { ApiError, apiGet, apiPost, uploadToSignedUrl } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type UploadInfo = { uploadUrl: string; uploadHeaders: Record<string, string>; inputUrl: string };
type Task = { taskId: string; taskStatus: string; taskStatusMessage: string | null; videoUrl: string | null; duration: string | number | null; finalUnitDeduction: string | number | null; raw: unknown };
type Media = { file: File; url: string; width: number; height: number; duration?: number };
type Orientation = 'image' | 'video';

function message(error: unknown) {
  if (error instanceof ApiError) {
    const data = error.data && typeof error.data === 'object' ? (error.data as Record<string, unknown>) : null;
    return data?.providerCode != null ? `${error.message} (Kling code: ${String(data.providerCode)})` : error.message;
  }
  return error instanceof Error ? error.message : 'Unexpected error';
}

function read(file: File, kind: 'image' | 'video'): Promise<Media> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    if (kind === 'image') {
      const node = new Image();
      node.onload = () => resolve({ file, url, width: node.naturalWidth, height: node.naturalHeight });
      node.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      node.src = url;
      return;
    }
    const node = document.createElement('video');
    node.preload = 'metadata';
    node.onloadedmetadata = () => resolve({ file, url, width: node.videoWidth, height: node.videoHeight, duration: node.duration });
    node.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read video')); };
    node.src = url;
  });
}

function validate(media: Media | null, kind: 'image' | 'video', orientation: Orientation) {
  if (!media) return null;
  if (kind === 'image') {
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(media.file.type)) return 'Use JPG, JPEG, or PNG';
    if (media.file.size > 10 * 1024 * 1024) return 'Image must be â‰¤10 MB';
    if (media.width < 300 || media.height < 300 || media.width > 65536 || media.height > 65536) return 'Image dimensions are outside Kling limits';
    const ratio = media.width / media.height;
    if (ratio < 0.4 || ratio > 2.5) return 'Image ratio must be between 1:2.5 and 2.5:1';
    return null;
  }
  if (!['video/mp4', 'video/quicktime'].includes(media.file.type)) return 'Use MP4 or MOV';
  if (media.file.size > 100 * 1024 * 1024) return 'Video must be â‰¤100 MB';
  if (media.width < 340 || media.height < 340 || media.width > 3850 || media.height > 3850) return 'Video dimensions are outside Kling limits';
  const duration = media.duration ?? 0;
  if (duration < 3 || duration > (orientation === 'image' ? 10 : 30)) return `Video duration must be 3â€“${orientation === 'image' ? 10 : 30}s`;
  return null;
}

function Pick({ kind, media, error, onPick }: { kind: 'image' | 'video'; media: Media | null; error: string | null; onPick: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const change = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) onPick(file); event.target.value = ''; };
  return <div className="space-y-2"><div><b className="text-sm">{kind === 'image' ? 'Reference image' : 'Motion video'}</b><p className="text-[11px] text-white/40">{kind === 'image' ? 'JPG / PNG Â· â‰¤10 MB' : 'MP4 / MOV Â· 3â€“30s Â· â‰¤100 MB'}</p></div><input ref={input} type="file" accept={kind === 'image' ? '.jpg,.jpeg,.png' : '.mp4,.mov'} onChange={change} className="hidden" /><button type="button" onClick={() => input.current?.click()} className={cn('relative flex min-h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-black/15', error ? 'border-red-400/40' : 'border-white/15 hover:border-white/30')}>{media ? kind === 'image' ? <img src={media.url} className="absolute inset-0 size-full object-contain p-2" alt="reference" /> : <video src={media.url} muted className="absolute inset-0 size-full object-contain p-2" /> : <span className="flex flex-col items-center gap-2 text-xs text-white/45"><Upload className="size-5 text-[rgb(204,144,92)]" />Click to upload</span>}{media ? <span className="absolute inset-x-2 bottom-2 rounded-lg bg-black/70 px-2 py-1.5 text-left text-[10px] text-white/60">{media.file.name} Â· {media.width}Ã—{media.height}{media.duration ? ` Â· ${media.duration.toFixed(1)}s` : ''}</span> : null}</button>{error ? <p className="text-xs text-red-300/85">{error}</p> : null}</div>;
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
  const run = useRef(0);
  useEffect(() => () => { if (image) URL.revokeObjectURL(image.url); }, [image]);
  useEffect(() => () => { if (video) URL.revokeObjectURL(video.url); }, [video]);
  const imageError = validate(image, 'image', orientation);
  const videoError = validate(video, 'video', orientation);
  const busy = ['uploading', 'submitted', 'processing'].includes(status);

  const pick = async (file: File, kind: 'image' | 'video') => { try { const media = await read(file, kind); kind === 'image' ? setImage(media) : setVideo(media); setError(''); } catch (cause) { setError(message(cause)); } };
  const readTask = (id: string) => apiGet<Task>(`/api/admin/kling-motion-control/status/${encodeURIComponent(id)}`);
  const apply = (next: Task) => { setTask(next); if (next.taskStatus === 'succeed') { setStatus('succeed'); return true; } if (next.taskStatus === 'failed') { setStatus('failed'); setError(next.taskStatusMessage || 'Kling task failed'); return true; } setStatus(next.taskStatus === 'submitted' ? 'submitted' : 'processing'); return false; };

  const generate = async () => {
    if (!image || !video || imageError || videoError || prompt.length > 2500 || busy) return;
    const id = ++run.current; const requestId = crypto.randomUUID(); setError(''); setTask(null); setStatus('uploading');
    try {
      const [iu, vu] = await Promise.all([
        apiPost<UploadInfo>('/api/admin/kling-motion-control/upload-url', { requestId, kind: 'image', contentType: image.file.type, contentLength: image.file.size }),
        apiPost<UploadInfo>('/api/admin/kling-motion-control/upload-url', { requestId, kind: 'video', contentType: video.file.type, contentLength: video.file.size }),
      ]);
      await Promise.all([uploadToSignedUrl({ url: iu.uploadUrl, headers: iu.uploadHeaders, file: image.file }), uploadToSignedUrl({ url: vu.uploadUrl, headers: vu.uploadHeaders, file: video.file })]);
      if (run.current !== id) return; setStatus('submitted');
      const created = await apiPost<Task>('/api/admin/kling-motion-control/generate', { imageUrl: iu.inputUrl, videoU\›ˆKš[œ]\››Û\ˆ›Û\š[J
K[Ù[˜[YNˆ[Ù[[ÙKÚ\˜Xİ\“ÜšY[][ÛˆÜšY[][Û‹ÙY\ÜšYÚ[˜[Ûİ[™ˆÙY\Ûİ[™Ø]\›X\šÑ[˜X›Yˆ˜[ÙK^\›˜[\ÚÒYˆÙ[š]İKIÜ™\]Y\İYXJNÂˆYˆ
\JÜ™X]Y
JH™]\›Âˆ›Üˆ
]HHÈHŒÈH
ÏHJHÈ]ØZ]™]È›ÛZ\ÙJ
™\ÛÛ™JHOˆÙ][Y[İ]
™\ÛÛ™KÌ
JNÈYˆ
[‹˜İ\œ™[OOHY
H™]\›ÈYˆ
\J]ØZ]™XY\ÚÊÜ™X]Y\ÚÒY
JJH™]\›ÈBˆÙ]\œ›ÜŠ	ÔÛ[™ÈİÜYY\ˆLZ[]\Ëˆ\ÙHÚXÚÈİ]\Ë‰ÊNÂˆHØ]Ú
Ø]\ÙJHÈYˆ
[‹˜İ\œ™[OOHY
HÈÙ]İ]\Ê	Ù˜Z[Y	ÊNÈÙ]\œ›ÜŠY\ÜØYÙJØ]\ÙJJNÈHBˆNÂ‚ˆ™]\›ˆ]ˆÛ\ÜÓ˜[YOH›İ™\™›İËZY[ˆ›İ[™YVÌH›Ü™\ˆ›Ü™\‹X›XÚËÌL™ËVÜ™ØŠKÌŒÊWH^VÜ™ØŠŒÍËŒÍŒŒŠWHÚYİË^]ˆÛ\ÜÓ˜[YOH˜›Ü™\‹Xˆ›Ü™\‹]Ú]KÎMHKLÈˆÛ\ÜÓ˜[YOH^\ÛH’Û[™È[İ[ÛˆÛÛ›ÛØÛ\ÜÓ˜[YOH^VÌL\H^]Ú]KÍ”İ[™[Û™HYZ[ˆ\İ›İÈ0­È›ÈÙ[š]İHÜ™Y]ËÜ™\œËÜˆÙ[™\˜][Ûˆ™XÛÜ™ÏÜÙ]]ˆÛ\ÜÓ˜[YOH™ÜšYØ\MMHÎ™ÜšYXÛÛËVÌYœ—ÌÌŒH]ˆÛ\ÜÓ˜[YOHœÜXÙK^KM]ˆÛ\ÜÓ˜[YOH™ÜšYØ\MY™ÜšYXÛÛËLˆXÚÈÚ[™Hš[XYÙHˆYYXO^Ú[XYÙ_H\œ›Ü^Ú[XYÙQ\œ›ÜŸHÛ”XÚÏ^Êš[JHOˆXÚÊš[K	Ú[XYÙIÊ_HÏXÚÈÚ[™HšY[ÈˆYYXO^İšY[ßH\œ›Ü^İšY[Ñ\œ›ÜŸHÛ”XÚÏ^Êš[JHOˆXÚÊš[K	İšY[ÉÊ_HÏÙ]]]ˆÛ\ÜÓ˜[YOH›X‹Lˆ›^\İYKX™]ÙY[ˆ^\ÛH”›Û\Ü[ˆÛ\ÜÓ˜[YOH™›Û[›Ü›X[^]Ú]KÌÍHŠÜ[Û˜[
OÜÜ[ØÜ[ˆÛ\ÜÓ˜[YO^Ü›Û\›[™İˆLÈ	İ^\™YLÌ	Èˆ	İ^]Ú]KÌÌ	ßOOÜ›Û\›[™İKÌLÜÜ[Ù]^\™XH˜[YO^Ü›Û\HÛÚ[™ÙO^ÊJHOˆÙ]›Û\
K\™Ù]˜[YJ_H›İÜÏ^ÍHÛ\ÜÓ˜[YOHËY[›İ[™YL›Ü™\ˆ›Ü™\‹]Ú]KÌL™ËX›XÚËÌŒLÈKL‹H^\ÛHİ][™K[›Û™HˆXÙZÛ\H\X\˜[˜ÙH]Z[ÈÈ™\Ù\™HÜˆ™Yš[™x )ˆˆÏÙ]Ù]\ÚYHÛ\ÜÓ˜[YOHœÜXÙK^KLÈ›İ[™YL›Ü™\ˆ›Ü™\‹]Ú]KÎ™ËX›XÚËÌMHLÈÙ[Xİ˜[YO^Û[Ù[HÛÚ[™ÙO^ÊJHOˆÙ][Ù[
K\™Ù]˜[YH\È\[Ùˆ[Ù[
_HÛ\ÜÓ˜[YOHËY[›İ[™Y^›Ü™\ˆ›Ü™\‹]Ú]KÌL™ËX›XÚËÌÌL‹H^\ÛHÜ[Ûˆ˜[YOHšÛ[™Ë]ŒÈ’Û[™ÈËŒÛÜ[ÛÜ[Ûˆ˜[YOHšÛ[™Ë]Œ‹Mˆ’Û[™È‹ÛÜ[ÛÜÙ[XİÙ[Xİ˜[YO^Û[Ù_HÛÚ[™ÙO^ÊJHOˆÙ][ÙJK\™Ù]˜[YH\È\[Ùˆ[ÙJ_HÛ\ÜÓ˜[YOHËY[›İ[™Y^›Ü™\ˆ›Ü™\‹]Ú]KÌL™ËX›XÚËÌÌL‹H^\ÛHÜ[Ûˆ˜[YOHœİ”İ[™\™ÛÜ[ÛÜ[Ûˆ˜[YOHœ›È”›Ù™\ÜÚ[Û˜[ÛÜ[ÛÜÙ[XİÙ[Xİ˜[YO^ÛÜšY[][ÛŸHÛÚ[™ÙO^ÊJHOˆÙ]ÜšY[][ÛŠK\™Ù]˜[YH\ÈÜšY[][ÛŠ_HÛ\ÜÓ˜[YOHËY[›İ[™Y^›Ü™\ˆ›Ü™\‹]Ú]KÌL™ËX›XÚËÌÌL‹H^\ÛHÜ[Ûˆ˜[YOHšY[È‘›ÛİÈšY[ÈÜšY[][ÛÛÜ[ÛÜ[Ûˆ˜[YOHš[XYÙH‘›ÛİÈ[XYÙHÜšY[][ÛÛÜ[ÛÜÙ[XİX™[Û\ÜÓ˜[YOH™›^][\ËXÙ[\ˆ\İYKX™]ÙY[ˆ›İ[™Y^›Ü™\ˆ›Ü™\‹]Ú]KÎL‹H^^ÈÜ[’ÙY\ÜšYÚ[˜[Ûİ[™ÜÜ[[œ]\OH˜ÚXÚØ›ŞˆÚXÚÙY^ÚÙY\Ûİ[™HÛÚ[™ÙO^ÊJHOˆÙ]ÙY\Ûİ[™
K\™Ù]˜ÚXÚÙY
_HÏÛX™[]Ûˆ\OH˜]Ûˆˆ\ØX›Y^ÈZ[XYÙH]šY[ÈHZ[XYÙQ\œ›ÜˆH]šY[Ñ\œ›Üˆ›Û\›[™İˆL\Ş_HÛÛXÚÏ^ÙÙ[™\˜]_HÛ\ÜÓ˜[YOH™›^LLËY[][\ËXÙ[\ˆ\İYKXÙ[\ˆØ\Lˆ›İ[™Y^™ËVÜ™ØŠŒMLŠWH^\ÛH›Û\Ù[ZX›Û^VÜ™ØŠË‹ÊWH\ØX›Y˜İ\œÛÜ‹[›İX[İÙY\ØX›Y˜™Ë]Ú]KÎ\ØX›Y^]Ú]KÌÌØ\ŞHÈØY\Ú\˜ÛHÛ\ÜÓ˜[YOHœÚ^™KM[š[X]K\Ü[ˆˆÏˆˆ\ØYÛ\ÜÓ˜[YOHœÚ^™KMˆÏŸ^Ø\ŞHÈİ]\Èˆ	ÑÙ[™\˜]HÚ]Û[™ÉßOØ]ÛØ\ÚYOÙ]İ\ÚÈ\œ›Üˆ\ŞHÈ]ˆÛ\ÜÓ˜[YOH˜›Ü™\‹]›Ü™\‹]Ú]KÎMHÙ\œ›ÜˆÈ]ˆÛ\ÜÓ˜[YOH›X‹LÈ›İ[™Y^›Ü™\ˆ›Ü™\‹\™YMÌŒ™Ë\™YNMLÌŒLÈ^^È^\™YLŒÙ\œ›ÜŸOÙ]ˆˆ[^İ\ÚÏËšY[Õ\›ÈšY[ÈÜ˜Ï^İ\ÚËšY[Õ\›HÛÛ›ÛÈ^\Ò[›[™HÛ\ÜÓ˜[YOH›X^ZVÍHËY[›İ[™YL™ËX›XÚËÌÌˆÏˆˆ\ŞHÈ]ˆÛ\ÜÓ˜[YOH™›^Z[‹ZM][\ËXÙ[\ˆ\İYKXÙ[\ˆØ\Lˆ^\ÛH^]Ú]KÍLØY\Ú\˜ÛHÛ\ÜÓ˜[YOHœÚ^™KM[š[X]K\Ü[ˆˆÏÜİ]\ßOÙ]ˆˆ[^İ\ÚÏË\ÚÒYÈ]ˆÛ\ÜÓ˜[YOH›]LÈ›^][\ËXÙ[\ˆ\İYKX™]ÙY[ˆØ\LÈ^VÌLH^]Ú]KÌÍHÜ[ˆÛ\ÜÓ˜[YOH˜œ™XZËX[•\ÚÈQˆİ\ÚË\ÚÒYOÜÜ[]Ûˆ\OH˜]ÛˆˆÛÛXÚÏ^Ø\Ş[˜È

HOˆÈHÈ\J]ØZ]™XY\ÚÊ\ÚË\ÚÒY
JNÈHØ]Ú
Ø]\ÙJHÈÙ]\œ›ÜŠY\ÜØYÙJØ]\ÙJJNÈH_HÛ\ÜÓ˜[YOHœÚš[šËL›İ[™Y[È›Ü™\ˆ›Ü™\‹]Ú]KÌLLˆKLKHÚXÚÈİ]\ÏØ]ÛÙ]ˆˆ[OÙ]ˆˆ[OÙ]ÂŸB