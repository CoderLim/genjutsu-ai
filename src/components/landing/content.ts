import type {
  AdvancedTab,
  FaqItem,
  FeatureCard,
  FooterColumn,
  ModelCard,
  NavItem,
  PricingPlan,
  Testimonial,
  ToolCard,
} from '@/types/landing';

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'AI Image',
    groups: [
      {
        items: [
          {
            title: 'Text to Image',
            description: 'Create images from text prompts',
            href: '/text-to-image',
          },
          {
            title: 'Image to Image',
            description: 'Generate from reference images',
            href: '/image-to-image',
          },
          {
            title: 'Image Templates',
            description: 'Start faster from image templates',
            href: '/image-templates',
          },
        ],
      },
    ],
  },
  {
    label: 'AI Video',
    groups: [
      {
        items: [
          {
            title: 'AI Video Generator',
            description: 'Open the video generation workspace',
            href: '/ai-video-generator',
          },
          {
            title: 'Text to Video',
            description: 'Create videos from text prompts',
            href: '/text-to-video',
          },
          {
            title: 'Image to Video',
            description: 'Animate reference images',
            href: '/image-to-video',
          },
          {
            title: 'Lip Sync',
            description: 'Create lip-sync videos with AI',
            href: 'https://fameo.ai/lip-sync-generators/ai-lip-sync-generator',
            badge: 'HOT',
          },
        ],
      },
    ],
  },
  {
    label: 'AI Photo Editor',
    groups: [
      {
        items: [
          {
            title: 'AI Photo Editor',
            description: 'Edit existing images with text',
            href: '/ai-image-editor',
          },
          {
            title: 'Expand Image',
            description: 'Extend images beyond their original borders',
            href: '/uncrop',
          },
          {
            title: 'Remove Background',
            description: 'Remove background from any image instantly',
            href: '/background-remover',
          },
          {
            title: 'AI Image Upscaler',
            description: 'Upscale images 2× or 4× with AI',
            href: '/image-upscaler',
            badge: 'NEW',
          },
        ],
      },
    ],
  },
  {
    label: 'AI Models',
    groups: [
      {
        label: 'Image Models',
        items: [
          {
            title: '🍌Nano Banana 2 Lite',
            description: 'Fast 1K generation and editing',
            href: '/nano-banana-2-lite',
            badge: 'NEW',
          },
          {
            title: 'Seedream 5.0 Pro',
            description: 'Professional 1K / 2K generation and editing',
            href: '/seedream-5-pro',
            badge: '-30%',
            iconSrc: '/images/logos/image-models/seedream.svg',
          },
          {
            title: 'GPT Image 2',
            description: 'Precise prompts, clean text, product shots',
            href: '/gpt-image-2',
            iconSrc: '/images/logos/image-models/openai.svg',
          },
          {
            title: '🍌Nano Banana 2',
            description: 'Faster next-generation image model',
            href: '/nano-banana-2',
          },
          {
            title: 'Seedream 5.0 Lite',
            description: 'Cinematic realism with dramatic lighting',
            href: '/seedream-5',
            iconSrc: '/images/logos/image-models/seedream.svg',
          },
          {
            title: 'Seedream 4.5',
            description: '2K / 4K generation and reference editing',
            href: '/seedream-4-5',
            iconSrc: '/images/logos/image-models/seedream.svg',
          },
          {
            title: 'Seedream 4.0',
            description: 'Cost-efficient 1K / 2K / 4K generation and editing',
            href: '/seedream-4',
            iconSrc: '/images/logos/image-models/seedream.svg',
          },
          {
            title: '🍌Nano Banana Pro',
            description: 'High-quality model for professional image work',
            href: '/nano-banana-pro',
          },
          {
            title: '🍌Nano Banana',
            description: 'Lightweight fast image generation model',
            href: '/nano-banana',
          },
          {
            title: 'Seedream 3.5 Pro',
            description: 'Consistent portraits and brand visuals',
            href: '/raphael-image-model',
            iconSrc: '/images/logos/image-models/seedream.svg',
          },
        ],
      },
      {
        label: 'Video Models',
        items: [
          {
            title: 'Seedance 2.0 Mini',
            description: 'Lower-cost drafts with rich reference control',
            href: '/seedance-2-mini',
            badge: 'NEW',
            iconSrc: '/images/logos/video-models/seedance.svg',
          },
          {
            title: 'Seedance 1.5 Pro',
            description: '1080p video with synchronized native audio',
            href: '/seedance-1-5',
            iconSrc: '/images/logos/video-models/seedance.svg',
          },
          {
            title: 'Seedance 1.0 Pro Fast',
            description: 'Fast video up to 1080p from 4 credits/sec',
            href: '/seedance-1',
            iconSrc: '/images/logos/video-models/seedance.svg',
          },
          {
            title: 'Kling 3.0 Turbo',
            description: 'Faster short-form text and image-to-video',
            href: '/kling-3-turbo',
            badge: 'NEW',
            iconSrc: '/images/logos/video-models/kling-official.png',
          },
          {
            title: 'Seedance 2.0',
            description: 'Smooth motion and natural choreography',
            href: '/seedance-2',
            iconSrc: '/images/logos/video-models/seedance.svg',
          },
          {
            title: 'Veo 3.1',
            description: 'Native audio, 4K output, cinematic realism',
            href: '/veo-3-1',
            iconSrc: '/images/logos/video-models/google-g.svg',
          },
          {
            title: 'Kling 3.0',
            description: 'Fast action with bold camera moves',
            href: '/kling-3',
            iconSrc: '/images/logos/video-models/kling-official.png',
          },
          {
            title: 'Seedance 1.0 Turbo',
            description: 'Stable shots with commercial control',
            href: '/raphael-video-pro',
            iconSrc: '/images/logos/video-models/seedance.svg',
          },
        ],
      },
    ],
  },
  {
    label: 'AI Tools',
    groups: [
      {
        items: [
          {
            title: 'AI 3D Model Generator',
            description: 'Turn text or images into 3D models in seconds',
            href: 'https://fast3d.io/',
          },
          {
            title: 'AI Voice Cloning',
            description: 'Clone any voice from just 3 seconds of audio',
            href: 'https://anyvoice.net/',
          },
          {
            title: 'AI Lip Sync Video',
            description: 'Create natural talking videos with AI lip sync',
            href: 'https://fameo.ai/',
            badge: 'HOT',
          },
        ],
      },
    ],
  },
  { label: 'Pricing', href: '/pricing' },
];

