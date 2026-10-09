import { createFileRoute } from '@tanstack/react-router';

import { KlingMotionControlTester } from '@/components/kling-motion-control/KlingMotionControlTester';

function KlingMotionControlPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Kling Motion Control Test</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
          Isolated test page for Kling Motion Control. Inputs use the existing R2
          configuration, while task creation and status polling go directly to
          Kling. This flow does not consume Genjutsu credits or write Genjutsu
          generation records.
        </p>
      </div>
      <KlingMotionControlTester />
    </div>
  );
}

export const Route = createFileRoute('/admin/kling-motion-control')({
  head: () => ({
    meta: [{ title: 'Kling Motion Control Test — Genjutsu AI Admin' }],
  }),
  component: KlingMotionControlPage,
});
