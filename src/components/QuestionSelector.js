import React, { useState, useCallback, useEffect } from 'react';
import questionsData from '../data/questions.json';

export const QuestionSelector = ({ onQuestionSelect }) => {
  const [selectedSection, setSelectedSection] = useState(() => {
    // Initialize with the first section
    return questionsData.sections[0];
  });
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const handleSectionChange = useCallback((sectionId) => {
    const section = questionsData.sections.find(s => s.id === sectionId);
    setSelectedSection(section);
    setSelectedQuestionIndex(null);
    setShowFollowUp(false);
  }, []);

  const handleQuestionSelect = useCallback((question, index) => {
    console.log('Question selected:', question);
    setSelectedQuestionIndex(index);
    setShowFollowUp(false);
    const questionData = {
      ...question,
      section: selectedSection.title
    };
    console.log('Calling onQuestionSelect with:', questionData);
    onQuestionSelect(questionData);
  }, [selectedSection.title, onQuestionSelect]);

  const handleFollowUpClick = useCallback(() => {
    if (selectedQuestionIndex !== null && selectedSection.questions[selectedQuestionIndex].followUp) {
      setShowFollowUp(true);
      onQuestionSelect({
        prompt: selectedSection.questions[selectedQuestionIndex].followUp,
        section: selectedSection.title,
        isFollowUp: true
      });
    }
  }, [selectedQuestionIndex, selectedSection, onQuestionSelect]);

  const nextQuestion = selectedQuestionIndex !== null && 
    selectedQuestionIndex < selectedSection.questions.length - 1
    ? selectedSection.questions[selectedQuestionIndex + 1]
    : null;

  const prevQuestion = selectedQuestionIndex !== null && selectedQuestionIndex > 0
    ? selectedSection.questions[selectedQuestionIndex - 1]
    : null;

  const handleKeyPress = useCallback((e) => {
    if (selectedQuestionIndex === null) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        if (nextQuestion) {
          handleQuestionSelect(nextQuestion, selectedQuestionIndex + 1);
        }
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        if (prevQuestion) {
          handleQuestionSelect(prevQuestion, selectedQuestionIndex - 1);
        }
        break;
      case 'Enter':
        if (!showFollowUp && selectedSection.questions[selectedQuestionIndex]?.followUp) {
          handleFollowUpClick();
        }
        break;
      default:
        break;
    }
  }, [selectedQuestionIndex, nextQuestion, prevQuestion, showFollowUp, handleQuestionSelect, handleFollowUpClick, selectedSection.questions]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className="question-selector">
      <div className="section-selector">
        <label htmlFor="section">Choose a Topic:</label>
        <select
          id="section"
          value={selectedSection.id}
          onChange={(e) => handleSectionChange(e.target.value)}
          className="section-select"
        >
          {questionsData.sections.map(section => (
            <option key={section.id} value={section.id}>
              {section.title}
            </option>
          ))}
        </select>
      </div>

      <div className="questions-list">
        <h3>{selectedSection.title}</h3>
        <div className="questions-grid" role="listbox" aria-label="Questions">
          {selectedSection.questions.map((question, index) => (
            <div
              key={index}
              className={`question-card ${selectedQuestionIndex === index ? 'selected' : ''}`}
              onClick={() => handleQuestionSelect(question, index)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleQuestionSelect(question, index);
                }
              }}
              tabIndex={0}
              role="option"
              aria-selected={selectedQuestionIndex === index}
            >
              <p>{question.prompt}</p>
              {question.followUp && (
                <span className="follow-up-indicator" role="note">
                  Has follow-up
                </span>
              )}
              {selectedQuestionIndex === index && (
                <span className="current-indicator" role="note">
                  Current Question
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedQuestionIndex !== null && (
        <div className="question-navigation" role="region" aria-label="Question Navigation">
          <div className="navigation-controls">
            <button
              onClick={() => prevQuestion && handleQuestionSelect(prevQuestion, selectedQuestionIndex - 1)}
              disabled={!prevQuestion}
              className="nav-button prev"
              title="Previous Question (← or ↑)"
              aria-label="Previous Question"
            >
              ← Previous
            </button>
            <button
              onClick={() => nextQuestion && handleQuestionSelect(nextQuestion, selectedQuestionIndex + 1)}
              disabled={!nextQuestion}
              className="nav-button next"
              title="Next Question (→ or ↓)"
              aria-label="Next Question"
            >
              Next →
            </button>
          </div>

          <div className="selected-question" role="region" aria-label="Current Question">
            <h4>Current Question:</h4>
            <p>
              {showFollowUp 
                ? selectedSection.questions[selectedQuestionIndex].followUp 
                : selectedSection.questions[selectedQuestionIndex].prompt}
            </p>
            {!showFollowUp && selectedSection.questions[selectedQuestionIndex].followUp && (
              <button
                onClick={handleFollowUpClick}
                className="follow-up-button"
                title="Press Enter for Follow-up"
                aria-label="Show Follow-up Question"
              >
                Ask Follow-up Question
              </button>
            )}
          </div>

          {nextQuestion && (
            <div className="next-question" role="region" aria-label="Next Question Preview">
              <h4>Next Question:</h4>
              <p>{nextQuestion.prompt}</p>
            </div>
          )}
        </div>
      )}

      <div className="keyboard-shortcuts" role="region" aria-label="Keyboard Shortcuts">
        <h4>Keyboard Shortcuts:</h4>
        <ul>
          <li>← or ↑: Previous question</li>
          <li>→ or ↓: Next question</li>
          <li>Enter: Show follow-up question (when available)</li>
        </ul>
      </div>
    </div>
  );
};
