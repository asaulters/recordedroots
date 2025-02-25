import React, { useState } from 'react';
import { getUnuploadedRecordings, markAsUploaded } from '../services/db';
import { generatePresignedUrl, uploadToS3 } from '../services/s3';

export const SyncButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    setProgress(0);

    try {
      console.log('Starting sync process...');
      const unuploadedRecordings = await getUnuploadedRecordings();
      const total = unuploadedRecordings.length;
      console.log(`Found ${total} unuploaded recordings`);
      
      if (total === 0) {
        console.log('No recordings to sync');
        setError('No recordings to sync');
        setIsSyncing(false);
        return;
      }

      let completed = 0;
      
      for (const recording of unuploadedRecordings) {
        if (!recording.blob) continue;

        try {
          console.log('Syncing recording:', {
            id: recording.id,
            type: recording.blob?.type,
            size: recording.blob?.size,
            timestamp: recording.timestamp
          });

          // Get pre-signed URL for this recording
          console.log('Requesting presigned URL...');
          // Format the timestamp for S3 folder structure
          const recordingDate = recording.timestamp;
          console.log('Using recording date:', recordingDate);

          const presignedUrl = await generatePresignedUrl(
            recording.id,
            recording.blob.type,
            recording.residentId,
            recording.questionTopic,
            recordingDate
          );
          console.log('Got presigned URL:', presignedUrl);

          // Upload to S3
          console.log('Starting S3 upload...');
          await uploadToS3(presignedUrl, recording.blob);
          console.log('S3 upload complete');

          // Mark as uploaded in IndexedDB
          await markAsUploaded(recording.id);
          
          completed++;
          setProgress((completed / total) * 100);
        } catch (err) {
          console.error(`Failed to upload recording ${recording.id}:`, err);
          // Continue with next recording
        }
      }

      if (completed === 0) {
        setError('Failed to sync any recordings');
      } else if (completed < total) {
        setError(`Synced ${completed} out of ${total} recordings`);
      }
    } catch (err) {
      setError('Failed to sync recordings');
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="sync-container">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="sync-button"
      >
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
      
      {isSyncing && progress > 0 && (
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
    </div>
  );
};
