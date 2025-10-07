import pool from '../config/database';

export async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        subscription_type ENUM('free', 'premium') DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Exams table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS exams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        total_questions INT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Questions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exam_id INT,
        module ENUM('reading_writing_1', 'reading_writing_2', 'math_1', 'math_2') NOT NULL,
        difficulty INT CHECK (difficulty BETWEEN 1 AND 5),
        skill_category VARCHAR(100) NOT NULL,
        question_text TEXT NOT NULL,
        question_data JSON,
        options JSON,
        correct_answer VARCHAR(10) NOT NULL,
        explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_id) REFERENCES exams(id)
      )
    `);

    // Test sessions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS test_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        exam_id INT,
        module1_score INT,
        module2_difficulty ENUM('easy', 'medium', 'hard'),
        status ENUM('in_progress', 'completed', 'paused') DEFAULT 'in_progress',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        time_remaining INT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (exam_id) REFERENCES exams(id)
      )
    `);

    // Responses table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_session_id INT,
        question_id INT,
        user_answer VARCHAR(10),
        time_spent INT DEFAULT 0,
        sequence_number INT,
        is_flagged BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_session_id) REFERENCES test_sessions(id),
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);

    console.log('Database tables created successfully');
    connection.release();
    
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}