export const TOOL_CARDS: ToolCard[] = [
  {
    title: 'Image Editor',
    href: '/ai-image-editor',
    imageSrc: '/images/app-tools/image-editor.webp',
    imageAlt: 'Image Editor',
  },
  {
    title: 'Remove Background',
    href: '/background-remover',
    imageSrc: '/images/app-tools/remove-background.webp',
    imageAlt: 'Remove Background',
  },
  {
    title: 'Image Expand',
    href: '/uncrop',
    imageSrc: '/images/app-tools/image-expand.webp',
    imageAlt: 'Image Expand',
  },
  {
    title: 'Image Upscaler',
    href: '/image-upscaler',
    imageSrc: '/images/comparison-high.webp',
    imageAlt: 'Image Upscaler',
  },
  {
    title: 'Transform Style',
    href: '/image-templates',
    imageSrc: '/images/app-tools/transform-style.webp',
    imageAlt: 'Transform Style',
  },
];

export const MODEL_CARDS: ModelCard[] = [
  {
    name: 'Seedance 2.0 Mini',
    description: 'Lower-cost drafts with rich reference control.',
    href: '/seedance-2-mini',
    badge: 'NEW',
    badgeTone: 'new',
    iconSrc: '/images/logos/video-models/seedance.svg',
  },
  {
    name: 'GPT Image 2',
    description: 'Precise prompts, clean text, product shots.',
    href: '/gpt-image-2',
    badge: 'HOT',
    badgeTone: 'hot',
    iconSrc: '/images/logos/image-models/openai.svg',
  },
  {
    name: '🍌Nano Banana 2 Lite',
    description: 'Fast 1K generation and editing for 11 credits.',
    href: '/nano-banana-2-lite',
    badge: 'NEW',
    badgeTone: 'new',
  },
  {
    name: 'Seedream 5.0 Pro',
    description: 'Professional 1K/2K generation and multi-reference editing.',
    href: '/seedream-5-pro',
    badge: '-30%',
    badgeTone: 'sale',
    iconSrc: '/images/logos/image-models/seedream.svg',
  },
  {
    name: 'Seedance 2.0',
    description: 'Smooth motion and natural choreography.',
    href: '/seedance-2',
    iconSrc: '/images/logos/video-models/seedance.svg',
  },
  {
    name: 'Veo 3.1',
    description: 'Native audio, 4K output, cinematic realism.',
    href: '/veo-3-1',
    iconSrc: '/images/logos/video-models/google-g.svg',
  },
  {
    name: '🍌Nano Banana 2',
    description: 'Multi-reference edits with fast style control.',
    href: '/nano-banana-2',
  },
  {
    name: 'Kling 3.0 Turbo',
    description: 'Faster short-form text and first-frame video generation.',
    href: '/kling-3-turbo',
    badge: 'NEW',
    badgeTone: 'new',
    iconSrc: '/images/logos/video-models/kling-official.png',
  },
  {
    name: 'Seedance 2.5',
    description: 'Coming soon: next-generation video model.',
    href: '/seedance-2-mini',
    badge: 'COMING',
    badgeTone: 'coming',
  },
];

export const FEATURE_CARDS: FeatureCard[] = [
  {
    title: 'Zero-Cost Creation',
    description:
      "The Raphael AI Image Generator is the world's first completely free AI image generator — no sign-up, no credit card, and unlimited free generations in the basic mode (without Fast Mode). Sign in for free daily credits and higher-resolution models up to 2K.",
  },
  {
    title: 'State-of-the-Art Quality',
    description:
      'Scene-aware intelligent routing in the Raphael AI Image Generator picks the best available model to deliver photorealistic images with exceptional detail and style control.',
  },
  {
    title: 'Advanced Text Understanding',
    description:
      'The Raphael AI Image Generator offers superior text-to-image capabilities with accurate interpretation of complex prompts and text overlay features.',
  },
  {
    title: 'Lightning-Fast Generation',
    description:
      'An optimized inference pipeline delivers images in seconds — around 8 seconds on the free Basic model — and lets you generate up to 4 at once. Paid plans get priority and skip the queue.',
  },
  {
    title: 'Enhanced Privacy Protection',
    description:
      'We follow a minimal data collection approach: guest requests are typically processed temporarily, while signed-in users retain only the information needed for account, history, subscription, and security features.',
  },
  {
    title: 'Multi-Style Support',
    description:
      'The Raphael AI Image Generator creates images across various artistic styles, from photorealistic to anime, oil paintings to digital art.',
  },
];

