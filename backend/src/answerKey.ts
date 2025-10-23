import pool from '../src/config/database';

(async () => {
  try {
    console.log('📘 Fetching all exams and their answer keys grouped by module and difficulty...\n');

    // Fetch all exams
    const [examRows] = await pool.execute('SELECT id, name FROM exams ORDER BY id');
    const exams = examRows as { id: number; name: string }[];

    if (!exams.length) {
      console.log('⚠️ No exams found.');
      process.exit(0);
    }

    for (const exam of exams) {
      console.log(`\n=== Exam ID ${exam.id}: ${exam.name} ===`);

      // Fetch all questions for this exam
      const [qRows] = await pool.execute(
        'SELECT id, module, difficulty, correct_answer FROM questions WHERE exam_id = ? ORDER BY id',
        [exam.id]
      );
      const questions = qRows as {
        id: number;
        module: string;
        difficulty: number;
        correct_answer: string;
      }[];

      if (!questions.length) {
        console.log('  No questions found.');
        continue;
      }

      // Group answers by module and difficulty bands
      const grouped: Record<string, Record<string, string[]>> = {};

      for (const q of questions) {
        if (!grouped[q.module]) grouped[q.module] = { easy: [], medium: [], hard: [] };

        if (q.module.endsWith('_2')) {
          // For Module 2, categorize by numeric difficulty
          if (q.difficulty <= 2) grouped[q.module].easy.push(q.correct_answer);
          else if (q.difficulty === 3) grouped[q.module].medium.push(q.correct_answer);
          else grouped[q.module].hard.push(q.correct_answer);
        } else {
          // For Module 1 (mixed difficulty), dump everything into medium bucket
          grouped[q.module].medium.push(q.correct_answer);
        }
      }

      // Print answer keys nicely
      for (const [module, diffData] of Object.entries(grouped)) {
        console.log(`\n  📗 Module: ${module}`);
        if (module.endsWith('_2')) {
          console.log(`    Easy   → ${JSON.stringify(diffData.easy)}`);
          console.log(`    Medium → ${JSON.stringify(diffData.medium)}`);
          console.log(`    Hard   → ${JSON.stringify(diffData.hard)}`);
        } else {
          console.log(`    Questions → ${JSON.stringify(diffData.medium)}`);
        }
      }
    }

    await pool.end();
    console.log('\n✅ Done printing grouped answer keys.');
  } catch (err) {
    console.error('❌ Error printing answer keys:', err);
    process.exit(1);
  }
})();
