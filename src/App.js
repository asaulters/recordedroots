import React, { useState, useEffect } from 'react';
import { RecordingForm } from './components/RecordingForm';
import { RecordingsList } from './components/RecordingsList';
import { QuestionSelector } from './components/QuestionSelector';
import { SyncButton } from './components/SyncButton';
import { ClearStorageButton } from './components/ClearStorageButton';
import NewResidentButton from './components/NewResidentButton';
import { initDB, getResident } from './services/db';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('record');
  const [residentId, setResidentId] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [residentError, setResidentError] = useState('');
  const [hasValidResident, setHasValidResident] = useState(false);

  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  const handleResidentIdChange = async (e) => {
    const id = e.target.value.toUpperCase();  // Convert to uppercase for consistency
    setResidentId(id);
    setResidentError('');
    setHasValidResident(false);

    // Only check for resident if we have at least 3 characters
    if (id.trim().length >= 3) {
      try {
        const resident = await getResident(id);
        if (resident) {
          setHasValidResident(true);
        } else {
          setResidentError('Resident ID not found');
        }
      } catch (error) {
        console.error('Error checking resident:', error);
        setResidentError('Error checking resident ID');
      }
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
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
        <h1>Recorded Roots</h1>
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
            Recordings
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'record' ? (
          <div className="record-section">
            <div className="resident-section">
              <div className="resident-input">
                <label htmlFor="residentId">Resident ID:</label>
                <div className="resident-input-group">
                  <input
                    id="residentId"
                    type="text"
                    value={residentId}
                    onChange={handleResidentIdChange}
                    onFocus={() => {
                      setResidentId('');
                      setResidentError('');
                      setHasValidResident(false);
                    }}
                    onBlur={async () => {
                      if (residentId.trim()) {
                        try {
                          const resident = await getResident(residentId);
                          if (resident) {
                            setHasValidResident(true);
                          } else {
                            setResidentError('Resident ID not found');
                            setHasValidResident(false);
                          }
                        } catch (error) {
                          console.error('Error checking resident:', error);
                          setResidentError('Error checking resident ID');
                          setHasValidResident(false);
                        }
                      }
                    }}
                    placeholder="Enter Resident ID"
                    className={residentError ? 'error' : ''}
                  />
                  {residentError && (
                    <div className="error-message">{residentError}</div>
                  )}
                </div>
              </div>
              <div className="storage-controls">
                <NewResidentButton />
              </div>
            </div>

            {hasValidResident && (
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
          </div>
        ) : (
          <div>
            <RecordingsList />
            <div className="storage-controls">
              <SyncButton />
              <ClearStorageButton />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
