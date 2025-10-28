import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.get('/overview', AnalyticsController.getOverview);
router.get('/sessions/:sessionId', AnalyticsController.getSessionAnalytics);

export default router;
