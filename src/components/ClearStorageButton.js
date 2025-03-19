import React, { useState } from 'react';
import { getAllRecordings, deleteRecording } from '../services/db';

export const ClearStorageButton = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState(null);

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to delete all uploaded recordings from local storage? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    setError(null);

    try {
      const recordings = await getAllRecordings();
      const uploadedRecordings = recordings.filter(recording => recording.uploaded);
      
      if (uploadedRecordings.length === 0) {
        setError('No uploaded recordings to clear');
        setIsClearing(false);
        return;
      }

      let deleted = 0;
      for (const recording of uploadedRecordings) {
        try {
          await deleteRecording(recording.id);
          deleted++;
        } catch (err) {
          console.error(`Failed to delete recording ${recording.id}:`, err);
        }
      }

      if (deleted === 0) {
        setError('Failed to clear any recordings');
      } else if (deleted < uploadedRecordings.length) {
        setError(`Cleared ${deleted} out of ${uploadedRecordings.length} recordings`);
      }
    } catch (err) {
      setError('Failed to clear recordings');
      console.error(err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="clear-storage-container">
      <button
        onClick={handleClear}
        disabled={isClearing}
        className="clear-storage-button"
      >
        {isClearing ? 'Clearing...' : 'Clear Uploaded Recordings'}
      </button>
      
      {error && <div className="error">{error}</div>}
    </div>
  );
};
