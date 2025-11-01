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
  id: number;
  user_id: number;
  exam_id: number;

  // --- Reading & Writing ---
  module1_score?: number;                 // RW1
  rw2_score?: number;                     // RW2
  module2_difficulty?: 'easy' | 'medium' | 'hard';

  // --- Math ---
  math1_score?: number;
  math2_score?: number;
  math2_difficulty?: 'easy' | 'medium' | 'hard';

  // --- Scaled section & total scores ---
  rw_score?: number;                      // scaled 200–800
  math_score?: number;                    // scaled 200–800
  total_score?: number;                   // total 400–1600

  // --- General session data ---
  status: 'in_progress' | 'completed' | 'paused';
  started_at?: Date;
  completed_at?: Date;
  time_remaining: number;
  current_module?: string;
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
      SELECT id, exam_id, module, difficulty, skill_category,
            question_text, question_data, options, correct_answer, explanation, created_at
      FROM questions
      WHERE exam_id = ? AND module = ?
    `;
    const params: any[] = [examId, module];

    // Difficulty band mapping
    if (difficulty) {
      const label = String(difficulty).toLowerCase();
      if (label === "easy") query += " AND difficulty <= 2";
      else if (label === "medium") query += " AND difficulty = 3";
      else if (label === "hard") query += " AND difficulty >= 4";
    }

    query += " ORDER BY id";

    const [rows] = await pool.execute(query, params);

    // Parse JSON fields safely
    const list = (rows as any[]).map((q) => {
      let parsedOptions: string[] = [];
      let parsedData: any = {};

      try {
        parsedOptions =
          typeof q.options === "string" ? JSON.parse(q.options) : q.options || [];
      } catch {
        parsedOptions = [];
      }

      try {
        parsedData =
          typeof q.question_data === "string"
            ? JSON.parse(q.question_data)
            : q.question_data || {};
      } catch {
        parsedData = {};
      }

      return {
        ...q,
        options: parsedOptions,
        question_data: parsedData,
        type: parsedData?.type || "mcq", // expose type directly for frontend
        passage_text: parsedData?.passage || null, // convenience alias for passage_mcq
      };
    }) as Question[];

    return list;
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
      console.log("[TestSessionModel.update] id=%s fields=%o", id, fields.join(", "), values);
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

  static async updateStatus(sessionId: number, status: string) {
    await pool.execute(
      'UPDATE test_sessions SET status = ? WHERE id = ?',
      [status, sessionId]
    );
  }

  static async completeAndSaveScore(sessionId: number, score: number): Promise<void> {
    await pool.execute(
      'UPDATE test_sessions SET status = "completed", completed_at = NOW(), module1_score = ? WHERE id = ?',
      [score, sessionId]
    );
  }

  static async findByStatus(userId: number, examId: number, status: string): Promise<TestSession | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM test_sessions WHERE user_id=? AND exam_id=? AND status=? ORDER BY id DESC LIMIT 1',
      [userId, examId, status]
    );
    const list = rows as TestSession[];
    return list.length ? list[0] : null;
  }
  
  static async findLatestForExam(userId: number, examId: number) {
    const [rows] = await pool.execute(
      `SELECT * FROM test_sessions
      WHERE user_id = ? AND exam_id = ?
      ORDER BY created_at DESC
      LIMIT 1`,
      [userId, examId]
    );
    return (rows as TestSession[])[0] || null;
  }

  static async deleteById(id: number) {
    await pool.execute(`DELETE FROM test_sessions WHERE id = ?`, [id]);
  }

}

export class ResponseModel {
  // Create or update response
  static async upsert(responseData: Omit<Response, 'id' | 'created_at'>): Promise<void> {
    
    const { test_session_id, question_id, user_answer, time_spent, sequence_number, is_flagged } = responseData;
    
    console.log("UPSERT values:", {
      test_session_id,
      question_id,
      user_answer,
      time_spent,
      sequence_number,
      is_flagged,
    });

    // Check if response already exists
    const [existing] = await pool.execute(
      'SELECT id FROM responses WHERE test_session_id = ? AND question_id = ?',
      [test_session_id, question_id]
    );

    if ((existing as any[]).length > 0) {
      // Update existing response
      await pool.execute(
        `UPDATE responses SET user_answer = ?, time_spent = COALESCE(time_spent, 0) + ?, sequence_number = ?, is_flagged = ? 
         WHERE test_session_id = ? AND question_id = ?`,
        [user_answer, time_spent ?? 0, sequence_number, is_flagged, test_session_id, question_id]
      );
    } else {
      // Create new response
      await pool.execute(
        `INSERT INTO responses (test_session_id, question_id, user_answer, time_spent, sequence_number, is_flagged) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [test_session_id, question_id, user_answer, time_spent ?? 0, sequence_number, is_flagged]
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
  
  static async gradeSession(sessionId: number) {
    // Get all responses with joined question info
    const [rows] = await pool.query(
      `SELECT r.question_id, r.user_answer, r.is_flagged, r.time_spent, 
              q.skill_category, q.module, q.correct_answer
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.test_session_id = ?`,
      [sessionId]
    );

    const responses = rows as any[];
    if (!responses.length) {
      return {
        score: 0,
        correctCount: 0,
        totalQuestions: 0,
        rwAccuracy: 0,
        mathAccuracy: 0,
        avgTimePerQuestion: 0,
        strengths: [],
        weaknesses: [],
        results: []
      };
    }

    let rwCorrect = 0,
      rwTotal = 0,
      mathCorrect = 0,
      mathTotal = 0,
      totalTime = 0;

    // skill-wise buckets
    const skillStats: Record<string, { correct: number; total: number }> = {};

    for (const r of responses) {
      const isCorrect = r.user_answer && r.user_answer === r.correct_answer;
      const skill = r.skill_category || "Uncategorized";

      totalTime += r.time_spent ?? 0;

      if (!skillStats[skill]) skillStats[skill] = { correct: 0, total: 0 };
      skillStats[skill].total++;
      if (isCorrect) skillStats[skill].correct++;

      if (r.module.startsWith("reading_writing")) {
        rwTotal++;
        if (isCorrect) rwCorrect++;
      } else if (r.module.startsWith("math")) {
        mathTotal++;
        if (isCorrect) mathCorrect++;
      }
  }

  const rwAccuracy = rwTotal ? rwCorrect / rwTotal : 0;
  const mathAccuracy = mathTotal ? mathCorrect / mathTotal : 0;

  const avgTimePerQuestion = responses.length ? totalTime / responses.length : 0;

  console.log(`Graded session ${sessionId}: RW ${rwCorrect}/${rwTotal}, Math ${mathCorrect}/${mathTotal}: time ${totalTime}s avg ${avgTimePerQuestion.toFixed(2)}s: responses`, responses);

  // Sort skill categories by accuracy
  const skillArray = Object.entries(skillStats).map(([skill, s]) => ({
    skill,
    accuracy: s.total ? s.correct / s.total : 0,
  }));

  skillArray.sort((a, b) => b.accuracy - a.accuracy);
  const strengths = skillArray.slice(0, 3).map((s) => s.skill);
  const weaknesses = skillArray.slice(-3).map((s) => s.skill);

  const overallCorrect = rwCorrect + mathCorrect;
  const overallTotal = rwTotal + mathTotal;
  const score = overallTotal ? Math.round((overallCorrect / overallTotal) * 1600) : 0;

  return {
    score,
    correctCount: overallCorrect,
    totalQuestions: overallTotal,
    rwAccuracy,
    mathAccuracy,
    avgTimePerQuestion,
    strengths,
    weaknesses,
    results: responses.map((r) => ({
      question_id: r.question_id,
      module: r.module,
      skill_category: r.skill_category,
      correct: r.user_answer === r.correct_answer,
      time_spent: r.time_spent,
    })),
  };
}


