import pool from '../config/database';

export class AnalyticsModel {
  static async upsertUserAnalytics(data: {
    user_id: number;
    exam_id: number;
    test_session_id: number;
    rw_score: number;
    math_score: number;
    total_score: number;
    rw_accuracy: number;
    math_accuracy: number;
    avg_time_per_question: number;
    strengths: string[];
    weaknesses: string[];
  }) {
    const [existing] = await pool.query(
      `SELECT id FROM user_analytics WHERE user_id = ? AND test_session_id = ?`,
      [data.user_id, data.test_session_id]
    );

    if ((existing as any[]).length) {
      await pool.query(
        `UPDATE user_analytics
         SET rw_score=?, math_score=?, total_score=?,
             rw_accuracy=?, math_accuracy=?, avg_time_per_question=?,
             strengths=?, weaknesses=?, updated_at=NOW()
         WHERE user_id=? AND test_session_id=?`,
        [
          data.rw_score, data.math_score, data.total_score,
          data.rw_accuracy, data.math_accuracy, data.avg_time_per_question,
          JSON.stringify(data.strengths), JSON.stringify(data.weaknesses),
          data.user_id, data.test_session_id
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO user_analytics 
        (user_id, exam_id, test_session_id, rw_score, math_score, total_score, 
         rw_accuracy, math_accuracy, avg_time_per_question, strengths, weaknesses)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.user_id, data.exam_id, data.test_session_id,
          data.rw_score, data.math_score, data.total_score,
          data.rw_accuracy, data.math_accuracy, data.avg_time_per_question,
          JSON.stringify(data.strengths), JSON.stringify(data.weaknesses)
        ]
      );
    }
  }

  static async getUserAnalytics(userId: number) {
    const [rows] = await pool.query(
      `SELECT * FROM user_analytics WHERE user_id = ? ORDER BY updated_at DESC`,
      [userId]
    );
    return rows;
  }

  static async getAnalyticsBySession(sessionId: number) {
    const [rows] = await pool.query(
      `SELECT * FROM user_analytics WHERE test_session_id = ?`,
      [sessionId]
    );
    return (rows as any[])[0];
  }
}
