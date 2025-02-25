import React from 'react';
import { useMediaRecorder } from '../hooks/useMediaRecorder';

export const RecordingForm = ({ residentId, questionTopic, question, isFollowUp }) => {
  const [cameraError, setCameraError] = React.useState(null);
  console.log('RecordingForm rendered with props:', JSON.stringify({ 
    residentId, 
    questionTopic, 
    question, 
    isFollowUp 
  }, null, 2));
  const { isRecording, error: recordingError, startRecording, stopRecording } = useMediaRecorder({
    residentId,
    questionTopic,
    question,
    isFollowUp
  });

  return (
    <div className="recording-form">
      <h2>Recording Session</h2>
      <div className="recording-info">
        <p>Resident ID: {residentId}</p>
        <p>Topic: {questionTopic}</p>
        <div className="question-display">
          <h3>{isFollowUp ? 'Follow-up Question:' : 'Question:'}</h3>
          <p className="question-text">{question}</p>
        </div>
      </div>

      <div className="video-preview">
        <video
          autoPlay
          playsInline
          muted
          ref={(videoElement) => {
            console.log('Video element ref callback:', videoElement);
            if (videoElement) {
              navigator.mediaDevices
                .getUserMedia({ video: true })
                .then((stream) => {
                  console.log('Got media stream:', stream);
                  videoElement.srcObject = stream;
                })
                .catch((err) => {
                  console.error('Error accessing camera:', err);
                  setCameraError('Failed to access camera: ' + err.message);
                });
            }
          }}
        />
      </div>
      
      {(cameraError || recordingError) && (
        <div className="error">{cameraError || recordingError}</div>
      )}
      
      <div className="recording-controls">
        {!isRecording ? (
          <button 
            onClick={startRecording}
            className="record-button"
          >
            Start Recording
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="stop-button"
          >
            Stop Recording
          </button>
        )}
      </div>

      <div className="recording-tips">
        <h4>Recording Tips:</h4>
        <ul>
          <li>Ensure good lighting and a quiet environment</li>
          <li>Position yourself comfortably in frame</li>
          <li>Take your time to think before answering</li>
          <li>Feel free to pause and restart if needed</li>
        </ul>
      </div>
    </div>
  );
};