// Grade by module prefix (e.g., 'reading_writing_1')
static async gradeSessionByModule(
  sessionId: number,
  module: string
): Promise<{ correctCount: number; totalQuestions: number; percent: number }> {
  // 1) Get exam_id and stored adaptive difficulties from session
  const [sessRows] = await pool.execute(
    `SELECT exam_id, module2_difficulty, math2_difficulty
       FROM test_sessions
      WHERE id = ?`,
    [sessionId]
  );
  if ((sessRows as any[]).length === 0) {
    throw new Error(`Session ${sessionId} not found`);
  }
  const { exam_id, module2_difficulty, math2_difficulty } = (sessRows as any)[0];

  // 2) For *_2 modules, decide numeric difficulty range from stored label
  const diffLabel =
    module === 'reading_writing_2' ? module2_difficulty
    : module === 'math_2' ? math2_difficulty
    : null;

  const difficultyRange: [number, number] | null = (() => {
    if (!diffLabel) return null;
    const t = String(diffLabel).toLowerCase();
    if (t === 'easy') return [1, 2];
    if (t === 'medium') return [3, 3];
    if (t === 'hard') return [4, 5];
    return null;
  })();

  // 3) Get the set of question ids for THIS module (and difficulty filter if *_2)
  const qSql = `
    SELECT id, correct_answer
      FROM questions
     WHERE exam_id = ?
       AND module = ?
       ${difficultyRange ? 'AND (CAST(difficulty AS SIGNED) BETWEEN ? AND ?)' : ''}
  `;
  const qParams = difficultyRange
    ? [exam_id, module, difficultyRange[0], difficultyRange[1]]
    : [exam_id, module];

  const [qRows] = await pool.execute(qSql, qParams);
  const questions = qRows as { id: number; correct_answer: string }[];

  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    // No questions for that module/range: return 0 safely
    console.warn(`gradeSessionByModule: no questions for exam ${exam_id}, module ${module}, range ${difficultyRange ?? 'n/a'}`);
    return { correctCount: 0, totalQuestions: 0, percent: 0 };
  }

  const questionIds = questions.map(q => q.id);

  // 4) Pull responses for this session limited to that question set
  //    If you ever store multiple responses per question, select the latest here.
  const placeholders = questionIds.map(() => '?').join(',');
  const [rRows] = await pool.execute(
    `
      SELECT r.question_id, r.user_answer
        FROM responses r
       WHERE r.test_session_id = ?
         AND r.question_id IN (${placeholders})
    `,
    [sessionId, ...questionIds]
  );
  const responses = rRows as { question_id: number; user_answer: string | null }[];

  // 5) Build a quick map of correct answers
  const correctMap = new Map<number, string>(
    questions.map(q => [q.id, (q.correct_answer ?? '').trim().toUpperCase()])
  );

  // 6) Count correct only among the module’s questions
  let correctCount = 0;
  for (const r of responses) {
    const ua = (r.user_answer ?? '').trim().toUpperCase();
    const ca = correctMap.get(r.question_id);
    if (!ca) continue; // question not in this module set
    if (ua && ua === ca) correctCount++;
  }

  const percent = totalQuestions ? correctCount / totalQuestions : 0;

  console.log(
    `✅ Graded exam ${exam_id}, ${module}${
      difficultyRange ? ` (${diffLabel} → ${difficultyRange[0]}-${difficultyRange[1]})` : ''
    }: ${correctCount}/${totalQuestions} = ${(percent * 100).toFixed(2)}%`
  );

  return { correctCount, totalQuestions, percent };
}

