import type { Transaction } from './types';

const DB = 'dakhl-kharj-db';
const STORE = 'transactions';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const q = indexedDB.open(DB, 1);
    q.onupgradeneeded = () => {
      const db = q.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
    q.onblocked = () => rej(new Error('IndexedDB blocked'));
  });
}

export async function dbGetAll(): Promise<Transaction[]> {
  const db = await open();
  try {
    return await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).getAll();
      rq.onsuccess = () => res((rq.result as Transaction[]) ?? []);
      rq.onerror = () => rej(rq.error);
      tx.onabort = () => rej(tx.error ?? new Error('Read transaction aborted'));
    });
  } finally {
    db.close();
  }
}

export async function dbPut(t: Transaction): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(t);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error ?? new Error('Write transaction aborted'));
    });
  } finally {
    db.close();
  }
}

export async function dbDel(id: string): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error ?? new Error('Delete transaction aborted'));
    });
  } finally {
    db.close();
  }
}

export async function dbClear(): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error ?? new Error('Clear transaction aborted'));
    });
  } finally {
    db.close();
  }
}

export async function dbBulkPut(list: Transaction[]): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      st.clear();
      for (const t of list) st.put(t);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error ?? new Error('Import transaction aborted'));
    });
  } finally {
    db.close();
  }
}
