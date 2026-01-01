export interface RecurrenceConfig {
  type: 'daily' | 'interval' | 'specific_days';
  intervalDays?: number; // Used if type is 'interval' (e.g., every 3 days)
  daysOfWeek?: number[]; // Used if type is 'specific_days' (0=Sun, 1=Mon, etc.)
}

export interface ScheduleGroup {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  time?: string; // HH:mm format
  groupId: string;
  recurrence: RecurrenceConfig;
  completedDates: string[]; // ISO Date strings YYYY-MM-DD
  lastCompletedAt?: number; // Timestamp
  streak: number;
  priority: 'normal' | 'high';
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string; // HTML content
  folderId: string;
  tags: string[];
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
}

export interface Settings {
  soundEnabled: boolean;
  theme: 'dark';
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount?: number; // Optional for recurring goals
  recurringAmount?: number; // For daily/weekly/monthly commitments
  currentAmount: number;
  deadline?: string; // YYYY-MM-DD
  frequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  lastLogDate?: string; // ISO date of last deposit
}

export interface SavingsLog {
  id: string;
  goalId: string; // or 'general'
  amount: number;
  date: string; // ISO
  type: 'deposit' | 'withdraw';
  note?: string;
}

export enum ViewState {
  SCHEDULE = 'SCHEDULE',
  ANALYTICS = 'ANALYTICS',
  VAULT = 'VAULT',
  FINANCES = 'FINANCES',
}