// Grade a whole section (rw or math across both modules)
static async gradeSection(sessionId: number, section: 'rw' | 'math'): Promise<{
  correctCount: number; totalQuestions: number; percent: number;
}> {
  const modules = section === 'rw'
    ? ['reading_writing_1', 'reading_writing_2']
    : ['math_1', 'math_2'];

  const [rows] = await pool.execute(
    `SELECT r.question_id, r.user_answer, q.correct_answer
     FROM responses r
     JOIN questions q ON q.id = r.question_id
     WHERE r.test_session_id = ?
       AND q.module IN (?, ?)`,
    [sessionId, modules[0], modules[1]]
  );

  const list = rows as { question_id: number; user_answer: string | null; correct_answer: string }[];
  const totalQuestions = list.length;
  const correctCount = list.filter(r => (r.user_answer || '').trim() === (r.correct_answer || '').trim()).length;
  const percent = totalQuestions ? correctCount / totalQuestions : 0;
  return { correctCount, totalQuestions, percent };
}

// Very simple linear scale to 800 (replace with real concordance later)
static scaleTo800(percent: number): number {
  const raw = Math.round(percent * 800);
  return Math.max(0, Math.min(800, raw));
}

// --- Section Scoring Helper ---
static computeSectionScore(
  module1Percent: number,
  module2Percent: number,
  module2Difficulty: 'easy' | 'medium' | 'hard'
): number {
  const w1 = 0.4;
  const w2 = 0.6;

  const difficultyAdj =
    module2Difficulty === 'hard' ? 0.03 :
    module2Difficulty === 'easy' ? -0.03 : 0;

  const combined = Math.min(
    Math.max(module1Percent * w1 + module2Percent * w2 + difficultyAdj, 0),
    1
  );

  return Math.round(200 + 600 * combined);
}

// Fetch full question+response set for review mode
static async getReviewQuestionsBySession(sessionId: number) {
  const [rows] = await pool.query(
    `SELECT 
      q.id AS question_id,
      q.exam_id,
      q.module,
      q.skill_category,
      q.question_text,
      q.question_data,
      q.options,
      q.correct_answer,
      q.explanation,
      r.user_answer,
      r.time_spent
    FROM responses r
    INNER JOIN questions q ON q.id = r.question_id
    WHERE r.test_session_id = ?
    ORDER BY 
    FIELD(q.module, 'reading_writing_1', 'reading_writing_2', 'math_1', 'math_2'),
    CASE WHEN r.sequence_number IS NULL OR r.sequence_number = 0 THEN q.id ELSE r.sequence_number END
    `,
    [sessionId]
  );

  const list = (rows as any[]).map((q) => {
    let parsedOptions: string[] = [];
    let parsedData: any = {};

    try {
      parsedOptions =
        typeof q.options === "string" ? JSON.parse(q.options) : q.options || [];
    } catch {
      parsedOptions = [];
    }

    try {
      parsedData =
        typeof q.question_data === "string"
          ? JSON.parse(q.question_data)
          : q.question_data || {};
    } catch {
      parsedData = {};
    }

    const passageText = parsedData?.passage || null;
    const type = parsedData?.type || "mcq";

    const isCorrect =
      (q.user_answer ?? "").trim().toUpperCase() ===
      (q.correct_answer ?? "").trim().toUpperCase();

    return {
      question_id: q.question_id,
      module: q.module,
      skill_category: q.skill_category,
      type,
      passage_text: passageText,
      question_text: q.question_text,
      options: parsedOptions,
      user_answer: q.user_answer,
      correct_answer: q.correct_answer,
      is_correct: isCorrect,
      explanation: q.explanation,
      time_spent: q.time_spent ?? 0,
    };
  });

  return list;
}

}