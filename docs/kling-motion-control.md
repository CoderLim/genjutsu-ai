# Kling Motion Control test integration

This integration is intentionally isolated from the production Genjutsu generation flow.

## Test page

Open `/admin/kling-motion-control` while signed in as an admin.

The page follows the Genjutsu generator interaction pattern:

1. Upload one reference image.
2. Upload one motion reference video.
3. Select Kling model, quality mode, and character orientation.
4. Optionally enter a prompt and choose original-sound behavior.
5. Generate, then poll the Kling task until it succeeds or fails.

The test page does **not** use Genjutsu credits, checkout, billing reservation, `aiTask` generation records, or the existing `/api/genjutsu/*` routes.

## Server configuration

Add the Kling API key as a server-only environment variable:

```bash
KLING_API_KEY=your_kling_api_key
```

Optional override for the API host:

```bash
KLING_API_BASE_URL=https://api-singapore.klingai.com
```

Do not use a `VITE_` prefix for the key.

The upload endpoints reuse the application's existing R2 configuration from Admin → Storage, but write to a separate `kling-motion-control/` object prefix. The generated signed GET URLs last six hours so Kling can fetch the inputs after the browser upload completes.

## Added API routes

- `POST /api/admin/kling-motion-control/upload-url`
- `POST /api/admin/kling-motion-control/generate`
- `GET /api/admin/kling-motion-control/status/:taskId`

All three routes require `admin.*` permission.

## Provider endpoints wrapped

- `POST /v1/videos/motion-control`
- `GET /v1/videos/motion-control/{task_id}`

The wrapper supports `kling-v2-6` and `kling-v3`, `std` / `pro`, `image` / `video` character orientation, original-sound preservation, and the API watermark option. The test UI keeps watermark output disabled by default.

## Input limits enforced by the test UI / upload route

- Reference image: JPG/JPEG/PNG, up to 10 MB.
- Motion video: MP4/MOV, up to 100 MB.
- Minimum video duration: 3 seconds.
- `character_orientation=video`: up to 30 seconds.
- `character_orientation=image`: up to 10 seconds.
- Prompt: up to 2500 characters.

The UI also checks the documented image/video dimension limits before creating a paid Kling task.
