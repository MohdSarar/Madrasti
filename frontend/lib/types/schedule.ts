export type ScheduleEntry = {
  id: string;
  entity_type: 'student' | 'teacher' | 'classroom' | string;
  entity_id: string;
  day_of_week: number; // 1-7 or 0-6 depending backend
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
  subject?: string | null;
  room?: string | null;
  teacher_name?: string | null;
};

export type WeeklyView = {
  entity_type: string;
  entity_id: string;
  week_start: string; // YYYY-MM-DD
  entries: ScheduleEntry[];
};
