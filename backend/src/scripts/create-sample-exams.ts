import pool from '../config/database';

async function createSampleExams() {
  console.log('📝 Creating sample exams...');

  try {
    const connection = await pool.getConnection();

    // Create sample exams
    const exams = [
      {
        name: 'SAT Practice Test 1',
        description: 'Full-length adaptive SAT practice test',
        total_questions: 154
      },
      {
        name: 'SAT Practice Test 2', 
        description: 'Full-length adaptive SAT practice test',
        total_questions: 154
      },
      {
        name: 'SAT Practice Test 3',
        description: 'Full-length adaptive SAT practice test', 
        total_questions: 154
      }
    ];

    for (const examData of exams) {
      await connection.execute(
        'INSERT INTO exams (name, description, total_questions, is_active) VALUES (?, ?, ?, true)',
        [examData.name, examData.description, examData.total_questions]
      );
      console.log(`✅ Created: ${examData.name}`);
    }

    // Create sample questions for first exam
    const [examResult] = await connection.execute('SELECT id FROM exams WHERE name = ?', ['SAT Practice Test 1']);
    const examId = (examResult as any[])[0].id;

    // Sample Reading/Writing questions
    const readingWritingQuestions = [
      {
        exam_id: examId,
        module: 'reading_writing_1',
        difficulty: 3,
        skill_category: 'Words in Context',
        question_text: 'The author uses the word "ubiquitous" to suggest that the phenomenon is:',
        options: ['rare and unusual', 'widespread and common', 'complex and confusing', 'temporary and fleeting'],
        correct_answer: 'B'
      },
      {
        exam_id: examId,
        module: 'reading_writing_1', 
        difficulty: 2,
        skill_category: 'Command of Evidence',
        question_text: 'Which choice provides the best evidence for the answer to the previous question?',
        options: ['Lines 5-8', 'Lines 12-15', 'Lines 20-23', 'Lines 30-33'],
        correct_answer: 'C'
      }
    ];

    // Sample Math questions
    const mathQuestions = [
      {
        exam_id: examId,
        module: 'math_1',
        difficulty: 2,
        skill_category: 'Algebra',
        question_text: 'If 3x + 5 = 20, what is the value of x?',
        options: ['3', '4', '5', '6'],
        correct_answer: 'C'
      },
      {
        exam_id: examId,
        module: 'math_1',
        difficulty: 4,
        skill_category: 'Advanced Math', 
        question_text: 'What is the solution to the equation x² - 5x + 6 = 0?',
        options: ['x = 2, 3', 'x = 1, 6', 'x = -2, -3', 'x = -1, -6'],
        correct_answer: 'A'
      }
    ];

    const allQuestions = [...readingWritingQuestions, ...mathQuestions];

    for (const questionData of allQuestions) {
      await connection.execute(
        `INSERT INTO questions (exam_id, module, difficulty, skill_category, question_text, options, correct_answer) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          questionData.exam_id,
          questionData.module,
          questionData.difficulty,
          questionData.skill_category,
          questionData.question_text,
          JSON.stringify(questionData.options),
          questionData.correct_answer
        ]
      );
    }

    console.log(`✅ Created ${allQuestions.length} sample questions`);

    connection.release();
    console.log('🎉 Sample exams created successfully!');

  } catch (error) {
    console.error('❌ Error creating sample exams:', error);
  }
}

createSampleExams();