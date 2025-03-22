import React, { useState } from 'react';
import { getAllRecordings, deleteRecording } from '../services/db';
import './ClearStorageButton.css';

export const ClearStorageButton = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleClearUploaded = async () => {
    if (!window.confirm('Are you sure you want to delete all UPLOADED recordings from local storage? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    setError(null);
    setSuccessMessage(null);

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
        setSuccessMessage(`Cleared ${deleted} out of ${uploadedRecordings.length} uploaded recordings`);
      } else {
        setSuccessMessage(`Successfully cleared all ${deleted} uploaded recordings`);
      }
    } catch (err) {
      setError('Failed to clear recordings');
      console.error(err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL recordings from local storage (both uploaded and local)? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const recordings = await getAllRecordings();
      
      if (recordings.length === 0) {
        setError('No recordings to clear');
        setIsClearing(false);
        return;
      }

      let deleted = 0;
      for (const recording of recordings) {
        try {
          await deleteRecording(recording.id);
          deleted++;
        } catch (err) {
          console.error(`Failed to delete recording ${recording.id}:`, err);
        }
      }

      if (deleted === 0) {
        setError('Failed to clear any recordings');
      } else if (deleted < recordings.length) {
        setSuccessMessage(`Cleared ${deleted} out of ${recordings.length} recordings`);
      } else {
        setSuccessMessage(`Successfully cleared all ${deleted} recordings`);
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
      <div className="button-group">
        <button
          onClick={handleClearUploaded}
          disabled={isClearing}
          className="clear-storage-button"
        >
          {isClearing ? 'Clearing...' : 'Clear Uploaded Recordings'}
        </button>
        
        <button
          onClick={handleClearAll}
          disabled={isClearing}
          className="clear-storage-button clear-all-button"
        >
          {isClearing ? 'Clearing...' : 'Clear ALL Recordings'}
        </button>
      </div>
      
      {error && <div className="error">{error}</div>}
      {successMessage && <div className="success">{successMessage}</div>}
    </div>
  );
};