export const ADVANCED_TABS: AdvancedTab[] = [
  {
    id: 'speed',
    label: 'Lightning Fast Generation',
    title: 'Lightning Fast Generation',
    description:
      'The Raphael AI Image Generator renders fast — the free Basic model returns an image in about 8 seconds, and paid models skip the queue entirely. Generate up to 4 images per prompt for rapid prototyping and creative workflows, without compromising quality.',
    ctaLabel: 'Try Raphael AI',
    ctaHref: '/',
    imageSrc: '/imgs/feature108-1-v2.webp',
    imageAlt: 'AI generated art showcase',
  },
  {
    id: 'control',
    label: 'Precise Creative Control',
    title: 'Precise Creative Control',
    description:
      'Fine-tune every generation with reference images, aspect ratios, styles, and model selection. The Raphael AI Image Generator gives you the controls professionals need without the complexity.',
    ctaLabel: 'Try Raphael AI',
    ctaHref: '/',
    imageSrc: '/imgs/feature108-1-v2.webp',
    imageAlt: 'AI generated art showcase',
  },
  {
    id: 'style',
    label: 'Versatile Style Engine',
    title: 'Versatile Style Engine',
    description:
      'From photorealism to anime, product shots to concept art — switch styles instantly. Multi-model routing picks the best engine for the look you want.',
    ctaLabel: 'Try Raphael AI',
    ctaHref: '/',
    imageSrc: '/imgs/feature108-1-v2.webp',
    imageAlt: 'AI generated art showcase',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'I swapped the featured product in a tracking shot and the camera still followed the same path. Genjutsu kept the motion so the edit dropped straight into the cut.',
    name: 'Sophie Miller',
    role: 'Freelance Editor',
    avatarSrc: '/testimonials/david-liu.webp',
  },
  {
    quote:
      'Object Swap let us restage a product in a new scene without reshooting. Original timing stayed intact — that is the whole point of video-to-video.',
    name: 'Michael Chen',
    role: 'Creative Director',
    avatarSrc: '/testimonials/emma-zhang.webp',
  },
  {
    quote:
      'Pay-per-generation credits beat a monthly Higgsfield seat for our volume. We run a few Genjutsu jobs a week, not every day.',
    name: 'Sarah Wang',
    role: 'E-commerce Video Lead',
    avatarSrc: '/testimonials/kevin-wu.webp',
  },
  {
    quote:
      'Wardrobe tests used to mean another studio day. Now I upload the take, prompt the look, and keep the original blocking.',
    name: 'David Liu',
    role: 'Fashion Filmmaker',
    avatarSrc: '/testimonials/jessica-li.webp',
  },
  {
    quote:
      'Minutes, not overnight renders. I restyle products, styles, and scenes, download, and post. Motion transfer keeps it feeling like the same shot.',
    name: 'Emma Zhang',
    role: 'Short-form Creator',
    avatarSrc: '/testimonials/tom-anderson.webp',
  },
  {
    quote:
      'We use it for product previsualization: same camera move, different product treatment. Concept reviews got faster because the timing is already locked.',
    name: 'Kevin Wu',
    role: 'Game Cinematic Artist',
    avatarSrc: '/testimonials/nina-patel.webp',
  },
  {
    quote:
      'Credits are transparent enough for client billing. Each job is one clip, one prompt, one charge — no unused subscription sitting in the budget.',
    name: 'Jessica Li',
    role: 'Agency Producer',
    avatarSrc: '/testimonials/sophie-miller.webp',
  },
  {
    quote:
      'Scene swap on a locked tracking shot sold the location change. We still had to grade, but we did not have to recast or rebuild the move.',
    name: 'Tom Anderson',
    role: 'Ad Creative Director',
    avatarSrc: '/testimonials/michael-chen.webp',
  },
  {
    quote:
      'I pick 720p for drafts and 1080p for finals. Paying only for seconds of input video is easier to explain than a studio plan.',
    name: 'Nina Patel',
    role: 'Indie Filmmaker',
    avatarSrc: '/testimonials/sarah-wang.webp',
  },
];

