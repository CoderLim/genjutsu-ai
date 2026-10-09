export const AUTH_SECRET_PLACEHOLDER =
  'shipany-dev-secret-change-in-production';

// Isomorphic env access:
// - Public (client-visible) vars are VITE_-prefixed and read from
//   import.meta.env (statically injected into the client bundle by Vite).
// - Server-only vars (secrets) are read from process.env and resolve to ''
//   in the browser — they never reach the client bundle.
const metaEnv: Record<string, string | undefined> =
  (import.meta as any).env ?? {};
const procEnv: Record<string, string | undefined> =
  typeof process !== 'undefined' && process.env ? process.env : {};

const publicEnv = (key: string) => metaEnv[key] ?? procEnv[key];

export const envConfigs: Record<string, string> = {
  // App (public)
  app_url: publicEnv('VITE_APP_URL') ?? 'http://localhost:3000',
  app_name: publicEnv('VITE_APP_NAME') ?? 'Genjutsu AI',
  app_description:
    publicEnv('VITE_APP_DESCRIPTION') ??
    'Genjutsu AI restyles any video without changing who or what is in it — new scenes, styles, and objects while keeping the original motion.',
  app_logo: publicEnv('VITE_APP_LOGO') ?? '/logo.webp',
  app_support_email:
    publicEnv('VITE_APP_SUPPORT_EMAIL') ?? 'support@genjutsuai.net',
  hotel_lobby_example_video_url:
    publicEnv('VITE_HOTEL_LOBBY_EXAMPLE_VIDEO_URL') ?? '',
  hotel_lobby_example_thumbnail_url:
    publicEnv('VITE_HOTEL_LOBBY_EXAMPLE_THUMBNAIL_URL') ?? '',
  hotel_lobby_example_upload_date:
    publicEnv('VITE_HOTEL_LOBBY_EXAMPLE_UPLOAD_DATE') ?? '',
  hotel_lobby_example_duration:
    publicEnv('VITE_HOTEL_LOBBY_EXAMPLE_DURATION') ?? '',

  // Database
  database_url: procEnv.DATABASE_URL ?? '',
  database_auth_token: procEnv.DATABASE_AUTH_TOKEN ?? '',
  database_provider: procEnv.DATABASE_PROVIDER ?? 'sqlite',
  db_schema: procEnv.DB_SCHEMA ?? 'public',
  db_singleton_enabled: procEnv.DB_SINGLETON_ENABLED ?? 'false',
  db_max_connections: procEnv.DB_MAX_CONNECTIONS ?? '1',

  // Auth
  auth_url: procEnv.AUTH_URL ?? publicEnv('VITE_APP_URL') ?? '',
  auth_secret: procEnv.AUTH_SECRET ?? '',

  // Payment - Stripe
  stripe_secret_key: procEnv.STRIPE_SECRET_KEY ?? '',
  stripe_publishable_key: procEnv.STRIPE_PUBLISHABLE_KEY ?? '',
  stripe_signing_secret: procEnv.STRIPE_SIGNING_SECRET ?? '',

  // Payment - Waffo Pancake
  waffo_enabled: procEnv.WAFFO_ENABLED ?? '',
  waffo_merchant_id: procEnv.WAFFO_MERCHANT_ID ?? '',
  waffo_private_key: procEnv.WAFFO_PRIVATE_KEY ?? '',
  waffo_store_id: procEnv.WAFFO_STORE_ID ?? '',
  waffo_environment: procEnv.WAFFO_ENVIRONMENT ?? 'test',
  waffo_product_ids_mapping: procEnv.WAFFO_PRODUCT_IDS_MAPPING ?? '',
  default_payment_provider: procEnv.DEFAULT_PAYMENT_PROVIDER ?? '',

  // Payment - PayPal
  paypal_client_id: procEnv.PAYPAL_CLIENT_ID ?? '',
  paypal_client_secret: procEnv.PAYPAL_CLIENT_SECRET ?? '',
  paypal_webhook_id: procEnv.PAYPAL_WEBHOOK_ID ?? '',
  paypal_environment: procEnv.PAYPAL_ENVIRONMENT ?? 'production',

  // Payment - Alipay
  alipay_app_id: procEnv.ALIPAY_APP_ID ?? '',
  alipay_private_key: procEnv.ALIPAY_PRIVATE_KEY ?? '',
  alipay_public_key: procEnv.ALIPAY_PUBLIC_KEY ?? '',
  alipay_notify_url: procEnv.ALIPAY_NOTIFY_URL ?? '',

  // Payment - WeChat Pay
  wechat_app_id: procEnv.WECHAT_APP_ID ?? '',
  wechat_mch_id: procEnv.WECHAT_MCH_ID ?? '',
  wechat_api_v3_key: procEnv.WECHAT_API_V3_KEY ?? '',
  wechat_private_key: procEnv.WECHAT_PRIVATE_KEY ?? '',
  wechat_serial_no: procEnv.WECHAT_SERIAL_NO ?? '',
  wechat_notify_url: procEnv.WECHAT_NOTIFY_URL ?? '',
  wechat_platform_cert: procEnv.WECHAT_PLATFORM_CERT ?? '',

  // Email - Resend
  resend_api_key: procEnv.RESEND_API_KEY ?? '',
  resend_sender_email:
    procEnv.RESEND_SENDER_EMAIL ?? procEnv.RESEND_EMAIL_FROM ?? '',

  // Storage - S3/R2
  storage_endpoint: procEnv.STORAGE_ENDPOINT ?? '',
  storage_region: procEnv.STORAGE_REGION ?? 'auto',
  storage_access_key: procEnv.STORAGE_ACCESS_KEY ?? '',
  storage_secret_key: procEnv.STORAGE_SECRET_KEY ?? '',
  storage_bucket: procEnv.STORAGE_BUCKET ?? '',
  storage_public_domain: procEnv.STORAGE_PUBLIC_DOMAIN ?? '',
  inline_image_max_kb: procEnv.INLINE_IMAGE_MAX_KB ?? '2048',

  // AI
  // OpenAI / Anthropic are admin-panel-only (like Gemini/Fal). No env fallback:
  // OPENAI_API_KEY / ANTHROPIC_API_KEY are common ambient vars, and falling back
  // to them would let the admin "Test" silently pass on the machine's own key.
  replicate_api_token: procEnv.REPLICATE_API_TOKEN ?? '',
  fal_api_key: procEnv.FAL_KEY ?? '',

  // Higgsfield (server-only)
  higgsfield_api_key:
    procEnv.HF_API_KEY ??
    procEnv.HIGGSFIELD_API_KEY ??
    procEnv.HF_CREDENTIALS ??
    '',
  higgsfield_api_base_url:
    procEnv.HF_API_BASE_URL ?? 'https://api.higgsfield.ai',
  higgsfield_genjutsu_motion_model:
    procEnv.HIGGSFIELD_GENJUTSU_MOTION_MODEL ??
    'higgsfield/genjutsu/motion-transfer/v1.0',
  higgsfield_genjutsu_object_swap_model:
    procEnv.HIGGSFIELD_GENJUTSU_OBJECT_SWAP_MODEL ??
    'higgsfield/genjutsu/object-swap/v1.0',

  // Genjutsu workflow routing. Keep Higgsfield as the safe default; Seedance
  // can be enabled independently per workflow for controlled rollout/A-B tests.
  genjutsu_motion_provider: procEnv.GENJUTSU_MOTION_PROVIDER ?? 'higgsfield',
  genjutsu_object_swap_provider:
    procEnv.GENJUTSU_OBJECT_SWAP_PROVIDER ?? 'higgsfield',
  seedance_genjutsu_model:
    procEnv.SEEDANCE_GENJUTSU_MODEL ??
    'bytedance/seedance-2.5/us/reference-to-video',
  seedance_genjutsu_generate_audio:
    procEnv.SEEDANCE_GENJUTSU_GENERATE_AUDIO ?? 'true',

  // Volcengine Ark Seedance 2.5 (server-only). Keep fal Seedance as a
  // distinct provider identity so historical tasks always poll the backend
  // that originally created them.
  ark_api_key: procEnv.ARK_API_KEY ?? '',
  ark_api_base_url:
    procEnv.ARK_API_BASE_URL ?? 'https://ark.cn-beijing.volces.com/api/v3',
  seedance_volcengine_model:
    procEnv.SEEDANCE_VOLCENGINE_MODEL ?? 'doubao-seedance-2-5-260628',
  seedance_volcengine_video_input_rate_cny_per_million_tokens:
    procEnv.SEEDANCE_VOLCENGINE_VIDEO_INPUT_RATE_CNY_PER_MILLION_TOKENS ?? '42',
  seedance_volcengine_cny_per_usd:
    procEnv.SEEDANCE_VOLCENGINE_CNY_PER_USD ?? '7',

  genjutsu_e2e_mock: procEnv.GENJUTSU_E2E_MOCK ?? 'false',

  // Hotel Lobby preset (server-only). Store the licensed/default template in R2
  // under this key; the page can still replace it with a user-uploaded clip.
  hotel_lobby_template_video_key:
    procEnv.HOTEL_LOBBY_TEMPLATE_VIDEO_KEY ??
    'hotel-lobby/templates/default.mp4',

  // AI Zombie Hug preset (server-only). Shared motion-transfer source clip in R2.
  zombie_hug_template_video_key:
    procEnv.ZOMBIE_HUG_TEMPLATE_VIDEO_KEY ??
    'genjutsu/templates/zombie-hug.mp4',

  // Locale (public)
  locale: publicEnv('VITE_DEFAULT_LOCALE') ?? 'en',
};
