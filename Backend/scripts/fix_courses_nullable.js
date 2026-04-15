/**
 * One-time fix: make courses.cohort_id nullable and create cohort_courses table.
 * Run:  node scripts/fix_courses_nullable.js
 */
import sql from '../src/db/index.js';

async function run() {
  // 1. Drop NOT NULL on courses.cohort_id
  try {
    await sql`ALTER TABLE courses ALTER COLUMN cohort_id DROP NOT NULL`;
    console.log('✔  courses.cohort_id is now nullable');
  } catch (e) {
    if (e.message.includes('does not exist')) {
      console.log('ℹ  column cohort_id does not exist — skipping');
    } else {
      console.log('ℹ  ALTER TABLE courses:', e.message);
    }
  }

  // 2. Create cohort_courses junction table (idempotent)
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS cohort_courses (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
        course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        assigned_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        UNIQUE(cohort_id, course_id)
      )
    `;
    console.log('✔  cohort_courses table ready');
  } catch (e) {
    console.log('ℹ  cohort_courses:', e.message);
  }

  // 3. Create indexes (idempotent)
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_cohort_courses_cohort ON cohort_courses(cohort_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cohort_courses_course ON cohort_courses(course_id)`;
    console.log('✔  cohort_courses indexes ready');
  } catch (e) {
    console.log('ℹ  indexes:', e.message);
  }

  // 4. Migrate existing course→cohort rows into the junction (idempotent)
  try {
    const result = await sql`
      INSERT INTO cohort_courses (organization_id, cohort_id, course_id)
      SELECT organization_id, cohort_id, id
      FROM courses
      WHERE cohort_id IS NOT NULL
      ON CONFLICT (cohort_id, course_id) DO NOTHING
    `;
    console.log(`✔  migrated ${result.count} existing course→cohort rows`);
  } catch (e) {
    console.log('ℹ  data migration:', e.message);
  }

  await sql.end();
  console.log('\nDone! Restart backend if needed.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