export const YEARLY_PLANS: PricingPlan[] = [
  {
    name: 'Pro',
    ctaLabel: 'Upgrade to Pro',
    ctaHref: '/pricing',
    priceLabel: '$10',
    features: [
      '2,000 credits per month',
      'Up to 2,000 fast images',
      'Up to 250 basic videos',
      'Unlimited Seedream 3.5 generations',
      'Priority queue',
      'No watermarks',
      'Batch AI image upscaling',
    ],
  },
  {
    name: 'Ultimate',
    ctaLabel: 'Upgrade to Ultimate',
    ctaHref: '/pricing',
    featured: true,
    priceLabel: '$20',
    features: [
      '5,000 credits per month',
      'Up to 5,000 fast images',
      'Up to 625 basic videos',
      'Unlimited Seedream 3.5 generations',
      'Highest priority queue',
      'No watermarks',
      'Batch AI image upscaling',
      'Full privacy',
    ],
  },
  {
    name: 'Max',
    ctaLabel: 'Upgrade to Max',
    ctaHref: '/pricing',
    priceLabel: '$40',
    features: [
      '10,000 credits per month',
      'Up to 10,000 fast images',
      'Up to 1,250 basic videos',
      'Unlimited Seedream 3.5 generations',
      'Highest priority queue',
      'No watermarks',
      'Batch AI image upscaling',
      'Full privacy',
    ],
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is Raphael AI and how does it work?',
    answer:
      'Raphael AI Image Generator is a completely free AI image generator powered by an intelligent multi-model routing system. It lets you create high-quality images from text descriptions with no registration and no generation count limits.',
  },
  {
    question: 'Is Raphael AI really free to use?',
    answer:
      "Yes, Raphael AI Image Generator is completely free to use! We are committed to being the world's largest and most powerful free AI Image Generator. There are no hidden fees, no credit card required, and no generation count limits.",
  },
  {
    question: 'What makes Raphael AI different from other AI image generators?',
    answer:
      'Raphael AI Image Generator offers free access to an intelligent multi-model router with no generation count limits. We provide superior image quality, fast generation speed and complete privacy protection with no cost or registration requirements.',
  },
  {
    question: 'Do I need to create an account to use Raphael AI?',
    answer:
      'No account needed — the Raphael AI Image Generator lets you visit raphael.app and start generating images immediately. We believe in making AI accessible to everyone without barriers.',
  },
  {
    question: 'What types of images can I create with Raphael AI?',
    answer:
      'The Raphael AI Image Generator lets you create a wide variety of images including photorealistic scenes, artistic illustrations, digital art, anime-style images and more. Our intelligent router picks the best model for each prompt to handle complex instructions and deliver diverse visual styles.',
  },
  {
    question: 'How does Raphael AI protect my privacy?',
    answer:
      'We follow a minimal data collection approach: requests from users who are not signed in are typically processed temporarily, while signed-in users retain only the information needed for account features, history, subscriptions, and security protections.',
  },
  {
    question: 'Are there any limitations to using Raphael AI?',
    answer:
      'While Raphael AI is free and has no generation count limits, we maintain standard content guidelines to ensure appropriate use. The platform is designed for web use currently, with mobile apps planned for the future.',
  },
  {
    question: 'Can I use the generated images commercially?',
    answer:
      'Yes, you own the rights to the images you generate with Raphael AI. You can use them for both personal and commercial purposes, making it perfect for creators and businesses alike.',
  },
  {
    question: 'Is Raphael AI available on mobile devices?',
    answer:
      "Currently, Raphael AI is available through our website at raphael.app, which works great on mobile browsers. We're actively developing dedicated mobile apps to provide an even better experience soon.",
  },
  {
    question: 'How can I provide feedback or report issues?',
    answer:
      'We welcome your feedback! You can reach our support team at support@genjutsuai.net.',
  },
  {
    question: 'What AI models does Raphael AI support?',
    answer:
      'Raphael AI supports the following image and video models. Image models: Nano Banana 2 Lite, Nano Banana, Nano Banana Pro, Nano Banana 2, GPT Image 2, Seedream 5.0 Lite, Seedream 5.0 Pro, Seedream 4.5, Seedream 4.0, Seedream 3.5 Pro. Video models: Seedance 2.0, Seedance 2.0 Mini, Seedance 1.5 Pro, Seedance 1.0 Pro Fast, Veo 3.1, Kling 3.0, Kling 3.0 Turbo, Seedance 1.0 Turbo.',
  },
  {
    question: 'What is a free AI image generator?',
    answer:
      'A free AI image generator is a tool that turns a text prompt into images at no cost. Raphael AI lets you generate images straight from your browser with no sign-up and no credit card. Better still, signed-in users get truly unlimited free generations in the basic mode (without Fast Mode) — you only wait briefly in a short queue. Use your free daily credits to skip the queue or unlock higher-resolution models.',
  },
  {
    question: 'How does AI generate images from text?',
    answer:
      "You type a description (a 'prompt'), and the AI model interprets the words, objects, style and composition you asked for and renders a matching image. Raphael AI routes your prompt to models like Seedream 3.5, Seedream and Nano Banana, then returns the result in seconds. The more specific your prompt, the closer the result.",
  },
  {
    question: 'Is it legal to use AI-generated images?',
    answer:
      'Yes. Using AI to generate images is legal in most countries. With Raphael AI you own the rights to the images you create and can use them for personal projects. Commercial use is available on paid plans, subject to our Terms of Service and applicable law. Always check local regulations for your specific use case.',
  },
  {
    question: 'Is Raphael AI safe and private to use?',
    answer:
      'Yes. We follow a minimal data-collection approach: requests from users who are not signed in are processed temporarily and are not saved to history. Signed-in users keep only the data needed for account features, history and security. We never sell your prompts or images.',
  },
  {
    question: 'Can I use AI-generated images commercially?',
    answer:
      'Paid-plan users can use their generated images for commercial purposes, subject to our Terms of Service and applicable law. Free users may use images for personal and other non-commercial purposes. You retain ownership of the images you generate.',
  },
  {
    question: 'What is the best free AI image generator?',
    answer:
      'The best free AI image generator is the one that combines image quality, speed and no paywall. Raphael AI is built to be a genuinely free option: the Seedream 3.5 model costs zero credits, there is no sign-up requirement to start, and signed-in users get truly unlimited free generations in the basic mode (without Fast Mode) — you only wait in a short queue. Free daily credits and paid plans let you skip the queue and access multiple models including Seedream and Nano Banana for sharper results.',
  },
  {
    question: 'What is a no-restrictions AI image generator?',
    answer:
      'A no-restrictions AI image generator removes barriers such as forced sign-up, credit cards and generation limits from the basic experience. With Raphael AI you can start generating immediately in your browser — no account and no credit card to start. Once you sign in, the basic mode (without Fast Mode) gives you unlimited free generations; you only wait briefly in a queue. Want to skip the queue or use higher-resolution models? Use your free daily credits or a paid plan. We still apply standard content guidelines for safe and lawful use.',
  },
  {
    question: "Does 'no restrictions' mean lower image quality?",
    answer:
      "No. Fewer barriers to access does not mean weaker output. Raphael AI's free Basic model renders fast, and signed-in users can switch to higher-resolution models such as Seedream 4.5/5.0 (up to 2K) and Nano Banana Pro for premium detail. You choose the model that fits each task, free or paid.",
  },
];

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'About',
    links: [
      { label: 'Features', href: '/#feature' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Partners', href: '/partners' },
    ],
  },
  {
    title: 'Tools',
    links: [
      {
        label: 'Hotel Lobby AI',
        href: '/hotel-lobby-ai',
      },
      {
        label: 'Chuttamalle AI',
        href: '/chuttamalle-ai',
      },
      {
        label: 'Person Remover',
        href: 'https://personremover.org',
      },
      {
        label: 'Video Text Remover',
        href: 'https://videotextremover.org',
      },
    ],
  },
];

