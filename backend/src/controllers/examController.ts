import { Request, Response } from 'express';
import { ExamModel, TestSessionModel, ResponseModel, Question } from '../models/Exam';

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
          message: 'Authentication required'
        });
      }

      const { examId } = req.params;

      // Check if exam exists
      const exam = await ExamModel.findById(parseInt(examId));
      if (!exam) {
        return res.status(404).json({
          success: false,
          message: 'Exam not found'
        });
      }

      // Check for existing active session
      const existingSession = await TestSessionModel.findActiveSession(
        req.user.userId,
        parseInt(examId)
      );

      if (existingSession) {
        return res.json({
          success: true,
          data: {
            session: existingSession,
            resumed: true
          }
        });
      }

      // before creating new session
      const existingPaused = await TestSessionModel.findByStatus(req.user.userId, parseInt(examId), 'paused');
      if (existingPaused && existingPaused.id) {
        await TestSessionModel.update(existingPaused.id, { status: 'in_progress' });
        return res.json({ success: true, data: { session: existingPaused, resumed: true } });
      }

      // Create new session
      const session = await TestSessionModel.create({
        user_id: req.user.userId,
        exam_id: parseInt(examId),
        status: 'in_progress',
        time_remaining: 64 * 60 // 64 minutes for first module
      });

      res.status(201).json({
        success: true,
        message: 'Test session started',
        data: {
          session,
          resumed: false
        }
      });

    } catch (error) {
      console.error('Start test error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
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

      const questions = await ExamModel.getQuestionsByModule(
        session.exam_id,
        module,
        difficulty as string
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

  // Get test session status
  static async getSessionStatus(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { sessionId } = req.params;

      const session = await TestSessionModel.findById(parseInt(sessionId));
      if (!session || session.user_id !== req.user.userId) {
        return res.status(404).json({
          success: false,
          message: 'Test session not found'
        });
      }

      const responses = await ResponseModel.getBySession(parseInt(sessionId));

      res.json({
        success: true,
        data: {
          session,
          responses
        }
      });

    } catch (error) {
      console.error('Get session status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
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
    if (!req.user) return res.status(401).json({ success: false, message: 'Auth required' });

    const { sessionId } = req.params;
    const { time_remaining } = req.body;
    

    const session = await TestSessionModel.findById(Number(sessionId));
    console.log('User in pauseSession:', req.user);
    console.log('Session in DB:', session);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.user_id !== (req.user as any).userId)
      return res.status(403).json({ success: false, message: 'Forbidden' });

    await TestSessionModel.update(Number(sessionId), {
      status: 'paused',
      time_remaining: time_remaining ?? session.time_remaining,
    });

    const updated = await TestSessionModel.findById(Number(sessionId));
    res.json({ success: true, message: 'Session paused', data: { session: updated } });
  } catch (err) {
    console.error('pauseSession error', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
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


}