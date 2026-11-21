import { createFileRoute } from '@tanstack/react-router';

import { listEnabledGeneratorModels } from '@/modules/generator/registry';
import type { MediaType } from '@/modules/generator/types';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  const requested = new URL(request.url).searchParams.get('mediaType');
  if (requested !== null && requested !== 'image' && requested !== 'video') {
    return respErr('Invalid media type', { status: 400 });
  }
  const models = listEnabledGeneratorModels((requested ?? undefined) as MediaType | undefined)
    .map((model) => ({
      id: model.id,
      name: model.name,
      providerName: model.providerName,
      mediaType: model.mediaType,
      defaultWorkflow: model.defaultWorkflow,
      workflows: model.workflows,
      pricing: model.pricing,
    }));
  return respData({ models }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export const Route = createFileRoute('/api/generator/models')({
  server: { handlers: { GET } },
});
