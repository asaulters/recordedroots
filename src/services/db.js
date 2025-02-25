const DB_NAME = 'VideoStoriesDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

let db = null;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('uploaded', 'uploaded', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

export const saveRecording = async (recording) => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(recording);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getRecording = async (id) => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllRecordings = async () => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort recordings by timestamp, newest first
      const recordings = request.result.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      resolve(recordings);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getUnuploadedRecordings = async () => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      console.log('All recordings from IndexedDB:', request.result);
      const recordings = request.result.filter(recording => !recording.uploaded);
      console.log('Unuploaded recordings:', recordings);
      resolve(recordings);
    };
    request.onerror = () => reject(request.error);
  });
};

export const markAsUploaded = async (id) => {
  if (!db) throw new Error('Database not initialized');

  const recording = await getRecording(id);
  if (!recording) throw new Error('Recording not found');

  recording.uploaded = true;
  return saveRecording(recording);
};

export const deleteRecording = async (id) => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
