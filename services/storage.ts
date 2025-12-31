import { Task, Note, Folder, ScheduleGroup } from '../types';

const STORAGE_KEYS = {
  TASKS: 'echotrack_tasks',
  NOTES: 'echotrack_notes',
  FOLDERS: 'echotrack_folders',
  GROUPS: 'echotrack_groups',
};

export const StorageService = {
  getTasks: (): Task[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      const tasks = data ? JSON.parse(data) : [];
      // Migration: Ensure all tasks have a groupId
      return tasks.map((t: any) => ({
        ...t,
        groupId: t.groupId || 'default'
      }));
    } catch (e) {
      console.error("Error loading tasks", e);
      return [];
    }
  },

  saveTasks: (tasks: Task[]) => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },

  getGroups: (): ScheduleGroup[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
      return data ? JSON.parse(data) : [{ id: 'default', name: 'GENERAL' }];
    } catch (e) {
      return [{ id: 'default', name: 'GENERAL' }];
    }
  },

  saveGroups: (groups: ScheduleGroup[]) => {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  },

  getNotes: (): Note[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveNotes: (notes: Note[]) => {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  },

  getFolders: (): Folder[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
      return data ? JSON.parse(data) : [{ id: 'default', name: 'General' }];
    } catch (e) {
      return [{ id: 'default', name: 'General' }];
    }
  },

  saveFolders: (folders: Folder[]) => {
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  }
};