export const EXAMPLE_IMAGES = Array.from({ length: 16 }, (_, i) => ({
  src: `/example-images/${i + 1}.webp`,
  alt: `Example ${i + 1}`,
}));

/** Text-to-image app page — https://raphael.app/app/image/text-to-image */
export const TEXT_TO_IMAGE_BADGES = [
  'Text to Image',
  'Multi-Model',
  'Custom Ratios',
  'HD Output',
] as const;

export const TEXT_TO_IMAGE_POPULAR_MODELS: ModelCard[] = [
  {
    name: 'GPT Image 2',
    description: 'Precise prompts, clean text, product shots.',
    href: '/gpt-image-2',
    iconSrc: '/images/logos/image-models/openai.svg',
    coverSrc: '/images/model-guides/gpt-image-2.webp',
  },
  {
    name: '🍌Nano Banana 2',
    description: 'Multi-reference edits with fast style control.',
    href: '/nano-banana-2',
    coverSrc: '/images/model-guides/nano-banana-2.webp',
  },
  {
    name: 'Seedream 5.0',
    description: 'Cinematic realism and dramatic lighting.',
    href: '/seedream-5',
    iconSrc: '/images/logos/image-models/seedream.svg',
    coverSrc: '/images/model-guides/seedream-5.webp',
  },
  {
    name: 'Seedream 3.5 Pro',
    description: 'Consistent portraits and brand visuals.',
    href: '/raphael-image-model',
    iconSrc: '/images/logos/image-models/seedream.svg',
    coverSrc: '/images/model-guides/seedream-3-5-pro.webp',
  },
];

export const TEXT_TO_IMAGE_FEATURES: FeatureCard[] = [
  {
    title: 'Write a thought, get a finished image',
    description:
      'No prompt-engineering manuals or advanced parameter tuning. Describe the subject, scene, style, lighting, and mood; this free AI image generator fills in the details and returns multiple candidate images at once. Unlimited basic generation is included — no membership or payment up front.',
  },
  {
    title: 'One prompt, multiple model directions in parallel',
    description:
      'This page highlights popular models such as GPT Image 2, Nano Banana 2, Seedream 5.0, and Seedream 3.5 Pro. Each model has different strengths, such as in-image text, reference-based editing, photoreal lighting, or portrait consistency.',
  },
  {
    title: 'Readable text, baked into the image',
    description:
      'Add text to image through your prompt — poster headlines, e-commerce main-image taglines, menu prices, or product packaging copy. GPT Image 2, the OpenAI text-to-image model in the ChatGPT and DALL·E lineage, handles in-image text reliably; refine complex layouts with image-to-image.',
  },
  {
    title: 'From photoreal portraits to infographics, all in one generator',
    description:
      'Create cinematic portraits, e-commerce hero shots, social covers, slide-deck visuals, flowcharts, and infographics with one free AI image generator from text. Switch model, change aspect ratio, or restyle with image-to-image in the same panel — without jumping to Photoshop, Figma, or Canva.',
  },
];

export const TEXT_TO_IMAGE_EXPLORE = [
  {
    title: 'Image to Image',
    description:
      'Upload a reference and restyle materials, lighting, or background while keeping composition.',
    href: '/image-to-image',
  },
  {
    title: 'Text to Video',
    description:
      'Generate cinematic short clips with native audio from your prompt.',
    href: '/text-to-video',
  },
  {
    title: 'Image to Video',
    description:
      'Bring any still image to motion, voice, and sound in seconds.',
    href: '/image-to-video',
  },
] as const;

