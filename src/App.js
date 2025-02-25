import React, { useState, useEffect } from 'react';
import { RecordingForm } from './components/RecordingForm';
import { RecordingsList } from './components/RecordingsList';
import { QuestionSelector } from './components/QuestionSelector';
import { SyncButton } from './components/SyncButton';
import { ClearStorageButton } from './components/ClearStorageButton';
import { initDB } from './services/db';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('record');
  const [residentId, setResidentId] = useState('');
  const [showQuestions, setShowQuestions] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowQuestions(false);
    setSelectedQuestion(null);
    if (tab === 'recordings') {
      setResidentId('');
    }
  };

  const handleQuestionSelect = (question) => {
    console.log('App received question:', question);
    setSelectedQuestion(question);
    console.log('selectedQuestion state updated to:', question);
  };

  return (
    <div className="App">
      <header>
        <h1>Video Stories</h1>
        <div className="nav-buttons">
          <button 
            className={activeTab === 'record' ? 'active' : ''} 
            onClick={() => handleTabChange('record')}
          >
            Record
          </button>
          <button 
            className={activeTab === 'recordings' ? 'active' : ''} 
            onClick={() => handleTabChange('recordings')}
          >
            Recordingsssss
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'record' ? (
          <div className="record-section">
            <div className="resident-input">
              <label htmlFor="residentId">Resident ID:</label>
              <input
                id="residentId"
                type="text"
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                placeholder="Enter Resident ID"
              />
              {residentId.trim() && (
                <button 
                  className="questions-button"
                  onClick={() => setShowQuestions(true)}
                >
                  Questions
                </button>
              )}
            </div>

            {showQuestions && (
              <div className="questions-section">
                <QuestionSelector onQuestionSelect={handleQuestionSelect} />
                {selectedQuestion ? (
                  <React.Fragment>
                    {console.log('Attempting to render RecordingForm with:', JSON.stringify({
                      residentId,
                      questionTopic: selectedQuestion.section,
                      question: selectedQuestion.prompt,
                      isFollowUp: selectedQuestion.isFollowUp
                    }, null, 2))}
                    <RecordingForm
                      residentId={residentId}
                      questionTopic={selectedQuestion.section}
                      question={selectedQuestion.prompt}
                      isFollowUp={selectedQuestion.isFollowUp}
                    />
                  </React.Fragment>
                ) : (
                  console.log('selectedQuestion is null, not rendering RecordingForm')
                )}
              </div>
            )}
            <div className="storage-controls">
              <SyncButton />
              <ClearStorageButton />
            </div>
          </div>
        ) : (
          <RecordingsList />
        )}
      </main>
    </div>
  );
}

export default App;
