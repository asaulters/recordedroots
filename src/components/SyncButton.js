import React, { useState } from 'react';
import { getUnuploadedRecordings, markAsUploaded, syncResidents } from '../services/db';
import { generatePresignedUrl, uploadToS3 } from '../services/s3';

export const SyncButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [syncType, setSyncType] = useState(''); // 'recordings' or 'residents'

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    setProgress(0);

    try {
      // First sync residents
      setSyncType('residents');
      console.log('Starting resident sync...');
      await syncResidents();
      console.log('Resident sync complete');

      // Then sync recordings
      setSyncType('recordings');
      console.log('Starting recordings sync...');
      const unuploadedRecordings = await getUnuploadedRecordings();
      const total = unuploadedRecordings.length;
      console.log(`Found ${total} unuploaded recordings`);
      
      if (total === 0) {
        console.log('No recordings to sync');
        setError('Sync complete. No new recordings to upload');
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

          // Upload to S3 using our server-side proxy
          console.log('Starting S3 upload via server proxy...');
          
          // Convert blob to base64
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              // Remove the data URL prefix (e.g., "data:image/png;base64,")
              const base64 = reader.result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(recording.blob);
          });
          
          // Extract the S3 key from the presigned URL
          const urlObj = new URL(presignedUrl);
          const s3Key = urlObj.pathname.substring(1); // Remove leading slash
          
          // Get API URL
          let apiUrl = process.env.REACT_APP_API_URL || '/api';
          if (window.location.hostname.includes('render.com') || window.location.hostname.includes('recordedroots.com')) {
            apiUrl = `https://${window.location.hostname}${apiUrl}`;
          }
          
          console.log('Using API URL for S3 upload:', apiUrl);
          
          // Send the base64 data to our server to upload to S3
          const response = await fetch(`${apiUrl}/upload-to-s3`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              s3Key,
              contentType: recording.blob.type,
              base64Data,
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload to S3: ${response.status} ${errorText}`);
          }
          
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
        {isSyncing ? `Syncing ${syncType}...` : 'Sync Now'}
      </button>
      
      {isSyncing && (syncType === 'recordings' && progress > 0) && (
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
