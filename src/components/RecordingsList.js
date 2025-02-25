import React, { useState, useEffect, useCallback } from 'react';
import { getAllRecordings } from '../services/db';

export const RecordingsList = () => {
  const [recordings, setRecordings] = useState([]);
  const [filteredRecordings, setFilteredRecordings] = useState([]);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [filters, setFilters] = useState({
    residentId: '',
    topic: '',
    dateRange: 'all', // all, today, week, month
  });

  const applyFilters = useCallback((recordingsList, currentFilters) => {
    let filtered = recordingsList;

    // Filter by resident ID
    if (currentFilters.residentId) {
      filtered = filtered.filter(recording => 
        recording.residentId.toLowerCase().includes(currentFilters.residentId.toLowerCase())
      );
    }

    // Filter by topic
    if (currentFilters.topic) {
      filtered = filtered.filter(recording =>
        recording.questionTopic.toLowerCase().includes(currentFilters.topic.toLowerCase()) ||
        (recording.question && recording.question.toLowerCase().includes(currentFilters.topic.toLowerCase()))
      );
    }

    // Filter by date range
    const now = new Date();
    switch (currentFilters.dateRange) {
      case 'today':
        filtered = filtered.filter(recording => {
          const recordingDate = new Date(recording.timestamp);
          return recordingDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        filtered = filtered.filter(recording => {
          const recordingDate = new Date(recording.timestamp);
          return recordingDate >= weekAgo;
        });
        break;
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        filtered = filtered.filter(recording => {
          const recordingDate = new Date(recording.timestamp);
          return recordingDate >= monthAgo;
        });
        break;
      default:
        break;
    }

    setFilteredRecordings(filtered);
  }, []);

  const loadRecordings = useCallback(async () => {
    try {
      const allRecordings = await getAllRecordings();
      setRecordings(allRecordings);
      applyFilters(allRecordings, filters);
    } catch (error) {
      console.error('Error loading recordings:', error);
    }
  }, [applyFilters, filters]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const handleFilterChange = useCallback((name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    applyFilters(recordings, newFilters);
  }, [filters, recordings, applyFilters]);

  const playRecording = useCallback((recording) => {
    setSelectedRecording(recording);
  }, []);

  return (
    <div className="recordings-list">
      <div className="filters">
        <input
          type="text"
          placeholder="Filter by Resident ID"
          value={filters.residentId}
          onChange={(e) => handleFilterChange('residentId', e.target.value)}
          className="filter-input"
        />
        <input
          type="text"
          placeholder="Filter by Topic or Question"
          value={filters.topic}
          onChange={(e) => handleFilterChange('topic', e.target.value)}
          className="filter-input"
        />
        <select
          value={filters.dateRange}
          onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          className="filter-select"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
        </select>
      </div>

      {selectedRecording && (
        <div className="video-player">
          <div className="video-info">
            <h3>{selectedRecording.questionTopic}</h3>
            <p className="question-text">
              {selectedRecording.isFollowUp ? 'Follow-up: ' : 'Question: '}
              {selectedRecording.question}
            </p>
          </div>
          <video
            controls
            src={URL.createObjectURL(selectedRecording.blob)}
            style={{ width: '100%', maxHeight: '300px' }}
          />
          <button
            onClick={() => setSelectedRecording(null)}
            className="close-button"
          >
            Close
          </button>
        </div>
      )}

      <div className="recordings-grid">
        {filteredRecordings.map((recording) => (
          <div key={recording.id} className="recording-card">
            <h4>{recording.questionTopic}</h4>
            <p className="resident-id">Resident: {recording.residentId}</p>
            <p className="timestamp">
              Date: {new Date(recording.timestamp).toLocaleDateString()}
            </p>
            <p className="question-preview">
              {recording.isFollowUp ? 'Follow-up: ' : 'Question: '}
              {recording.question}
            </p>
            <button
              onClick={() => playRecording(recording)}
              className="play-button"
            >
              Play Recording
            </button>
            <span className={`status ${recording.uploaded ? 'uploaded' : 'local'}`}>
              {recording.uploaded ? 'Uploaded' : 'Local Only'}
            </span>
          </div>
        ))}
      </div>

      {filteredRecordings.length === 0 && (
        <div className="no-recordings">
          <p>No recordings found matching your filters.</p>
        </div>
      )}
    </div>
  );
};
