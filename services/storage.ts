import { Task, Note, Folder, ScheduleGroup, SavingsGoal, SavingsLog } from '../types';
import { AppwriteService, APPWRITE_CONFIG } from './appwrite';
import { Query } from 'appwrite';
import { OfflineService } from './offline';

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
  // New CRUD Methods
  addTask: async (task: Task) => {
    // Offline Check
    if (!navigator.onLine) {
      OfflineService.addToQueue({ id: task.id, type: 'CREATE_TASK', payload: task });
      return task; // Optimistic return
    }

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

    try {
      const created = await AppwriteService.createDocument<any>(APPWRITE_CONFIG.COLLECTIONS.TASKS, payload, task.id);
      if (!created) throw new Error("Create failed");
      return {
        ...created,
        id: created.$id,
        recurrence: typeof created.recurrence === 'string' ? JSON.parse(created.recurrence) : created.recurrence,
        completedDates: typeof created.completedDates === 'string' ? JSON.parse(created.completedDates) : created.completedDates,
        groupId: created.groupId || 'default'
      } as Task;
    } catch (e) {
      // Fallback to Queue on failure
      console.warn("Network/Server fail, queuing task creation", e);
      OfflineService.addToQueue({ id: task.id, type: 'CREATE_TASK', payload: task });
      return task;
    }
  },

  updateTask: async (task: Task) => {
    if (!navigator.onLine) {
      OfflineService.addToQueue({ id: task.id, type: 'UPDATE_TASK', payload: task });
      return task;
    }

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

    try {
      const updated = await AppwriteService.updateDocument<any>(APPWRITE_CONFIG.COLLECTIONS.TASKS, task.id, payload);
      if (!updated) throw new Error("Update failed");
      return {
        ...updated,
        id: updated.$id,
        recurrence: typeof updated.recurrence === 'string' ? JSON.parse(updated.recurrence) : updated.recurrence,
        completedDates: typeof updated.completedDates === 'string' ? JSON.parse(updated.completedDates) : updated.completedDates,
        groupId: updated.groupId || 'default'
      } as Task;
    } catch (e) {
      console.warn("Network/Server fail, queuing task update", e);
      OfflineService.addToQueue({ id: task.id, type: 'UPDATE_TASK', payload: task });
      return task;
    }
  },

  deleteTask: async (taskId: string) => {
    if (!navigator.onLine) {
      OfflineService.addToQueue({ id: taskId, type: 'DELETE_TASK', payload: { id: taskId } });
      return true;
    }
    if (!APPWRITE_CONFIG.COLLECTIONS.TASKS) return false;
    try {
      return await AppwriteService.deleteDocument(APPWRITE_CONFIG.COLLECTIONS.TASKS, taskId);
    } catch (e) {
      OfflineService.addToQueue({ id: taskId, type: 'DELETE_TASK', payload: { id: taskId } });
      return true;
    }
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
    try {
      const docs = await AppwriteService.listDocuments<any>(APPWRITE_CONFIG.COLLECTIONS.NOTES);
      return docs.map(d => ({
        ...d,
        id: d.$id,
        tags: typeof d.tags === 'string' ? JSON.parse(d.tags) : d.tags || [],
        attachments: typeof d.attachments === 'string' ? JSON.parse(d.attachments) : d.attachments || []
      }));
    } catch (e) {
      console.error("Failed to get notes", e);
      return [];
    }
  },

  addNote: async (note: Note) => {
    if (!navigator.onLine) {
      OfflineService.addToQueue({ id: note.id, type: 'CREATE_NOTE', payload: note });
      return note;
    }
    if (!APPWRITE_CONFIG.COLLECTIONS.NOTES) return;
    const payload = {
      title: note.title,
      content: note.content,
      folderId: note.folderId,
      tags: JSON.stringify(note.tags),
      updatedAt: note.updatedAt,
      isPinned: note.isPinned,
      isLocked: note.isLocked,
      password: note.password,
      attachments: JSON.stringify(note.attachments || [])
    };
    try {
      const created = await AppwriteService.createDocument(APPWRITE_CONFIG.COLLECTIONS.NOTES, payload, note.id) as any;
      if (!created) throw new Error("Create failed");
      return {
        ...created,
        id: created.$id,
        tags: typeof created.tags === 'string' ? JSON.parse(created.tags) : created.tags,
        attachments: typeof created.attachments === 'string' ? JSON.parse(created.attachments) : created.attachments
      } as Note;
    } catch (e) {
      OfflineService.addToQueue({ id: note.id, type: 'CREATE_NOTE', payload: note });
      return note;
    }
  },

  updateNote: async (note: Note) => {
    if (!navigator.onLine) {
      OfflineService.addToQueue({ id: note.id, type: 'UPDATE_NOTE', payload: note });
      return note;
    }
    if (!APPWRITE_CONFIG.COLLECTIONS.NOTES) return;
    const payload = {
      title: note.title,
      content: note.content,
      folderId: note.folderId,
      tags: JSON.stringify(note.tags),
      updatedAt: note.updatedAt,
      isPinned: note.isPinned,
      isLocked: note.isLocked,
      password: note.password,
      attachments: JSON.stringify(note.attachments || [])
    };
    try {
      const updated = await AppwriteService.updateDocument(APPWRITE_CONFIG.COLLECTIONS.NOTES, note.id, payload) as any;
      if (!updated) throw new Error("Update failed");
      return {
        ...updated,
        id: updated.$id,
        tags: typeof updated.tags === 'string' ? JSON.parse(updated.tags) : updated.tags,
        attachments: typeof updated.attachments === 'string' ? JSON.parse(updated.attachments) : updated.attachments
      } as Note;
    } catch (e) {
      OfflineService.addToQueue({ id: note.id, type: 'UPDATE_NOTE', payload: note });
      return note;
    }
  },

  deleteNote: async (noteId: string) => {
    if (!navigator.onLine) {
      OfflineService.addToQueue({ id: noteId, type: 'DELETE_NOTE', payload: { id: noteId } });
      return true;
    }
    if (!APPWRITE_CONFIG.COLLECTIONS.NOTES) return;
    try {
      return await AppwriteService.deleteDocument(APPWRITE_CONFIG.COLLECTIONS.NOTES, noteId);
    } catch (e) {
      OfflineService.addToQueue({ id: noteId, type: 'DELETE_NOTE', payload: { id: noteId } });
      return true;
    }
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