export const TEXT_TO_IMAGE_FAQS: FaqItem[] = [
  {
    question: 'What is AI text-to-image?',
    answer:
      'AI text-to-image turns a written prompt into an image. Describe the subject, style, lighting, composition, and use case, and Raphael AI will generate results with the model that fits the request.',
  },
  {
    question: 'What makes Raphael AI text-to-image different?',
    answer:
      'Raphael AI is not tied to a single model. GPT Image 2, Nano Banana 2, Seedream 5.0, Seedream 3.5 Pro, and other image models are available in one generator, so you can choose the best model for each scene.',
  },
  {
    question: 'Which AI image models are supported?',
    answer:
      'This page highlights popular models such as GPT Image 2, Nano Banana 2, Seedream 5.0, and Seedream 3.5 Pro. Each model has different strengths, such as in-image text, reference-based editing, photoreal lighting, or portrait consistency.',
  },
  {
    question: 'What is the difference between free and paid users?',
    answer:
      'Free users can try generation, but outputs include a watermark and are mainly for preview and personal testing. Paid users unlock higher quality, faster generation, larger model quotas, watermark-free outputs, and commercial usage rights.',
  },
  {
    question: 'Can I use generated images commercially?',
    answer:
      'Paid users can use watermark-free generated images for commercial projects such as ads, e-commerce, social posts, presentations, and client work. Free watermarked outputs are for trial and preview only and are not licensed for commercial publishing. In all cases, you are responsible for making sure prompts, uploads, and outputs respect copyright, likeness rights, and platform content rules.',
  },
  {
    question: 'How do I write a better image prompt?',
    answer:
      'Describe the subject, action, scene, style, camera, lighting, aspect ratio, and intended use. For complex visuals, start with the main image first, then use image-to-image or regeneration to refine details.',
  },
  {
    question: 'What aspect ratios and resolutions are supported?',
    answer:
      'Raphael AI supports common square, portrait, and landscape ratios. Available resolution, image count, and quality options depend on the selected model and plan, and the generator shows the choices currently available.',
  },
  {
    question: 'Can I keep editing after generation?',
    answer:
      'Yes. You can continue with image-to-image, regenerate with another model, download the result, or send the image into an image-to-video workflow.',
  },
];

export type WorkspaceBadge = 'NEW' | '-30%' | '-50%';

export type WorkspaceTool = {
  id: string;
  label: string;
  href: string;
  icon:
    | 'type'
    | 'image-plus'
    | 'file-video'
    | 'clapperboard'
    | 'layout-grid'
    | 'expand'
    | 'eraser'
    | 'upscaler'
    | 'boxes'
    | 'mic';
  badge?: WorkspaceBadge;
  external?: boolean;
};

export type WorkspaceModel = {
  id: string;
  label: string;
  href: string;
  emoji?: string;
  logo?: string;
  badge?: WorkspaceBadge;
};

export type WorkspaceCategory = {
  id: string;
  label: string;
  href: string;
  icon: 'image' | 'video' | 'sparkles' | 'wrench' | 'boxes';
  children?: WorkspaceTool[];
  /** When true, render Image Models / Video Models sections instead of children */
  modelSections?: boolean;
};

export const WORKSPACE_NAV = {
  createHref: '/app',
  categories: [
    {
      id: 'image',
      label: 'AI Image',
      href: '/ai-image-generator',
      icon: 'image',
      children: [
        {
          id: 'text-to-image',
          label: 'Text to Image',
          href: '/text-to-image',
          icon: 'type',
        },
        {
          id: 'image-to-image',
          label: 'Image to Image',
          href: '/image-to-image',
          icon: 'image-plus',
        },
      ],
    },
    {
      id: 'video',
      label: 'AI Video',
      href: '/ai-video-generator',
      icon: 'video',
      children: [
        {
          id: 'text-to-video',
          label: 'Text to Video',
          href: '/text-to-video',
          icon: 'file-video',
        },
        {
          id: 'image-to-video',
          label: 'Image to Video',
          href: '/image-to-video',
          icon: 'clapperboard',
        },
      ],
    },
    {
      id: 'image-edit',
      label: 'AI Image Edit',
      href: '/ai-image-editor',
      icon: 'sparkles',
      children: [
        {
          id: 'templates',
          label: 'Image Templates',
          href: '/app/image/templates',
          icon: 'layout-grid',
        },
        {
          id: 'uncrop',
          label: 'Image Expand',
          href: '/uncrop',
          icon: 'expand',
        },
        {
          id: 'background-remover',
          label: 'Remove Background',
          href: '/background-remover',
          icon: 'eraser',
        },
        {
          id: 'image-upscaler',
          label: 'Image Upscaler',
          href: '/image-upscaler',
          icon: 'upscaler',
          badge: 'NEW',
        },
      ],
    },
    {
      id: 'tools',
      label: 'AI Tools',
      href: '#',
      icon: 'wrench',
      children: [
        {
          id: 'fast3d',
          label: 'AI 3D Model Generator',
          href: 'https://fast3d.io',
          icon: 'boxes',
          external: true,
        },
        {
          id: 'anyvoice',
          label: 'AI Voice Cloning',
          href: 'https://anyvoice.net',
          icon: 'mic',
          external: true,
        },
        {
          id: 'fameo',
          label: 'AI Lip Sync Video',
          href: 'https://fameo.ai',
          icon: 'clapperboard',
          external: true,
        },
      ],
    },
    {
      id: 'models',
      label: 'AI Models',
      href: '/ai-models',
      icon: 'boxes',
      modelSections: true,
    },
  ] satisfies WorkspaceCategory[],
  imageModels: [
    {
      id: 'nano-banana-2-lite',
      label: 'Nano Banana 2 Lite',
      href: '/nano-banana-2-lite',
      emoji: '🍌',
      badge: 'NEW',
    },
    {
      id: 'gpt-image-2',
      label: 'GPT Image 2',
      href: '/gpt-image-2',
      logo: '/images/logos/image-models/openai.svg',
    },
    {
      id: 'nano-banana-2',
      label: 'Nano Banana 2',
      href: '/nano-banana-2',
      emoji: '🍌',
    },
    {
      id: 'seedream-5-pro',
      label: 'Seedream 5.0 Pro',
      href: '/seedream-5-pro',
      logo: '/images/logos/image-models/seedream.svg',
      badge: '-30%',
    },
    {
      id: 'seedream-5',
      label: 'Seedream 5.0 Lite',
      href: '/seedream-5',
      logo: '/images/logos/image-models/seedream.svg',
    },
    {
      id: 'seedream-4-5',
      label: 'Seedream 4.5',
      href: '/seedream-4-5',
      logo: '/images/logos/image-models/seedream.svg',
    },
    {
      id: 'seedream-4',
      label: 'Seedream 4.0',
      href: '/seedream-4',
      logo: '/images/logos/image-models/seedream.svg',
    },
    {
      id: 'nano-banana-pro',
      label: 'Nano Banana Pro',
      href: '/nano-banana-pro',
      emoji: '🍌',
    },
    {
      id: 'nano-banana',
      label: 'Nano Banana',
      href: '/nano-banana',
      emoji: '🍌',
    },
    {
      id: 'raphael-image-model',
      label: 'Seedream 3.5 Pro',
      href: '/raphael-image-model',
      logo: '/images/logos/image-models/seedream.svg',
    },
  ] satisfies WorkspaceModel[],
  videoModels: [
    {
      id: 'seedance-2-mini',
      label: 'Seedance 2.0 Mini',
      href: '/seedance-2-mini',
      logo: '/images/logos/video-models/seedance.svg',
      badge: 'NEW',
    },
    {
      id: 'seedance-1-5',
      label: 'Seedance 1.5 Pro',
      href: '/seedance-1-5',
      logo: '/images/logos/video-models/seedance.svg',
    },
    {
      id: 'seedance-1',
      label: 'Seedance 1.0 Pro Fast',
      href: '/seedance-1',
      logo: '/images/logos/video-models/seedance.svg',
    },
    {
      id: 'seedance-2',
      label: 'Seedance 2.0',
      href: '/seedance-2',
      logo: '/images/logos/video-models/seedance.svg',
    },
    {
      id: 'veo-3-1',
      label: 'Veo 3.1',
      href: '/veo-3-1',
      logo: '/images/logos/video-models/google-g.svg',
    },
    {
      id: 'kling-3-turbo',
      label: 'Kling 3.0 Turbo',
      href: '/kling-3-turbo',
      logo: '/images/logos/video-models/kling-official.png',
      badge: 'NEW',
    },
    {
      id: 'kling-3',
      label: 'Kling 3.0',
      href: '/kling-3',
      logo: '/images/logos/video-models/kling-official.png',
    },
    {
      id: 'raphael-video-pro',
      label: 'Seedance 1.0 Turbo',
      href: '/raphael-video-pro',
      logo: '/images/logos/video-models/seedance.svg',
    },
  ] satisfies WorkspaceModel[],
} as const;

