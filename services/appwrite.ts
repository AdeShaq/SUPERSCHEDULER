import { Client, Account, Databases, Storage, ID } from 'appwrite';
import { Task, Note, Folder, ScheduleGroup, SavingsGoal, SavingsLog } from '../types';

// Appwrite Configuration
export const APPWRITE_CONFIG = {
    ENDPOINT: import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    PROJECT_ID: import.meta.env.VITE_APPWRITE_PROJECT_ID || '', // User must set this
    DATABASE_ID: import.meta.env.VITE_APPWRITE_DATABASE_ID || '',
    COLLECTIONS: {
        TASKS: import.meta.env.VITE_APPWRITE_COLLECTION_TASKS || '',
        GROUPS: import.meta.env.VITE_APPWRITE_COLLECTION_GROUPS || '',
        NOTES: import.meta.env.VITE_APPWRITE_COLLECTION_NOTES || '',
        FOLDERS: import.meta.env.VITE_APPWRITE_COLLECTION_FOLDERS || '',
        SAVINGS_GOALS: import.meta.env.VITE_APPWRITE_COLLECTION_SAVINGS_GOALS || '',
        SAVINGS_LOGS: import.meta.env.VITE_APPWRITE_COLLECTION_SAVINGS_LOGS || '',
    },
    BUCKETS: {
        IMAGES: import.meta.env.VITE_APPWRITE_BUCKET_IMAGES || '',
    }
};

const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
    .setProject(APPWRITE_CONFIG.PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

export const AppwriteService = {
    client,
    account,
    databases,

    // Authentication
    initSession: async () => {
        try {
            return await account.get();
        } catch (error) {
            console.log("No active session, creating anonymous session...");
            return await account.createAnonymousSession();
        }
    },

    getUserId: async () => {
        try {
            const user = await account.get();
            return user.$id;
        } catch {
            return null;
        }
    },

    // Generic Helper for Documents
    listDocuments: async <T>(collectionId: string, queries: string[] = []): Promise<T[]> => {
        if (!APPWRITE_CONFIG.PROJECT_ID) {
            throw new Error("Appwrite Project ID not set");
        }
        // Let it throw if it fails
        const response = await databases.listDocuments(
            APPWRITE_CONFIG.DATABASE_ID,
            collectionId,
            queries
        );
        return response.documents.map(doc => ({
            ...doc,
            id: doc.$id // Map Appwrite $id to our internal id
        })) as unknown as T[];
    },

    createDocument: async <T>(collectionId: string, data: any, id = ID.unique(), permissions?: string[]): Promise<T | null> => {
        // Remove 'id' from data payload as Appwrite uses $id, or uses the ID param
        const { id: _, ...payload } = data;

        const response = await databases.createDocument(
            APPWRITE_CONFIG.DATABASE_ID,
            collectionId,
            id,
            payload,
            permissions
        );
        return { ...response, id: response.$id } as unknown as T;
    },

    updateDocument: async <T>(collectionId: string, documentId: string, data: any): Promise<T | null> => {
        try {
            const { id: _, ...payload } = data;
            const response = await databases.updateDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                collectionId,
                documentId,
                payload
            );
            return { ...response, id: response.$id } as unknown as T;
        } catch (error) {
            console.error(`Failed to update document ${documentId}`, error);
            return null;
        }
    },

    deleteDocument: async (collectionId: string, documentId: string): Promise<boolean> => {
        try {
            await databases.deleteDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                collectionId,
                documentId
            );
            return true;
        } catch (error) {
            console.error(`Failed to delete document ${documentId}`, error);
            return false;
        }
    },

    // Storage
    uploadFile: async (file: File): Promise<string | null> => {
        if (!APPWRITE_CONFIG.BUCKETS.IMAGES) {
            console.warn("Storage Bucket ID not set");
            return null;
        }
        try {
            const uploaded = await storage.createFile(
                APPWRITE_CONFIG.BUCKETS.IMAGES,
                ID.unique(),
                file
            );
            // Return the View URL
            return storage.getFileView(APPWRITE_CONFIG.BUCKETS.IMAGES, uploaded.$id).toString();
        } catch (error) {
            console.error("Failed to upload file", error);
            return null;
        }
    },

    getFilePreview: (fileId: string) => {
        if (!APPWRITE_CONFIG.BUCKETS.IMAGES) return '';
        return storage.getFilePreview(APPWRITE_CONFIG.BUCKETS.IMAGES, fileId).toString();
    }
};
