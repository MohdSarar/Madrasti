'use client';

import { useQuery } from '@tanstack/react-query';
import { schedulingClient } from '@/lib/api/client';
import type { WeeklyView } from '@/lib/types/schedule';

export function useWeeklySchedule(entityType?: string, entityId?: string, weekStart?: string) {
  return useQuery({
    queryKey: ['schedule', 'weekly', entityType, entityId, weekStart],
    enabled: Boolean(entityType && entityId),
    queryFn: async () => {
      const start = weekStart ? `?week_start=${encodeURIComponent(weekStart)}` : '';
      const data = await schedulingClient.get<WeeklyView>(`/api/v1/schedule/weekly/${entityType}/${entityId}${start}`);
      return data;
    }
  });
}