export const GENJUTSU_HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Upload the original clip',
    description:
      'Drop in the video whose motion, camera path, and timing you want to keep.',
  },
  {
    step: '2',
    title: 'Describe the result',
    description:
      'Write what should change — scene, style, product, or prop. Keep the original subject.',
  },
  {
    step: '3',
    title: 'The model restyles the shot',
    description:
      'Genjutsu restyles the world around the subject while preserving the original movement and shot timing.',
  },
] as const;

export const GENJUTSU_CHANGE_ITEMS = [
  {
    title: 'Products',
    description:
      'Replace a featured product while preserving the original camera move, framing, and timing.',
  },
  {
    title: 'Styles',
    description:
      'Keep the same subject — restyle the look: anime, cinematic, vintage, or material treatments.',
  },
  {
    title: 'Scenes',
    description:
      'Restage the location around a locked camera move: interior to alley, day to night, studio to street.',
  },
  {
    title: 'Props',
    description:
      'Swap an object in frame (cup, vase, package) without rebuilding the take or changing the subject.',
  },
] as const;

export const GENJUTSU_CHANGE_EXAMPLES = [
  'Same subject, new scene: turn a bright studio into a rainy Tokyo alley while keeping the original camera move.',
  'Same subject, new era: restage a modern living room as a 1980s neon lounge without changing who is in frame.',
  'Object replacement: swap a coffee cup on the table for a ceramic vase; keep the camera path.',
  'Object replacement: replace a modern car in a tracking shot with a vintage motorcycle.',
  'Style without identity change: restyle the clip as anime illustration while keeping the same subject and timing.',
  'Style without identity change: apply a cinematic film-look grade and keep the original performance locked.',
] as const;

export const GENJUTSU_HOWTO_STEPS = [
  {
    step: '1',
    title: 'Upload your clip',
    description:
      'Use the upload box in the generator. This is the source of motion — camera move and duration stay with this file.',
  },
  {
    step: '2',
    title: 'Pick Motion Transfer or Objects Swap',
    description:
      'Motion Transfer preserves the source motion while restaging scenes, styles, products, or props around the same subject. Objects Swap targets specific objects in the frame.',
  },
  {
    step: '3',
    title: 'Write the result you want',
    description:
      'Prompt the new scene, style, product, or object. Be specific about what changes and that the original subject must stay.',
  },
  {
    step: '4',
    title: 'Choose resolution and generate',
    description:
      'Select 480p, 720p, or 1080p. Credits are reserved from a server-side estimate before the job starts.',
  },
  {
    step: '5',
    title: 'Download the rewritten video',
    description:
      'When the task finishes, download the new clip. Timing should match the original take.',
  },
] as const;

