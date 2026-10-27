import assert from 'node:assert/strict';
import test from 'node:test';

import { envConfigs } from '../config';
import {
  describeR2TemplateVerifyFailure,
  listConfiguredTemplateLogicalKeys,
} from './r2-template-catalog';

test('catalog includes Tiny Desk v2 from envConfigs', () => {
  const keys = listConfiguredTemplateLogicalKeys(envConfigs);
  assert.ok(
    keys.some(
      (row) =>
        row.configKey === 'tiny_desk_ai_template_video_key' &&
        row.logicalKey === 'genjutsu/templates/tiny-desk-ai-v2.mp4'
    ),
    JSON.stringify(keys.map((row) => row.configKey))
  );
});

test('verify failure distinguishes wrangler bare-key orphans', () => {
  assert.equal(
    describeR2TemplateVerifyFailure({
      logicalKey: 'genjutsu/templates/tiny-desk-ai-v2.mp4',
      physicalKey: 'uploads/genjutsu/templates/tiny-desk-ai-v2.mp4',
      physicalHttpStatus: 200,
      bareHttpStatus: 404,
    }),
    null
  );

  const orphan = describeR2TemplateVerifyFailure({
    logicalKey: 'genjutsu/templates/tiny-desk-ai-v2.mp4',
    physicalKey: 'uploads/genjutsu/templates/tiny-desk-ai-v2.mp4',
    physicalHttpStatus: 404,
    bareHttpStatus: 200,
  });
  assert.match(String(orphan), /bare key/);
  assert.match(
    String(orphan),
    /pnpm r2:put --key=genjutsu\/templates\/tiny-desk-ai-v2\.mp4/
  );

  const missing = describeR2TemplateVerifyFailure({
    logicalKey: 'genjutsu/templates/tiny-desk-ai-v2.mp4',
    physicalKey: 'uploads/genjutsu/templates/tiny-desk-ai-v2.mp4',
    physicalHttpStatus: 404,
    bareHttpStatus: 404,
  });
  assert.match(String(missing), /Seed with: pnpm r2:put/);
  assert.doesNotMatch(String(missing), /bare key/);
});
