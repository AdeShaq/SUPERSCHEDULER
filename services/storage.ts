import { Task, Note, Folder, ScheduleGroup, SavingsGoal, SavingsLog } from '../types';
import { AppwriteService, APPWRITE_CONFIG } from './appwrite';
import { Query } from 'appwrite';

export const StorageService = {
  // --- TASKS ---
  getTasks: async (): Promise<Task[]> => {
    if (!APPWRITE_CONFIG.COLLECTIONS.TASKS) return [];

    // Ensure we have a user session
    await AppwriteService.initSession();
    // Wait... if initSession creates an anonymous user, we are good.
    // Ideally initSession should be called once at App startup, but calling it here ensures we are logged in.

    const docs = await AppwriteService.listDocuments<any>(APPWRITE_CONFIG.COLLECTIONS.TASKS);

    return docs.map((d: any) => ({
      ...d,
      id: d.$id,
      recurrence: typeof d.recurrence === 'string' ? JSON.parse(d.recurrence) : d.recurrence,
      completedDates: typeof d.completedDates === 'string' ? JSON.parse(d.completedDates) : d.completedDates || [],
      groupId: d.groupId || 'default',
    }));
  },

  saveTask: async (task: Task) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.TASKS) return;
    const payload = {
      ...task,
      recurrence: JSON.stringify(task.recurrence),
      completedDates: JSON.stringify(task.completedDates),
    };

    // Check if exists? Appwrite create vs update.
    // Since we don't track "isNew" easily here without fetching, we might try update, if fails, create.
    // OR we rely on the fact that we usually know if we are creating or updating in the UI.
    // But StorageService.saveTasks(tasks[]) was the old API.
    // The old API was "save all tasks".
    // MIGRATION: The app currently calls `saveTasks(allTasks)`. This is inefficient for a backend.
    // I should deprecate `saveTasks(allTasks)` and implement `createTask`, `updateTask`, `deleteTask`.
    // But to minimize App.tsx refactoring *initially*, I might need to iterate.
    // HOWEVER, `saveTasksGlobally` in App.tsx calls `StorageService.saveTasks(updatedTasks)`.
    // If I keep that signature, I have to loop through all tasks and save them? That's bad.

    // BETTER APPROACH: Update App.tsx logic to call specific methods.
    // But first, let's just expose the CRUD methods here.
  },

  // New CRUD Methods
  addTask: async (task: Task) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.TASKS) return null;
    const payload = {
      title: task.title,
      time: task.time,
      groupId: task.groupId,
      recurrence: JSON.stringify(task.recurrence),
      completedDates: JSON.stringify(task.completedDates),
      priority: task.priority,
      createdAt: task.createdAt,
      streak: task.streak
    };
    return await AppwriteService.createDocument<Task>(APPWRITE_CONFIG.COLLECTIONS.TASKS, payload, task.id);
  },

  updateTask: async (task: Task) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.TASKS) return null;
    const payload = {
      title: task.title,
      time: task.time,
      groupId: task.groupId,
      recurrence: JSON.stringify(task.recurrence),
      completedDates: JSON.stringify(task.completedDates),
      streak: task.streak,
      priority: task.priority
    };
    return await AppwriteService.updateDocument<Task>(APPWRITE_CONFIG.COLLECTIONS.TASKS, task.id, payload);
  },

  deleteTask: async (taskId: string) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.TASKS) return false;
    return await AppwriteService.deleteDocument(APPWRITE_CONFIG.COLLECTIONS.TASKS, taskId);
  },

  // Retrofit: Implement saveTasks but warn or make it smart?
  // Actually, I MUST update App.tsx because the logic of "replace everything" is incompatible with a DB efficiently.
  // I will leave `saveTasks` empty or logging a warning, and force update App.tsx.

  // --- GROUPS ---
  getGroups: async (): Promise<ScheduleGroup[]> => {
    if (!APPWRITE_CONFIG.COLLECTIONS.GROUPS) return [{ id: 'default', name: 'GENERAL' }];
    const docs = await AppwriteService.listDocuments<ScheduleGroup>(APPWRITE_CONFIG.COLLECTIONS.GROUPS);
    if (docs.length === 0) return [{ id: 'default', name: 'GENERAL' }];
    return docs;
  },

  addGroup: async (group: ScheduleGroup) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.GROUPS) return;
    return await AppwriteService.createDocument(APPWRITE_CONFIG.COLLECTIONS.GROUPS, group, group.id);
  },

  deleteGroup: async (groupId: string) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.GROUPS) return;
    return await AppwriteService.deleteDocument(APPWRITE_CONFIG.COLLECTIONS.GROUPS, groupId);
  },


  // --- NOTES ---
  getNotes: async (): Promise<Note[]> => {
    if (!APPWRITE_CONFIG.COLLECTIONS.NOTES) return [];
    const docs = await AppwriteService.listDocuments<any>(APPWRITE_CONFIG.COLLECTIONS.NOTES);
    return docs.map(d => ({
      ...d,
      tags: typeof d.tags === 'string' ? JSON.parse(d.tags) : d.tags || []
    }));
  },

  addNote: async (note: Note) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.NOTES) return;
    return await AppwriteService.createDocument(APPWRITE_CONFIG.COLLECTIONS.NOTES, {
      ...note,
      tags: JSON.stringify(note.tags)
    }, note.id);
  },

  updateNote: async (note: Note) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.NOTES) return;
    return await AppwriteService.updateDocument(APPWRITE_CONFIG.COLLECTIONS.NOTES, note.id, {
      ...note,
      tags: JSON.stringify(note.tags)
    });
  },

  deleteNote: async (noteId: string) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.NOTES) return;
    return await AppwriteService.deleteDocument(APPWRITE_CONFIG.COLLECTIONS.NOTES, noteId);
  },

  // --- FOLDERS ---
  getFolders: async (): Promise<Folder[]> => {
    if (!APPWRITE_CONFIG.COLLECTIONS.FOLDERS) return [{ id: 'default', name: 'MAIN', icon: 'default' }];
    const docs = await AppwriteService.listDocuments<Folder>(APPWRITE_CONFIG.COLLECTIONS.FOLDERS);
    if (docs.length === 0) return [{ id: 'default', name: 'MAIN', icon: 'default' }];
    return docs;
  },

  addFolder: async (folder: Folder) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.FOLDERS) return;
    return await AppwriteService.createDocument(APPWRITE_CONFIG.COLLECTIONS.FOLDERS, folder, folder.id);
  },

  deleteFolder: async (id: string) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.FOLDERS) return;
    return await AppwriteService.deleteDocument(APPWRITE_CONFIG.COLLECTIONS.FOLDERS, id);
  },

  // --- SAVINGS ---
  getSavingsGoals: async (): Promise<SavingsGoal[]> => {
    if (!APPWRITE_CONFIG.COLLECTIONS.SAVINGS_GOALS) return [];
    return await AppwriteService.listDocuments<SavingsGoal>(APPWRITE_CONFIG.COLLECTIONS.SAVINGS_GOALS);
  },

  addSavingsGoal: async (goal: SavingsGoal) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.SAVINGS_GOALS) return;
    return await AppwriteService.createDocument(APPWRITE_CONFIG.COLLECTIONS.SAVINGS_GOALS, goal, goal.id);
  },

  updateSavingsGoal: async (goal: SavingsGoal) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.SAVINGS_GOALS) return;
    return await AppwriteService.updateDocument(APPWRITE_CONFIG.COLLECTIONS.SAVINGS_GOALS, goal.id, goal);
  },

  deleteSavingsGoal: async (id: string) => { // ADDED
    if (!APPWRITE_CONFIG.COLLECTIONS.SAVINGS_GOALS) return;
    return await AppwriteService.deleteDocument(APPWRITE_CONFIG.COLLECTIONS.SAVINGS_GOALS, id);
  },

  // --- SAVINGS LOGS ---
  getSavingsLogs: async (): Promise<SavingsLog[]> => {
    if (!APPWRITE_CONFIG.COLLECTIONS.SAVINGS_LOGS) return [];
    return await AppwriteService.listDocuments<SavingsLog>(APPWRITE_CONFIG.COLLECTIONS.SAVINGS_LOGS);
  },

  addSavingsLog: async (log: SavingsLog) => {
    if (!APPWRITE_CONFIG.COLLECTIONS.SAVINGS_LOGS) return;
    return await AppwriteService.createDocument(APPWRITE_CONFIG.COLLECTIONS.SAVINGS_LOGS, log, log.id);
  }
};