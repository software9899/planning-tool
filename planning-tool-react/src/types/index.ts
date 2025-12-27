export type Task = {
  id?: number | string;
  title?: string;
  text?: string;
  description?: string;
  status?: 'todo' | 'in-progress' | 'done';
  column?: 'todo' | 'in-progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string;
  assigned_to?: string;
  teamId?: number;
  team_id?: number;
  team?: string;
  dueDate?: string;
  due_date?: string;
  tags?: string[];
  estimateHours?: number;
  estimate_hours?: number;
  createdAt?: string;
  created_at?: string;
};

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  detail?: string;
};

export type MigrationResult = {
  migrated: number;
  failed: number;
};
