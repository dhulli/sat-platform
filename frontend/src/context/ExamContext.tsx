import React, { createContext, useState, useContext, ReactNode } from 'react';

interface Exam {
  id: number;
  name: string;
  description: string;
  total_questions: number;
  is_active: boolean;
}

interface TestSession {
  id: number;
  user_id: number;
  exam_id: number;
  module1_score?: number;
  module2_difficulty?: 'easy' | 'medium' | 'hard';
  status: 'in_progress' | 'completed' | 'paused';
  started_at: string;
  completed_at?: string;
  time_remaining: number;
}

interface ExamContextType {
  exams: Exam[];
  currentSession: TestSession | null;
  loading: boolean;
  loadExams: () => Promise<void>;
  startExam: (examId: number) => Promise<TestSession>;
  getSessionStatus: (sessionId: number) => Promise<TestSession>;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export const useExam = () => {
  const context = useContext(ExamContext);
  if (context === undefined) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
};

interface ExamProviderProps {
  children: ReactNode;
}

export const ExamProvider: React.FC<ExamProviderProps> = ({ children }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false); // Add this to prevent repeated loads

  const loadExams = async () => {
    // Prevent multiple simultaneous loads
    if (loading || hasLoaded) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('sat_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:5000/api/exams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load exams: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setExams(result.data.exams);
        setHasLoaded(true); // Mark as loaded to prevent future loads
      } else {
        throw new Error(result.message || 'Failed to load exams');
      }
    } catch (error) {
      console.error('Error loading exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const startExam = async (examId: number): Promise<TestSession> => {
    const token = localStorage.getItem('sat_token');
    const response = await fetch(`http://localhost:5000/api/exams/${examId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to start exam');
    }

    setCurrentSession(result.data.session);
    return result.data.session;
  };

  const getSessionStatus = async (sessionId: number): Promise<TestSession> => {
    const token = localStorage.getItem('sat_token');
    const response = await fetch(`http://localhost:5000/api/exams/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get session status');
    }

    return result.data.session;
  };

  const value: ExamContextType = {
    exams,
    currentSession,
    loading,
    loadExams,
    startExam,
    getSessionStatus
  };

  return (
    <ExamContext.Provider value={value}>
      {children}
    </ExamContext.Provider>
  );
};