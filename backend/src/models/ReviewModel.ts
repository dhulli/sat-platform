import pool from '../config/database';

export default class ReviewModel {
  static async getAllReviews(userId: number) {
    const query = `
      SELECT 
        ts.id AS test_session_id,
        e.name AS exam_name,
        ts.total_score,
        ts.completed_at
      FROM test_sessions ts
      INNER JOIN exams e ON ts.exam_id = e.id
      WHERE ts.user_id = ?
      ORDER BY ts.completed_at DESC
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows as any[];
  }

  static async getReviewById(userId: number, sessionId: number) {
    const query = `
      SELECT 
        ts.id AS test_session_id,
        e.name AS exam_name,
        ts.exam_id,
        ts.total_score,
        ts.completed_at
      FROM test_sessions ts
      INNER JOIN exams e ON ts.exam_id = e.id
      WHERE ts.user_id = ? AND ts.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [userId, sessionId]);
    return (rows as any[])[0];
  }
}
