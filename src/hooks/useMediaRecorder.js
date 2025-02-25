import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { saveRecording } from '../services/db';

export const useMediaRecorder = ({ residentId, questionTopic, question, isFollowUp }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const stream = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunks.current = [];

      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      mediaRecorder.current = new MediaRecorder(stream.current, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'video/webm' });
        
        try {
          const recording = {
            id: uuidv4(),
            residentId,
            questionTopic,
            question,
            isFollowUp: isFollowUp || false,
            timestamp: new Date().toISOString(),
            blob,
            uploaded: false
          };

          await saveRecording(recording);
          chunks.current = [];
        } catch (err) {
          setError('Failed to save recording');
          console.error('Error saving recording:', err);
        }

        // Stop all tracks
        if (stream.current) {
          stream.current.getTracks().forEach(track => track.stop());
          stream.current = null;
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      setError(err.message || 'Failed to start recording');
      console.error('Error starting recording:', err);
    }
  }, [residentId, questionTopic, question, isFollowUp]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      try {
        mediaRecorder.current.stop();
        setIsRecording(false);
      } catch (err) {
        setError('Failed to stop recording');
        console.error('Error stopping recording:', err);
      }
    }
  }, [isRecording]);

  // Clean up on unmount
  const cleanup = useCallback(() => {
    if (stream.current) {
      stream.current.getTracks().forEach(track => track.stop());
      stream.current = null;
    }
  }, []);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    cleanup
  };
};
