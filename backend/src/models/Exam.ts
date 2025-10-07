import pool from '../config/database';

export interface Exam {
  id?: number;
  name: string;
  description?: string;
  total_questions: number;
  is_active: boolean;
  created_at?: Date;
}

export interface Question {
  id?: number;
  exam_id: number;
  module: 'reading_writing_1' | 'reading_writing_2' | 'math_1' | 'math_2';
  difficulty: number; // 1-5
  skill_category: string;
  question_text: string;
  question_data: any; // JSON for question-specific data
  options: string[];
  correct_answer: string;
  explanation?: string;
  created_at?: Date;
}

export interface TestSession {
  id?: number;
  user_id: number;
  exam_id: number;
  module1_score?: number;
  module2_difficulty?: 'easy' | 'medium' | 'hard';
  status: 'in_progress' | 'completed' | 'paused';
  started_at?: Date;
  completed_at?: Date;
  time_remaining: number;
  created_at?: Date;
}

export interface Response {
  id?: number;
  test_session_id: number;
  question_id: number;
  user_answer?: string;
  time_spent: number;
  sequence_number: number;
  is_flagged: boolean;
  created_at?: Date;
}

export class ExamModel {
  // Get all active exams
  static async findAllActive(): Promise<Exam[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM exams WHERE is_active = true ORDER BY id'
    );
    return rows as Exam[];
  }

  // Get exam by ID
  static async findById(id: number): Promise<Exam | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM exams WHERE id = ? AND is_active = true',
      [id]
    );
    const exams = rows as Exam[];
    return exams.length > 0 ? exams[0] : null;
  }

  // Get questions for an exam module
  static async getQuestionsByModule(
    examId: number, 
    module: string, 
    difficulty?: string
  ): Promise<Question[]> {
    let query = `
      SELECT * FROM questions 
      WHERE exam_id = ? AND module = ?
    `;
    const params: any[] = [examId, module];

    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }

    query += ' ORDER BY id';

    const [rows] = await pool.execute(query, params);
    return rows as Question[];
  }

  // Get question by ID
  static async getQuestionById(questionId: number): Promise<Question | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM questions WHERE id = ?',
      [questionId]
    );
    const questions = rows as Question[];
    return questions.length > 0 ? questions[0] : null;
  }
}

export class TestSessionModel {
  // Create new test session
  static async create(sessionData: Omit<TestSession, 'id' | 'created_at'>): Promise<TestSession> {
    const { user_id, exam_id, status, time_remaining } = sessionData;
    
    const [result] = await pool.execute(
      `INSERT INTO test_sessions (user_id, exam_id, status, time_remaining) 
       VALUES (?, ?, ?, ?)`,
      [user_id, exam_id, status, time_remaining]
    );
    
    const sessionId = (result as any).insertId;
    const session = await this.findById(sessionId);
    if (!session) {
      throw new Error('Failed to create test session');
    }
    return session;
  }

  // Find test session by ID
  static async findById(id: number): Promise<TestSession | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM test_sessions WHERE id = ?',
      [id]
    );
    const sessions = rows as TestSession[];
    return sessions.length > 0 ? sessions[0] : null;
  }

  // Find active session for user and exam
  static async findActiveSession(userId: number, examId: number): Promise<TestSession | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM test_sessions WHERE user_id = ? AND exam_id = ? AND status IN ("in_progress", "paused")',
      [userId, examId]
    );
    const sessions = rows as TestSession[];
    return sessions.length > 0 ? sessions[0] : null;
  }

  // Update test session
  static async update(id: number, updates: Partial<TestSession>): Promise<void> {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length > 0) {
      values.push(id);
      await pool.execute(
        `UPDATE test_sessions SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  // Complete test session
  static async completeSession(sessionId: number, module1Score: number, module2Difficulty: string): Promise<void> {
    await pool.execute(
      'UPDATE test_sessions SET status = "completed", completed_at = NOW(), module1_score = ?, module2_difficulty = ? WHERE id = ?',
      [module1Score, module2Difficulty, sessionId]
    );
  }
}

export class ResponseModel {
  // Create or update response
  static async upsert(responseData: Omit<Response, 'id' | 'created_at'>): Promise<void> {
    const { test_session_id, question_id, user_answer, time_spent, sequence_number, is_flagged } = responseData;
    
    // Check if response already exists
    const [existing] = await pool.execute(
      'SELECT id FROM responses WHERE test_session_id = ? AND question_id = ?',
      [test_session_id, question_id]
    );

    if ((existing as any[]).length > 0) {
      // Update existing response
      await pool.execute(
        `UPDATE responses SET user_answer = ?, time_spent = ?, sequence_number = ?, is_flagged = ? 
         WHERE test_session_id = ? AND question_id = ?`,
        [user_answer, time_spent, sequence_number, is_flagged, test_session_id, question_id]
      );
    } else {
      // Create new response
      await pool.execute(
        `INSERT INTO responses (test_session_id, question_id, user_answer, time_spent, sequence_number, is_flagged) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [test_session_id, question_id, user_answer, time_spent, sequence_number, is_flagged]
      );
    }
  }

  // Get responses for a test session
  static async getBySession(sessionId: number): Promise<Response[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM responses WHERE test_session_id = ? ORDER BY sequence_number',
      [sessionId]
    );
    return rows as Response[];
  }
}