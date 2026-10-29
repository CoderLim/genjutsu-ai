import { VIDEO_FACE_SWAP_MAX_USER_INSTRUCTIONS_CHARS } from './constants';

export const VIDEO_FACE_SWAP_DEFAULT_PROMPT =
  "Replace the main visible subject's head with the head from the provided reference portrait. Preserve the original body, clothing, actions, camera framing and background. Match lighting and perspective naturally.";

const BLOCKED_INSTRUCTION_PATTERNS = [
  /\b(change|replace|swap)\b.{0,40}\b(clothes|clothing|outfit|costume|wardrobe)\b/i,
  /\b(change|replace|swap)\b.{0,40}\b(background|scene|location|setting)\b/i,
  /\b(full[- ]?body|entire\s+character|change\s+the\s+body)\b/i,
];

export class VideoFaceSwapPromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VideoFaceSwapPromptError';
  }
}

export function normalizeVideoFaceSwapUserInstructions(
  value: unknown
): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') {
    throw new VideoFaceSwapPromptError('Invalid instructions');
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > VIDEO_FACE_SWAP_MAX_USER_INSTRUCTIONS_CHARS) {
    throw new VideoFaceSwapPromptError(
      `Instructions must be ${VIDEO_FACE_SWAP_MAX_USER_INSTRUCTIONS_CHARS} characters or fewer`
    );
  }
  for (const pattern of BLOCKED_INSTRUCTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new VideoFaceSwapPromptError(
        'Instructions cannot request clothing, background, or full-character changes'
      );
    }
  }
  return trimmed;
}

export function buildVideoFaceSwapEffectivePrompt(
  userInstructions?: string | null
) {
  const extra = userInstructions?.trim();
  if (!extra) return VIDEO_FACE_SWAP_DEFAULT_PROMPT;
  return `${VIDEO_FACE_SWAP_DEFAULT_PROMPT}\n\nAdditional guidance: ${extra}`;
}
