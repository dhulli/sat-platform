import { Request, Response } from 'express';
import { ExamModel, TestSessionModel, ResponseModel, Question } from '../models/Exam';
import { AnalyticsModel } from '../models/AnalyticsModel'; // ✅ add this import

export class ExamController {
  // Get all available exams
  static async getExams(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const exams = await ExamModel.findAllActive();

      res.json({
        success: true,
        data: {
          exams
        }
      });

    } catch (error) {
      console.error('Get exams error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Start a new test session
  static async startTest(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const { examId } = req.params;
      const forceNew = req.query.forceNew === "true"; // ?forceNew=true from frontend

      // 1️⃣ Validate exam
      const exam = await ExamModel.findById(Number(examId));
      if (!exam) {
        return res.status(404).json({
          success: false,
          message: "Exam not found",
        });
      }

      // 2️⃣ Find any existing session (active or paused)
      const existing = await TestSessionModel.findLatestForExam(
        req.user.userId,
        Number(examId)
      );

      if (existing && !forceNew && (existing.status === "in_progress" || existing.status === "paused")) {
        // Don't resume automatically — let frontend decide
        return res.json({
          success: true,
          data: {
            existingSession: existing,
            requiresConfirmation: true,
            message: "An existing session is available. Resume or start new?",
          },
        });
      }

      // 3️⃣ If user chose "start new", delete the paused/old one
      if (existing && forceNew) {
        await TestSessionModel.deleteById(existing.id);
      }

      // 4️⃣ Create a fresh session
      const session = await TestSessionModel.create({
        user_id: req.user.userId,
        exam_id: Number(examId),
        status: "in_progress",
        time_remaining: 64 * 60, // 64 minutes for first module
        current_module: "reading_writing_1",
      });

      return res.status(201).json({
        success: true,
        message: "Test session started",
        data: {
          session,
          resumed: false,
        },
      });
    } catch (error) {
      console.error("Start test error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get questions for a module
  static async getModuleQuestions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { sessionId, module } = req.params;
      const { difficulty } = req.query;

      // Verify session belongs to user
      const session = await TestSessionModel.findById(parseInt(sessionId));
      if (!session || session.user_id !== req.user.userId) {
        return res.status(404).json({
          success: false,
          message: 'Test session not found'
        });
      }
      
      console.log("Fetching questions for exam:", session.exam_id, "module:", module);

      // --- Determine difficulty correctly for each section ---
      let effectiveDifficulty: string | undefined = undefined;

      if (module === 'reading_writing_2') {
        effectiveDifficulty = session.module2_difficulty;
      } else if (module === 'math_2') {
        effectiveDifficulty = session.math2_difficulty;
      } else {
        effectiveDifficulty = (req.query.difficulty as string | undefined);
      }

      const questions = await ExamModel.getQuestionsByModule(
        session.exam_id,
        module,
        effectiveDifficulty
      );


      // Remove correct answers from response
      const safeQuestions = questions.map(q => ({
        ...q,
        correct_answer: undefined
      }));

      res.json({
        success: true,
        data: {
          questions: safeQuestions
        }
      });

    } catch (error) {
      console.error('Get module questions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Save or update an answer (autosave)
  static async saveOrUpdateAnswer(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });

      const { sessionId } = req.params;
      const {
        question_id,
        user_answer,
        time_spent,
        sequence_number,
        is_flagged
      } = req.body;

      console.log("Received body:", req.body);
      console.log("Parsed values:", {
        sessionId,
        question_id,
        user_answer,
        time_spent,
        sequence_number,
        is_flagged,
      });

      if (!question_id || !user_answer) {
        return res.status(400).json({ success: false, message: 'Missing question_id or user_answer' });
      }
      
      await ResponseModel.upsert({
        test_session_id: Number(sessionId),
        question_id: question_id,
        user_answer: user_answer,
        time_spent: time_spent ?? 0,
        sequence_number: sequence_number ?? 0,
        is_flagged: is_flagged ?? false
      });
      return res.json({ success: true });
    } catch (err) {
      console.error('saveOrUpdateAnswer error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }


  // Submit answer
  static async submitAnswer(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { sessionId } = req.params;
      //const { questionId, userAnswer, timeSpent, sequenceNumber, isFlagged } = req.body;
      const {
        question_id,
        user_answer,
        time_spent,
        sequence_number,
        is_flagged
      } = req.body;

      console.log("Received body:", req.body);
      console.log("Parsed values:", {
        sessionId,
        question_id,
        user_answer,
        time_spent,
        sequence_number,
        is_flagged,
      });

      // Verify session belongs to user
      const session = await TestSessionModel.findById(parseInt(sessionId));
      if (!session || session.user_id !== req.user.userId) {
        return res.status(404).json({
          success: false,
          message: 'Test session not found'
        });
      }

      await ResponseModel.upsert({
        test_session_id: parseInt(sessionId),
        question_id: question_id,
        user_answer: user_answer,
        time_spent: time_spent,
        sequence_number: sequence_number,
        is_flagged: is_flagged || false
      });

      res.json({
        success: true,
        message: 'Answer submitted'
      });

    } catch (error) {
      console.error('Submit answer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // ✅ Updated getSessionStatus
  static async getSessionStatus(req: Request, res: Response) {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Authentication required" });

    const { sessionId } = req.params;
    const session = await TestSessionModel.findById(Number(sessionId));

    if (!session || session.user_id !== req.user.userId)
      return res.status(404).json({ success: false, message: "Test session not found" });

    const responses = await ResponseModel.getBySession(Number(sessionId));

    // ✅ Always trust persisted DB field first
    let currentModule = session.current_module || "reading_writing_1";

    // fallback if old record has no current_module
    if (!session.current_module) {
      if (session.module1_score && session.module2_difficulty) currentModule = "reading_writing_2";
      else if (session.status === "completed" && session.module2_difficulty) currentModule = "math_1";
    }

    console.log("🧭 Resuming session at module:", currentModule);

    return res.json({
      success: true,
      data: { session, responses, currentModule },
    });
  } catch (error) {
    console.error("Get session status error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}



  static async completeTest(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { sessionId } = req.params;
    const session = await TestSessionModel.findById(parseInt(sessionId));

    if (!session || session.user_id !== req.user.userId) {
      return res.status(404).json({ success: false, message: 'Test session not found' });
    }

    const grading = await ResponseModel.gradeSession(parseInt(sessionId));
    await TestSessionModel.completeAndSaveScore(parseInt(sessionId), grading.score);

    res.json({
      success: true,
      message: 'Test graded successfully',
      data: grading
    });
  } catch (error) {
    console.error('Complete test grading error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

static async pauseSession(req: Request, res: Response) {
  console.log("🔥 Hit pauseSession endpoint with body:", req.body);
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Auth required" });

    const { sessionId } = req.params;
    const { time_remaining, current_module } = req.body;

    const session = await TestSessionModel.findById(Number(sessionId));
    console.log("User in pauseSession:", req.user);
    console.log("Session in DB:", session);
    if (!session)
      return res.status(404).json({ success: false, message: "Session not found" });
    if (session.user_id !== (req.user as any).userId)
      return res.status(403).json({ success: false, message: "Forbidden" });

    // ✅ persist current_module so we resume in correct place
    await TestSessionModel.update(Number(sessionId), {
      status: "paused",
      time_remaining: time_remaining ?? session.time_remaining,
      current_module: current_module || session.current_module || "reading_writing_1",
    });

    const updated = await TestSessionModel.findById(Number(sessionId));
    res.json({ success: true, message: "Session paused", data: { session: updated } });
  } catch (err) {
    console.error("pauseSession error", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}


static async getSessionState(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Auth required' });

    const { sessionId } = req.params;
    const session = await TestSessionModel.findById(Number(sessionId));
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.user_id !== (req.user as any).userId)
      return res.status(403).json({ success: false, message: 'Forbidden' });

    const responses = await ResponseModel.getBySession(Number(sessionId));

    res.json({
      success: true,
      data: { session, responses },
    });
  } catch (err) {
    console.error('getSessionState error', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

static async completeModule(req: Request, res: Response) {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Authentication required" });

    const { sessionId, module } = req.params;
    if (!module)
      return res.status(400).json({ success: false, message: "Missing module" });

    const session = await TestSessionModel.findById(Number(sessionId));
    if (!session || session.user_id !== req.user.userId)
      return res.status(404).json({ success: false, message: "Test session not found" });

    // --- Grade current module ---
    const { correctCount, totalQuestions, percent } =
      await ResponseModel.gradeSessionByModule(Number(sessionId), module);
    console.log("grading result:", { correctCount, totalQuestions, percent });

    let nextDifficulty: "easy" | "medium" | "hard";
    if (percent < 0.4) nextDifficulty = "easy";
    else if (percent < 0.75) nextDifficulty = "medium";
    else nextDifficulty = "hard";

    const updates: any = {};
    let nextModule: string | null = null;

    // --- RW adaptive ---
    if (module === "reading_writing_1") {
      nextModule = "reading_writing_2";
      if (session.module1_score == null)
        Object.assign(updates, {
          module1_score: Math.round(percent * 100),
          module2_difficulty: nextDifficulty,
        });
      updates.current_module = nextModule;
    } else if (module === "reading_writing_2") {
      nextModule = "math_1";
      if (session.rw2_score == null)
        updates.rw2_score = Math.round(percent * 100);
      updates.current_module = nextModule;
    }

    // --- Math adaptive ---
    else if (module === "math_1") {
      nextModule = "math_2";
      if (session.math1_score == null)
        Object.assign(updates, {
          math1_score: Math.round(percent * 100),
          math2_difficulty: nextDifficulty,
        });
      updates.current_module = nextModule;
    } else if (module === "math_2") {
      if (session.math2_score == null)
        updates.math2_score = Math.round(percent * 100);
      updates.status = "completed";
      updates.completed_at = new Date();
      nextModule = null;
    }

    await TestSessionModel.update(Number(sessionId), updates);

    // 🔒 re-fetch after DB write
    const fresh = await TestSessionModel.findById(Number(sessionId));
    if (!fresh) throw new Error("Session disappeared mid-update");

   // --- Compute section & total once, no overwrites ---
    if (module.startsWith("reading_writing")) {
      if (fresh.module1_score != null && fresh.rw2_score != null && fresh.rw_score == null) {
        const rwScaled = ResponseModel.computeSectionScore(
          fresh.module1_score / 100,
          fresh.rw2_score / 100,
          fresh.module2_difficulty as "easy" | "medium" | "hard"
        );
        await TestSessionModel.update(fresh.id, { rw_score: rwScaled });
      }
    }
    else if (module.startsWith("math")) {
      if (fresh.math1_score != null && fresh.math2_score != null && fresh.math_score == null) {
        const mathScaled = ResponseModel.computeSectionScore(
          fresh.math1_score / 100,
          fresh.math2_score / 100,
          fresh.math2_difficulty as "easy" | "medium" | "hard"
        );
        const totalScaled = (fresh.rw_score ?? 0) + mathScaled;
        await TestSessionModel.update(fresh.id, {
          math_score: mathScaled,
          total_score: totalScaled,
          status: "completed",
          completed_at: new Date(),
        });
        // ✅ NEW BLOCK: generate analytics on final completion
        try {
          const gradingSummary = await ResponseModel.gradeSession(Number(sessionId));
          await AnalyticsModel.upsertUserAnalytics({
            user_id: fresh.user_id,
            exam_id: fresh.exam_id,
            test_session_id: fresh.id,
            rw_score: fresh.rw_score ?? 0,
            math_score: mathScaled,
            total_score: totalScaled,
            rw_accuracy: gradingSummary.rwAccuracy,
            math_accuracy: gradingSummary.mathAccuracy,
            avg_time_per_question: gradingSummary.avgTimePerQuestion,
            strengths: gradingSummary.strengths,
            weaknesses: gradingSummary.weaknesses,
          });
          console.log("✅ User analytics saved for session", fresh.id);
        } catch (analyticsErr) {
          console.error("⚠️ Analytics generation failed:", analyticsErr);
        }
        // ✅ END NEW BLOCK
      }
    }

    return res.json({
      success: true,
      message: "Module completed",
      data: {
        module,
        correctCount,
        totalQuestions,
        percent,
        nextModule,
        difficulty: nextDifficulty,
      },
    });
  } catch (err) {
    console.error("completeModule error", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// GET /api/exams/sessions/:sessionId/meta
static async getSessionMeta(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Auth required' });
    const { sessionId } = req.params;

    const session = await TestSessionModel.findById(Number(sessionId));
    if (!session || session.user_id !== req.user.userId)
      return res.status(404).json({ success: false, message: 'Session not found' });

    const exam = await ExamModel.findById(session.exam_id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    // Dumb but effective module blurbs. Replace later with DB content if you want.
    const moduleBlurbs: Record<string, { title: string; info: string }> = {
      reading_writing_1: {
        title: 'Reading & Writing Module 1',
        info:
          '32 minutes • 27 questions. Focus on grammar, usage, and evidence. This module sets your path to Module 2 difficulty. Answer everything—no penalty for guessing.'
      },
      reading_writing_2: {
        title: 'Reading & Writing Module 2',
        info:
          '32 minutes • 27 questions. Difficulty adapted from your Module 1 performance. Same scoring rules; manage time and move on if stuck.'
      },
      math_1: {
        title: 'Math Module 1',
        info:
          '35 minutes • 22 questions. Mix of algebra, geometry, data. Sets the difficulty of Math Module 2. Calculator allowed.'
      },
      math_2: {
        title: 'Math Module 2',
        info:
          '35 minutes • 22 questions. Difficulty adapted from Module 1 performance. Calculator allowed. Finish strong.'
      }
    };

    return res.json({
      success: true,
      data: {
        exam: { id: exam.id, name: exam.name },
        currentModule: session.current_module || 'reading_writing_1',
        blurbs: moduleBlurbs
      }
    });
  } catch (err) {
    console.error('getSessionMeta error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// POST /api/exams/sessions/:sessionId/finalize
static async finalizeExam(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Auth required' });
    const { sessionId } = req.params;

    const session = await TestSessionModel.findById(Number(sessionId));
    if (!session || session.user_id !== req.user.userId)
      return res.status(404).json({ success: false, message: 'Test session not found' });

    // Grade sections
    const rw = await ResponseModel.gradeSection(Number(sessionId), 'rw');
    const math = await ResponseModel.gradeSection(Number(sessionId), 'math');

    const rw800 = ResponseModel.scaleTo800(rw.percent);
    const math800 = ResponseModel.scaleTo800(math.percent);
    const total1600 = rw800 + math800;

    // mark completed
    await TestSessionModel.update(Number(sessionId), {
      status: 'completed',
      completed_at: new Date()
    });

    return res.json({
      success: true,
      data: {
        reading_writing: { ...rw, score800: rw800 },
        math: { ...math, score800: math800 },
        total1600
      }
    });
  } catch (err) {
    console.error('finalizeExam error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

}