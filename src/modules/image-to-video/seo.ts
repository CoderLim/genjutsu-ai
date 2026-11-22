/**
 * Public Image to Video SEO page facts and editorial copy.
 * Both the visible component and schema.org markup import these values,
 * so FAQ/HowTo JSON-LD always reflects what visitors can read.
 */
export const IMAGE_TO_VIDEO_PATH = '/image-to-video/';
export const IMAGE_TO_VIDEO_TITLE = 'Image to Video AI — Turn Photos Into a Video Online';
export const IMAGE_TO_VIDEO_DESCRIPTION =
  'Turn a photo into a moving video with AI. Upload an image, describe the motion, and download your clip for social posts, product listings, or old family photos.';

export const IMAGE_TO_VIDEO_STEPS = [
  {
    name: 'Upload your photo',
    text: 'Choose a clear JPG, PNG, or WebP photo. Each model has its own file type and size limits, which the uploader checks. A sharp, well-lit original usually gives the model more detail to work with.',
  },
  {
    name: 'Describe the motion',
    text: 'Tell the model what should move or how the camera should travel. Try “slow zoom in on the face”, “camera pans left across the room”, or “hair moving in a gentle breeze”.',
  },
  {
    name: 'Generate and download',
    text: 'Choose the available duration and resolution for your model, review the credit estimate, and generate. When the video is ready, download the MP4 or try another variation.',
  },
] as const;

export const IMAGE_TO_VIDEO_FAQS = [
  {
    question: 'How long does it take to turn a photo into a video?',
    answer:
      'It depends on the selected model, video length, resolution, and provider load. Generation runs on the server; you can follow the task status and download the result when it completes.',
  },
  {
    question: 'Do I need video editing experience?',
    answer:
      'No. You do not need a timeline or editing software. Upload an image, write a motion prompt, choose the supported settings, and generate.',
  },
  {
    question: 'Can I use the videos commercially?',
    answer:
      'Check the Genjutsu AI terms and the applicable model or provider licence before using generated footage in ads, product listings, or client work. Commercial rights are not guaranteed merely by purchasing credits.',
  },
  {
    question: 'Which image formats are supported?',
    answer:
      'JPG, PNG, and WebP are supported by many of the available models. Individual models can have narrower format and file-size limits; the uploader checks the model you choose.',
  },
  {
    question: 'Why does my result look distorted?',
    answer:
      'The subject may be too close to an image edge, the input may be small or blurry, or the requested movement may be too aggressive. Try a sharper image, a wider crop, and a slower, simpler camera move.',
  },
  {
    question: 'Are free videos watermarked?',
    answer:
      'Watermark behavior can depend on the model and provider. Check the generated file and the applicable terms before publishing; this page does not promise watermark-free output.',
  },
] as const;