export const GENJUTSU_PROMPT_IDEAS = [
  {
    title: 'Product swap on a tracking shot',
    prompt:
      'Replace the plain bottle with a premium glass bottle. Keep the original tracking motion and camera path.',
  },
  {
    title: 'Same subject, cyberpunk street',
    prompt:
      'Keep the same subject. Change the daytime street to a cyberpunk night with neon signs. Preserve handheld camera movement and timing.',
  },
  {
    title: 'Night alley restage',
    prompt:
      'Keep the same subject. Change the living room to a rainy Tokyo alley at night. Preserve framing and head turns.',
  },
  {
    title: 'Cup to vase on the table',
    prompt:
      'Replace the coffee cup on the table with a glowing crystal orb. Do not change the subject or camera path.',
  },
  {
    title: 'Package restyle',
    prompt:
      'Restyle the product packaging with an anime-inspired illustration. Keep the original cut timing.',
  },
  {
    title: 'Empty landscape background',
    prompt:
      'Keep the same subject. Replace the busy background with empty snowy mountains. Keep the original tracking shot.',
  },
  {
    title: '1980s era restage',
    prompt:
      'Keep the same subject. Restage the modern interior as a 1980s neon lounge. Change era and décor only.',
  },
  {
    title: 'Vehicle swap',
    prompt:
      'Replace the car with a vintage motorcycle. Keep the tracking shot and speed. Do not alter any subjects in frame.',
  },
  {
    title: 'Anime filter',
    prompt:
      'Restyle the clip as anime illustration. Keep the same subject and motion — change only the art style.',
  },
  {
    title: 'Cinematic filter',
    prompt:
      'Apply a cinematic film look. Do not change who or what is in the shot; keep the original timing.',
  },
  {
    title: 'Vintage film filter',
    prompt:
      'Give the clip a vintage film grade with light grain. Preserve the original subject and camera path.',
  },
  {
    title: 'Watercolor material',
    prompt:
      'Restyle surfaces as watercolor. Keep the same subject, objects, and motion path.',
  },
  {
    title: 'Mannequin wardrobe restyle',
    prompt:
      'Replace a plain jacket on a mannequin with a tailored evening jacket. Keep the original camera move; do not change the mannequin identity.',
  },
  {
    title: 'Day to night scene',
    prompt:
      'Keep the same subject. Turn a sunny park into a moonlit night scene. Preserve the original walk cycle and framing.',
  },
  {
    title: 'Clay material look',
    prompt:
      'Restyle the scene with clay stop-motion materials. Keep the same subject and original timing.',
  },
] as const;

export const GENJUTSU_VS_ROWS = [
  {
    label: 'How you pay',
    ours: 'Prepaid credits, pay per generation',
    official: 'Subscription plans on Higgsfield',
  },
  {
    label: 'What you get',
    ours: 'Focused Genjutsu video-to-video (motion transfer and object swap)',
    official: 'Full Higgsfield product surface, including Genjutsu',
  },
  {
    label: 'Best when',
    ours: 'You need a few clips and do not want a monthly seat',
    official: 'You already use Higgsfield across multiple tools every month',
  },
  {
    label: 'Model',
    ours: 'Higgsfield Genjutsu, billed through this site',
    official: 'The same Genjutsu model in the official Higgsfield app',
  },
] as const;

export const GENJUTSU_FAQS: FaqItem[] = [
  {
    question: 'What is Genjutsu AI?',
    answer:
      'Genjutsu is a Higgsfield video-to-video model. This site uses it to restyle scenes, styles, products, and props around the same subject while keeping the original camera movement and timing — without changing who or what is in the shot.',
  },
  {
    question: 'Does Genjutsu AI support face swapping?',
    answer:
      'No. Genjutsu AI does not support face swapping or identity replacement. If a reference image contains a real human face, it is rejected before generation. Anime, cartoon, illustration, and 3D characters are allowed. See our Terms of Service (/terms-of-service) for prohibited categories, detection, reporting, and enforcement.',
  },
  {
    question: 'How is this different from text-to-video?',
    answer:
      'You start with a real take. The model does not invent a new camera path from a prompt alone. It transfers or preserves the motion already in the file you upload.',
  },
  {
    question: 'What can I change in a clip?',
    answer:
      'Scenes, styles, products, and props. Aim for a full environment restage, a style filter, or a local object swap — while keeping the original subject intact.',
  },
  {
    question: 'Do I need a Higgsfield subscription?',
    answer:
      'No. This site sells prepaid credit packs and charges per generation. The official Higgsfield product is subscription-based if you prefer to work there instead.',
  },
  {
    question: 'How are credits calculated?',
    answer:
      'Each job is estimated from the provider cost for your input duration and resolution. Input length is rounded up to the next whole second. The exact credit reserve is calculated on the server before generation starts.',
  },
  {
    question: 'How long does a generation take?',
    answer:
      'Typical jobs finish in minutes, depending on clip length, resolution, and queue. You can leave the page and check status; the task is tracked on the server.',
  },
  {
    question: 'Which resolutions are available?',
    answer:
      '480p, 720p, and 1080p. Higher resolution costs more credits because the provider charges more per second of input video.',
  },
  {
    question: 'Can I use the output commercially?',
    answer:
      'You may use generated videos subject to our Terms of Service, Higgsfield usage rules, and applicable law. Do not upload footage you do not have rights to edit.',
  },
];
