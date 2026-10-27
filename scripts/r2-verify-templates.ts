/**
 * HEAD every App template key the same way generate/preview does.
 * Exit 1 if the physical object is missing. Detects wrangler puts that
 * landed on the logical key (no uploads/ prefix) before users generate.
 *
 *   pnpm r2:verify-templates
 */
import { AwsClient } from 'aws4fetch';

import { envConfigs } from '../src/config';
import {
  hasR2CliEnvConfig,
  resolveR2CliConfig,
} from '../src/lib/r2-cli-config';
import { resolveR2ObjectKey } from '../src/lib/r2-object-key';
import { buildR2S3ObjectUrl } from '../src/lib/r2-signing-config';
import {
  describeR2TemplateVerifyFailure,
  listConfiguredTemplateLogicalKeys,
} from '../src/lib/r2-template-catalog';
import { getAllConfigs } from '../src/modules/config/service';

async function loadAdminR2Fields() {
  const configs = await getAllConfigs();
  return {
    r2_endpoint: configs.r2_endpoint,
    r2_account_id: configs.r2_account_id,
    r2_bucket_name: configs.r2_bucket_name,
    r2_access_key: configs.r2_access_key,
    r2_secret_key: configs.r2_secret_key,
    r2_upload_path: configs.r2_upload_path,
  };
}

async function headStatus(
  client: AwsClient,
  signing: {
    endpoint: string;
    bucket: string;
    uploadPath: string;
  },
  logicalKey: string
) {
  const url = buildR2S3ObjectUrl(signing, logicalKey);
  const response = await client.fetch(new Request(url, { method: 'HEAD' }));
  return response.status;
}

async function main() {
  const config = hasR2CliEnvConfig(process.env)
    ? resolveR2CliConfig({ env: process.env })
    : resolveR2CliConfig({
        env: process.env,
        admin: await loadAdminR2Fields(),
      });

  const signing = {
    endpoint: config.endpoint,
    bucket: config.bucket,
    uploadPath: config.uploadPath,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  };
  const bareSigning = { ...signing, uploadPath: '' };
  const client = new AwsClient({
    accessKeyId: signing.accessKeyId,
    secretAccessKey: signing.secretAccessKey,
    region: 'auto',
    service: 's3',
  });

  const templates = listConfiguredTemplateLogicalKeys(envConfigs);
  console.log(`Config source: ${config.source}`);
  console.log(`upload_path: ${config.uploadPath}`);
  console.log(`Checking ${templates.length} template keys…`);

  let failed = 0;
  for (const { configKey, logicalKey } of templates) {
    const physicalKey = resolveR2ObjectKey(config.uploadPath, logicalKey);
    const physicalHttpStatus = await headStatus(client, signing, logicalKey);
    const bareHttpStatus = await headStatus(client, bareSigning, logicalKey);
    const failure = describeR2TemplateVerifyFailure({
      logicalKey,
      physicalKey,
      physicalHttpStatus,
      bareHttpStatus,
    });
    if (!failure) {
      console.log(`PASS ${configKey} → ${physicalKey}`);
      continue;
    }
    failed += 1;
    console.error(`FAIL ${configKey}: ${failure}`);
  }

  if (failed > 0) {
    console.error(
      `\n${failed} template(s) missing at the App physical key. ` +
        'Do not wrangler-put logical keys. Fix with pnpm r2:put, then re-run.'
    );
    process.exit(1);
  }
  console.log('All App template physical keys are present.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
