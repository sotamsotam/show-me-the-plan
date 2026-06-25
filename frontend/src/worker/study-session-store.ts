/// <reference lib="webworker" />

import {
  STUDY_SESSION_DB,
  type StudySessionData,
} from '../lib/study-session';

function openStudySessionDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STUDY_SESSION_DB.name, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STUDY_SESSION_DB.store)) {
        db.createObjectStore(STUDY_SESSION_DB.store);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openStudySessionDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STUDY_SESSION_DB.store, mode);
    const store = transaction.objectStore(STUDY_SESSION_DB.store);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB tx failed'));
  });
}

export async function readStudySession(): Promise<StudySessionData | null> {
  const value = await withStore('readonly', (store) =>
    store.get(STUDY_SESSION_DB.key)
  );

  if (!value || typeof value !== 'object') {
    return null;
  }

  const session = value as StudySessionData;

  if (
    typeof session.until !== 'number' ||
    !Array.isArray(session.occurrenceKeys)
  ) {
    return null;
  }

  return session;
}

export async function writeStudySession(session: StudySessionData): Promise<void> {
  await withStore('readwrite', (store) => store.put(session, STUDY_SESSION_DB.key));
}

export async function deleteStudySession(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(STUDY_SESSION_DB.key));
}
