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

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
  customDays?: number[]; // 0-6 for Sun-Sat
  createdAt: number;
}

export interface SavingsLog {
  id: string;
  goalId: string;
  amount: number;
  date: string; // ISO Date string
  type: 'deposit' | 'withdrawal';
  note?: string;
}

export interface Settings {
  soundEnabled: boolean;
  theme: 'dark'; 
}

export enum ViewState {
  SCHEDULE = 'SCHEDULE',
  ANALYTICS = 'ANALYTICS',
  VAULT = 'VAULT',
  SAVINGS = 'SAVINGS',
}