import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api-client';

export type UserCredits = {
  balance: number;
};

// Shared balance query — header, settings overview, and credits page can
// invalidate via queryKey ['user-credits'].
export function useUserCredits(enabled = true) {
  return useQuery({
    queryKey: ['user-credits'],
    queryFn: () => apiGet<UserCredits>('/api/credits'),
    staleTime: 30_000,
    enabled,
  });
}
