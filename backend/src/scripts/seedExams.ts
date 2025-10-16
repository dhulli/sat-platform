import pool from '../config/database';

const EXAMS = [
  { id: 1, name: 'SAT Practice Test 1' },
  { id: 2, name: 'SAT Practice Test 2' },
];

// Adaptive module layout
const MODULES = [
  { name: 'reading_writing_1', count: 27, difficultyType: 'mixed' },
  { name: 'reading_writing_2', count: 27, difficultyType: 'easy' },
  { name: 'reading_writing_2', count: 27, difficultyType: 'medium' },
  { name: 'reading_writing_2', count: 27, difficultyType: 'hard' },
  { name: 'math_1', count: 22, difficultyType: 'mixed' },
  { name: 'math_2', count: 22, difficultyType: 'easy' },
  { name: 'math_2', count: 22, difficultyType: 'medium' },
  { name: 'math_2', count: 22, difficultyType: 'hard' },
];

// map difficulty labels to numeric ranges
function pickDifficulty(label: string) {
  if (label === 'easy') return Math.floor(Math.random() * 2) + 1; // 1–2
  if (label === 'medium') return 3;
  if (label === 'hard') return Math.floor(Math.random() * 2) + 4; // 4–5
  return Math.floor(Math.random() * 5) + 1; // mixed 1–5
}

async function cleanup() {
  console.log('🧹 Cleaning existing data...');
  await pool.execute('DELETE FROM responses');
  await pool.execute('DELETE FROM test_sessions');
  await pool.execute('DELETE FROM questions');
  await pool.execute('DELETE FROM exams');
  console.log('✅ Tables cleaned.');
}

async function seedExams() {
  console.log('🧩 Inserting exams...');
  for (const exam of EXAMS) {
    await pool.execute(
      'INSERT INTO exams (id, name, description, total_questions, is_active) VALUES (?, ?, ?, ?, ?)',
      [exam.id, exam.name, 'Adaptive SAT Practice Exam', 196, true]
    );
  }
  console.log('✅ Exams inserted.');
}

async function seedQuestions() {
  console.log('🧮 Generating questions...');
  for (const exam of EXAMS) {
    for (const module of MODULES) {
      for (let i = 1; i <= module.count; i++) {
        const diff = pickDifficulty(module.difficultyType);
        const skill = module.name.includes('math') ? 'Algebra' : 'Reading Skill';
        const qText = `${exam.name}: ${module.name.toUpperCase()} (${module.difficultyType}) Q${i}`;
        const options = ['A', 'B', 'C', 'D'];
        const correct = options[Math.floor(Math.random() * 4)];

        await pool.execute(
          `INSERT INTO questions 
            (exam_id, module, difficulty, skill_category, question_text, question_data, options, correct_answer)
           VALUES (?, ?, ?, ?, ?, NULL, JSON_ARRAY(?, ?, ?, ?), ?)`,
          [exam.id, module.name, diff, skill, qText, ...options, correct]
        );
      }
    }
  }
  console.log('✅ Questions generated for both exams.');
}

async function main() {
  try {
    await cleanup();
    await seedExams();
    await seedQuestions();
    console.log('🎉 Database seeded successfully with 2 full adaptive exams.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  }
}

main();
