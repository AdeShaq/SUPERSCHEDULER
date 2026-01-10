export interface OfflineAction {
    id: string;
    type: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'CREATE_NOTE' | 'UPDATE_NOTE' | 'DELETE_NOTE';
    payload: any;
    timestamp: number;
}

const STORAGE_KEY = 'echoTrack_offlineQueue';

export const OfflineService = {
    getQueue: (): OfflineAction[] => {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    },

    addToQueue: (action: Omit<OfflineAction, 'timestamp'>) => {
        const queue = OfflineService.getQueue();
        // Dedup: If update for same ID exists, replace it? 
        // Simple strategy: Append. Server handles latest write wins usually, but optimizing is better.
        // Optimization: If earlier 'UPDATE' for same ID exists, we can merge? 
        // Safer: Just append. 
        const newAction = { ...action, timestamp: Date.now() };
        queue.push(newAction);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    },

    removeFromQueue: (id: string) => {
        const queue = OfflineService.getQueue();
        const filtered = queue.filter(a => a.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    },

    clearQueue: () => {
        localStorage.removeItem(STORAGE_KEY);
    }
};
