import { Request, Response } from 'express';
import { AnalyticsModel } from '../models/AnalyticsModel';
import { ResponseModel } from '../models/Exam';
import { TestSessionModel } from '../models/Exam';

export class AnalyticsController {
  static async getOverview(req: Request, res: Response) {
    try {
      if (!req.user)
        return res.status(401).json({ success: false, message: 'Authentication required' });

      const analytics = await AnalyticsModel.getUserAnalytics(req.user.userId);
      return res.json({ success: true, data: analytics });
    } catch (err) {
      console.error('getOverview error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async getSessionAnalytics(req: Request, res: Response) {
    try {
      if (!req.user)
        return res.status(401).json({ success: false, message: 'Authentication required' });

      const { sessionId } = req.params;
      const analytics = await AnalyticsModel.getAnalyticsBySession(Number(sessionId));

      if (!analytics)
        return res.status(404).json({ success: false, message: 'No analytics found for session' });

      return res.json({ success: true, data: analytics });
    } catch (err) {
      console.error('getSessionAnalytics error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
