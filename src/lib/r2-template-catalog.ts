/**
 * Template keys the App actually HEADs (env/config defaults).
 * Used by `pnpm r2:verify-templates` so a key bump cannot be forgotten
 * the way Tiny Desk v2 was omitted from the one-off audit list.
 */

export function listConfiguredTemplateLogicalKeys(
  configs: Record<string, unknown>
): { configKey: string; logicalKey: string }[] {
  const out: { configKey: string; logicalKey: string }[] = [];
  for (const [configKey, value] of Object.entries(configs)) {
    if (!configKey.includes('_template_video_key')) continue;
    if (typeof value !== 'string') continue;
    const logicalKey = value.trim();
    if (!logicalKey) continue;
    out.push({ configKey, logicalKey });
  }
  out.sort((a, b) => a.configKey.localeCompare(b.configKey));
  return out;
}

export function describeR2TemplateVerifyFailure(params: {
  logicalKey: string;
  physicalKey: string;
  physicalHttpStatus: number;
  bareHttpStatus: number;
}): string | null {
  const physicalOk =
    params.physicalHttpStatus >= 200 && params.physicalHttpStatus < 300;
  if (physicalOk) return null;

  const physical = `App HEAD ${params.physicalKey} → HTTP ${params.physicalHttpStatus}`;
  const bareOk = params.bareHttpStatus >= 200 && params.bareHttpStatus < 300;
  if (bareOk) {
    return (
      `${physical}. Object exists at bare key ${params.logicalKey} ` +
      `(wrangler put without uploads/). Re-seed with: ` +
      `pnpm r2:put --key=${params.logicalKey} --file=<local-file>`
    );
  }
  return `${physical}. Seed with: pnpm r2:put --key=${params.logicalKey} --file=<local-file>`;
}
