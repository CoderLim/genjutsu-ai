import { createFileRoute } from '@tanstack/react-router';
import { and, eq } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { hasPermission } from '@/modules/rbac/service';
import {
  GENERATOR_SCENE,
  refundGeneratorTask,
  getGeneratorTask,
  getGeneratorTaskByRequestId,
} from '@/modules/generator/billing';
import { reconcileGeneratorTask } from '@/modules/generator/service';
import { assertGenerationId } from '@/modules/generator/storage';
import { isGeneratorRequestIdConflict } from '@/modules/generator/request-binding';
import { respData, respErr } from '@/lib/resp';

/**
 * Admin-only exception resolution, for ambiguous provider submission with no
 * request ID (cannot be resolved by public status polling or cron).
 *
 * Refund requires manual upstream billing/log verification by an operator.
 * Never automatically refund unknown submissions.
 */
async function POST({ request }: { request: Request }) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return respErr('Unauthorized', { status: 401 });
  if (!(await hasPermission(session.user.id, 'admin.*'))) {
    return respErr('Forbidden', { status: 403 });
  }
  try {
    const body = await request.json();
    const generationId = assertGenerationId(body.generationId);
    const userId = body.userId;
    const action = body.action;
    const note = String(body.note ?? '').trim().slice(0, 800);
    if (typeof userId !== 'string' || !userId) throw new Error('userId required');
    if (note.length < 12) throw new Error('Operator note required (12+ chars)');
    const task = await getGeneratorTask({ generationId, userId });
    if (!task) return respErr('Generation not found', { status: 404 });

    console.info('[generator] admin resolution', {
      generationId, adminId: session.user.id, action, note,
    });

    if (action === 'reconcile') {
      return respData(await reconcileGeneratorTask(task));
    }
    if (task.status !== 'submission_unknown') {
      return respErr('Only uncertain submissions can be manually resolved', { status: 409 });
    }
    if (action === 'link-request') {
      const requestId = body.requestId;
      if (typeof requestId !== 'string' || requestId.length < 6 || requestId.length > 256) {
        throw new Error('Valid upstream requestId required');
      }
      const linked = await getGeneratorTaskByRequestId(requestId);
      if (isGeneratorRequestIdConflict(linked, generationId)) {
        return respErr('Provider request ID is already linked to another generation', {
          status: 409,
        });
      }
      await db().update(aiTask).set({
        taskId: requestId, status: 'submitted', taskResult: null,
      }).where(and(
        eq(aiTask.id, generationId),
        eq(aiTask.userId, userId),
        eq(aiTask.scene, GENERATOR_SCENE),
        eq(aiTask.status, 'submission_unknown')
      ));
      const updated = await getGeneratorTask({ generationId, userId });
      if (!updated) return respErr('Generation missing after update', { status: 500 });
      if (updated.taskId !== requestId || updated.status === 'submission_unknown') {
        return respErr('Generation changed while linking the request', { status: 409 });
      }
      return respData(await reconcileGeneratorTask(updated));
    }
    if (action === 'refund') {
      if (body.confirmedProviderNotCharged !== true) {
        throw new Error('Manual provider charge verification required');
      }
      const refunded = await refundGeneratorTask({
        userId, generationId,
        reason: 'Admin verified provider did not accept this request',
      });
      return respData({
        generationId,
        status: refunded?.status ?? 'unchanged',
        credits: refunded?.costCredits ?? task.costCredits,
      });
    }
    throw new Error('Unknown resolution action');
  } catch (error) {
    console.error('[generator] admin resolve rejected', error);
    return respErr(error instanceof Error ? error.message : 'Resolution failed', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/admin/generator/resolve')({
  server: { handlers: { POST } },
});
