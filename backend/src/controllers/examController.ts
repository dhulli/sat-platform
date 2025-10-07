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
      const { questionId, userAnswer, timeSpent, sequenceNumber, isFlagged } = req.body;

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
        question_id: questionId,
        user_answer: userAnswer,
        time_spent: timeSpent,
        sequence_number: sequenceNumber,
        is_flagged: isFlagged || false
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
}