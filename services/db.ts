import { ChatMessage, UploadedFile } from '../types';

const DB_NAME = 'VerumOmnisCaseDB';
const DB_VERSION = 1;
const CASE_STORE_NAME = 'caseFiles';
const SINGLE_CASE_KEY = 'current_case';

interface CaseData {
  id: string;
  messages: ChatMessage[];
  files: UploadedFile[];
}

class CaseDatabase {
  private db: IDBDatabase | null = null;

  constructor() {
    this.init();
  }

  private init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('Database error:', request.error);
        reject('Database error: ' + request.error);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(CASE_STORE_NAME)) {
          db.createObjectStore(CASE_STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  private async getDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  public async saveCase(messages: ChatMessage[], files: UploadedFile[]): Promise<void> {
    const db = await this.getDb();
    const transaction = db.transaction(CASE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(CASE_STORE_NAME);
    
    const caseData: CaseData = {
      id: SINGLE_CASE_KEY,
      messages,
      files,
    };

    store.put(caseData);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  public async loadCase(): Promise<{ messages: ChatMessage[], files: UploadedFile[] } | null> {
    const db = await this.getDb();
    const transaction = db.transaction(CASE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(CASE_STORE_NAME);
    const request = store.get(SINGLE_CASE_KEY);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result as CaseData;
        if (result) {
          resolve({ messages: result.messages, files: result.files });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => {
        console.error('Failed to load case:', request.error);
        reject(request.error);
      };
    });
  }

  public async clearCase(): Promise<void> {
    const db = await this.getDb();
    const transaction = db.transaction(CASE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(CASE_STORE_NAME);
    store.delete(SINGLE_CASE_KEY);
     return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const db = new CaseDatabase();