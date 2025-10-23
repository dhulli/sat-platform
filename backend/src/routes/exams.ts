import { Router } from 'express';
import { ExamController } from '../controllers/examController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Exam management
router.get('/', ExamController.getExams);
router.post('/:examId/start', ExamController.startTest);

// Test session routes
router.get('/sessions/:sessionId', ExamController.getSessionStatus);
router.get('/sessions/:sessionId/modules/:module/questions', ExamController.getModuleQuestions);
router.post('/sessions/:sessionId/modules/:module/complete', ExamController.completeModule);
//router.post('/sessions/:sessionId/answers', ExamController.saveOrUpdateAnswer);
router.post('/sessions/:sessionId/answers', ExamController.submitAnswer);
router.post('/sessions/:sessionId/complete', ExamController.completeTest);
router.post('/sessions/:sessionId/pause', ExamController.pauseSession);
router.get('/sessions/:sessionId/state', ExamController.getSessionState);

// 🆕 Fetch exam + module meta info
router.get('/sessions/:sessionId/meta', ExamController.getSessionMeta);

// 🆕 Finalize full exam (compute RW/Math 800 scores + total 1600)
router.post('/sessions/:sessionId/finalize', ExamController.finalizeExam);


export default router;