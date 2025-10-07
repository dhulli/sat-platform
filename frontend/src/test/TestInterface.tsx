import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useExam } from '../context/ExamContext';

interface Question {
  id: number;
  exam_id: number;
  module: string;
  difficulty: number;
  skill_category: string;
  question_text: string;
  options: string[];
  explanation?: string;
}

const TestInterface: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const { getSessionStatus } = useExam();
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number>(64 * 60); // 64 minutes in seconds
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [testSession, setTestSession] = useState<any>(null);

  // Load test session and questions
  useEffect(() => {
    const loadTestData = async () => {
      if (!sessionId) return;

      try {
        setIsLoading(true);
        const session = await getSessionStatus(parseInt(sessionId));
        setTestSession(session);

        // For now, we'll use mock questions. In the next step, we'll fetch real questions from the API
        const mockQuestions: Question[] = [
          {
            id: 1,
            exam_id: 1,
            module: 'reading_writing_1',
            difficulty: 3,
            skill_category: 'Words in Context',
            question_text: 'The author uses the word "ubiquitous" to suggest that the phenomenon is:',
            options: ['rare and unusual', 'widespread and common', 'complex and confusing', 'temporary and fleeting'],
          },
          {
            id: 2,
            exam_id: 1,
            module: 'reading_writing_1',
            difficulty: 2,
            skill_category: 'Command of Evidence',
            question_text: 'Which choice provides the best evidence for the answer to the previous question?',
            options: ['Lines 5-8', 'Lines 12-15', 'Lines 20-23', 'Lines 30-33'],
          },
          {
            id: 3,
            exam_id: 1,
            module: 'math_1',
            difficulty: 2,
            skill_category: 'Algebra',
            question_text: 'If 3x + 5 = 20, what is the value of x?',
            options: ['3', '4', '5', '6'],
          },
          {
            id: 4,
            exam_id: 1,
            module: 'math_1',
            difficulty: 4,
            skill_category: 'Advanced Math',
            question_text: 'What is the solution to the equation x² - 5x + 6 = 0?',
            options: ['x = 2, 3', 'x = 1, 6', 'x = -2, -3', 'x = -1, -6'],
          }
        ];

        setQuestions(mockQuestions);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading test data:', error);
        alert('Failed to load test. Returning to dashboard.');
        navigate('/dashboard');
      }
    };

    loadTestData();
  }, [sessionId, getSessionStatus, navigate]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleFlagQuestion = (questionId: number) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleNavigation = (questionNumber: number) => {
    setCurrentQuestion(questionNumber);
  };

  const handleAutoSubmit = () => {
    alert('Time is up! Your answers have been automatically submitted.');
    // TODO: Implement auto-submission logic
    navigate('/dashboard');
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Inline styles for Bluebook-like interface
  const containerStyle: React.CSSProperties = {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa',
    fontFamily: 'Arial, sans-serif'
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const mainStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  };

  const questionsPanelStyle: React.CSSProperties = {
    width: '250px',
    backgroundColor: 'white',
    borderRight: '1px solid #e0e0e0',
    padding: '1rem',
    overflowY: 'auto'
  };

  const questionContentStyle: React.CSSProperties = {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto',
    backgroundColor: 'white',
    margin: '1rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const questionNumberGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '0.5rem',
    marginBottom: '1rem'
  };

  const questionNumberStyle = (questionId: number): React.CSSProperties => ({
    padding: '0.5rem',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: currentQuestion === questionId ? '#2563eb' : 
                   userAnswers[questionId] ? '#10b981' :
                   flaggedQuestions.has(questionId) ? '#f59e0b' : 'transparent',
    color: currentQuestion === questionId ? 'white' : 'inherit',
    fontWeight: currentQuestion === questionId ? 'bold' : 'normal'
  });

  const optionStyle = (questionId: number, optionIndex: number): React.CSSProperties => {
    const optionLetter = String.fromCharCode(65 + optionIndex); // A, B, C, D
    const isSelected = userAnswers[questionId] === optionLetter;
    
    return {
      padding: '1rem',
      border: `2px solid ${isSelected ? '#2563eb' : '#e0e0e0'}`,
      borderRadius: '8px',
      marginBottom: '0.5rem',
      cursor: 'pointer',
      backgroundColor: isSelected ? '#dbeafe' : 'white',
      transition: 'all 0.2s'
    };
  };

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <div>Loading test...</div>
        </div>
      </div>
    );
  }

  const currentQuestionData = questions.find(q => q.id === currentQuestion);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, color: '#1f2937' }}>SAT Practice Test</h2>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Module: Reading and Writing • Questions: 1-{questions.length}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Time Remaining</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: timeRemaining < 300 ? '#dc2626' : '#1f2937' }}>
              {formatTime(timeRemaining)}
            </div>
          </div>
          <button
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
            onClick={() => {
              if (window.confirm('Are you sure you want to exit the test? Your progress will be saved.')) {
                navigate('/dashboard');
              }
            }}
          >
            Exit Test
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={mainStyle}>
        {/* Questions Navigation Panel */}
        <div style={questionsPanelStyle}>
          <h3 style={{ marginBottom: '1rem', color: '#374151' }}>Questions</h3>
          <div style={questionNumberGridStyle}>
            {questions.map((question, index) => (
              <div
                key={question.id}
                style={questionNumberStyle(question.id)}
                onClick={() => handleNavigation(question.id)}
                title={`Question ${index + 1}`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#2563eb', marginRight: '0.5rem' }}></div>
              Current Question
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', marginRight: '0.5rem' }}></div>
              Answered
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', marginRight: '0.5rem' }}></div>
              Flagged
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div style={questionContentStyle}>
          {currentQuestionData && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: '#1f2937', margin: 0 }}>
                  Question {questions.findIndex(q => q.id === currentQuestion) + 1} of {questions.length}
                </h2>
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    border: `2px solid ${flaggedQuestions.has(currentQuestionData.id) ? '#f59e0b' : '#e0e0e0'}`,
                    backgroundColor: flaggedQuestions.has(currentQuestionData.id) ? '#fef3c7' : 'white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#92400e',
                    fontWeight: 'bold'
                  }}
                  onClick={() => handleFlagQuestion(currentQuestionData.id)}
                >
                  {flaggedQuestions.has(currentQuestionData.id) ? '★ Flagged' : '☆ Flag'}
                </button>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ 
                  backgroundColor: '#f3f4f6', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '4px',
                  display: 'inline-block',
                  fontSize: '0.875rem',
                  color: '#374151',
                  marginBottom: '1rem'
                }}>
                  {currentQuestionData.skill_category}
                </div>
                
                <div style={{ 
                  fontSize: '1.125rem', 
                  lineHeight: '1.6', 
                  marginBottom: '2rem',
                  color: '#1f2937'
                }}>
                  {currentQuestionData.question_text}
                </div>

                <div>
                  {currentQuestionData.options.map((option, index) => {
                    const optionLetter = String.fromCharCode(65 + index);
                    return (
                      <div
                        key={index}
                        style={optionStyle(currentQuestionData.id, index)}
                        onClick={() => handleAnswerSelect(currentQuestionData.id, optionLetter)}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            border: `2px solid ${userAnswers[currentQuestionData.id] === optionLetter ? '#2563eb' : '#9ca3af'}`,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '1rem',
                            flexShrink: 0,
                            backgroundColor: userAnswers[currentQuestionData.id] === optionLetter ? '#2563eb' : 'white',
                            color: userAnswers[currentQuestionData.id] === optionLetter ? 'white' : '#9ca3af',
                            fontWeight: 'bold',
                            fontSize: '0.875rem'
                          }}>
                            {optionLetter}
                          </div>
                          <div style={{ lineHeight: '1.5', color: '#374151' }}>
                            {option}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    cursor: currentQuestion > 1 ? 'pointer' : 'not-allowed',
                    color: currentQuestion > 1 ? '#374151' : '#9ca3af'
                  }}
                  onClick={() => currentQuestion > 1 && handleNavigation(currentQuestion - 1)}
                  disabled={currentQuestion <= 1}
                >
                  ← Previous
                </button>
                
                <button
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                  onClick={() => {
                    if (currentQuestion < questions.length) {
                      handleNavigation(currentQuestion + 1);
                    } else {
                      alert('This is the last question. In the next step, we\'ll add the submit functionality.');
                    }
                  }}
                >
                  {currentQuestion < questions.length ? 'Next →' : 'Review Answers'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestInterface;