const DB_NAME = 'VideoStoriesDB';
const DB_VERSION = 3;
const RECORDINGS_STORE = 'recordings';
const RESIDENTS_STORE = 'residents';

let db = null;

// Resident functions
export const addResident = async (resident) => {
  if (!db) throw new Error('Database not initialized');

  // First save to server
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  try {
    const response = await fetch(`${apiUrl}/residents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resident),
    });

    if (!response.ok) {
      throw new Error('Failed to save resident to server');
    }
  } catch (error) {
    console.error('Error saving resident to server:', error);
    // Continue to save locally even if server sync fails
  }

  // Then save locally
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

  // Try to get from server first
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  try {
    const response = await fetch(`${apiUrl}/residents/${residentId}`);
    if (response.ok) {
      const serverResident = await response.json();
      // Update local db with server data
      const transaction = db.transaction([RESIDENTS_STORE], 'readwrite');
      const store = transaction.objectStore(RESIDENTS_STORE);
      await store.put(serverResident);
      return serverResident;
    }
  } catch (error) {
    console.error('Error fetching resident from server:', error);
    // Fall back to local data if server fetch fails
  }

  // Fall back to local data
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RESIDENTS_STORE], 'readonly');
    const store = transaction.objectStore(RESIDENTS_STORE);
    const request = store.get(residentId.toUpperCase());

    request.onsuccess = () => {
      console.log('Resident lookup result:', request.result);
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
};

export const syncResidents = async () => {
  if (!db) throw new Error('Database not initialized');

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  try {
    const response = await fetch(`${apiUrl}/residents`);
    if (!response.ok) {
      throw new Error('Failed to fetch residents from server');
    }

    const serverResidents = await response.json();
    const transaction = db.transaction([RESIDENTS_STORE], 'readwrite');
    const store = transaction.objectStore(RESIDENTS_STORE);

    // Update local db with all server residents
    for (const resident of serverResidents) {
      await store.put(resident);
    }

    return serverResidents;
  } catch (error) {
    console.error('Error syncing residents:', error);
    throw error;
  }
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
