const DB_NAME = 'VideoStoriesDB';
const DB_VERSION = 2;
const RECORDINGS_STORE = 'recordings';
const RESIDENTS_STORE = 'residents';

let db = null;

// Resident functions
export const addResident = async (resident) => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RESIDENTS_STORE], 'readwrite');
    const store = transaction.objectStore(RESIDENTS_STORE);
    const request = store.add(resident);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getResident = async (residentId) => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RESIDENTS_STORE], 'readonly');
    const store = transaction.objectStore(RESIDENTS_STORE);
    const request = store.get(residentId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

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
      
      if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
        const store = db.createObjectStore(RECORDINGS_STORE, { keyPath: 'id' });
        store.createIndex('uploaded', 'uploaded', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(RESIDENTS_STORE)) {
        const store = db.createObjectStore(RESIDENTS_STORE, { keyPath: 'residentId' });
        store.createIndex('facility', 'facility', { unique: false });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
};

export const saveRecording = async (recording) => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECORDINGS_STORE], 'readwrite');
    const store = transaction.objectStore(RECORDINGS_STORE);
    const request = store.put(recording);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getRecording = async (id) => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECORDINGS_STORE], 'readonly');
    const store = transaction.objectStore(RECORDINGS_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllRecordings = async () => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RECORDINGS_STORE], 'readonly');
    const store = transaction.objectStore(RECORDINGS_STORE);
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
    const transaction = db.transaction([RECORDINGS_STORE], 'readonly');
    const store = transaction.objectStore(RECORDINGS_STORE);
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
    const transaction = db.transaction([RECORDINGS_STORE], 'readwrite');
    const store = transaction.objectStore(RECORDINGS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
