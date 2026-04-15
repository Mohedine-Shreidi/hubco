/**
 * Full schema patch — applies all columns missing from the rbac_cohort_isolation migration.
 * Safe to run multiple times (IF NOT EXISTS / DO NOTHING).
 */
import sql from '../src/db/index.js';

async function patch() {
  console.log('Applying missing schema changes…\n');

  // ── 1. ENUM ──────────────────────────────────────────────
  try {
    await sql`
      DO $$ BEGIN
        CREATE TYPE assignment_type AS ENUM ('individual','team','mixed','cohort');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `;
    console.log('✔  assignment_type enum');
  } catch (e) { console.log('ℹ  enum:', e.message); }

  // ── 2. TEAMS — cohort_id ──────────────────────────────────
  try {
    await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL`;
    console.log('✔  teams.cohort_id');
  } catch (e) { console.log('ℹ  teams.cohort_id:', e.message); }

  try {
    await sql`
      UPDATE teams t SET cohort_id = c.cohort_id
      FROM courses c WHERE c.id = t.course_id AND t.cohort_id IS NULL
    `;
    console.log('✔  teams.cohort_id back-filled');
  } catch (e) { console.log('ℹ  teams back-fill:', e.message); }

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_teams_cohort_id ON teams(cohort_id)`;
    console.log('✔  idx_teams_cohort_id');
  } catch (e) { console.log('ℹ  idx_teams_cohort_id:', e.message); }

  // ── 3. TASKS — cohort_id + assignment_type ────────────────
  try {
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL`;
    console.log('✔  tasks.cohort_id');
  } catch (e) { console.log('ℹ  tasks.cohort_id:', e.message); }

  try {
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignment_type assignment_type NOT NULL DEFAULT 'individual'`;
    console.log('✔  tasks.assignment_type');
  } catch (e) { console.log('ℹ  tasks.assignment_type:', e.message); }

  try {
    await sql`
      UPDATE tasks t SET cohort_id = c.cohort_id
      FROM courses c WHERE c.id = t.course_id AND t.cohort_id IS NULL
    `;
    console.log('✔  tasks.cohort_id back-filled');
  } catch (e) { console.log('ℹ  tasks back-fill:', e.message); }

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_cohort_id ON tasks(cohort_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_course_id ON tasks(course_id)`;
    console.log('✔  tasks indexes');
  } catch (e) { console.log('ℹ  tasks indexes:', e.message); }

  // ── 4. TASK_ASSIGNMENTS — direct student assignments ──────
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS task_assignments (
        task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, user_id)
      )
    `;
    console.log('✔  task_assignments table');
  } catch (e) { console.log('ℹ  task_assignments:', e.message); }

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_task_assignments_user ON task_assignments(user_id)`;
    console.log('✔  task_assignments indexes');
  } catch (e) { console.log('ℹ  task_assignments indexes:', e.message); }

  // ── 5. TASK_TEAM_ASSIGNMENTS ──────────────────────────────
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS task_team_assignments (
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, team_id)
      )
    `;
    console.log('✔  task_team_assignments table');
  } catch (e) { console.log('ℹ  task_team_assignments:', e.message); }

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_task_team_assignments_task ON task_team_assignments(task_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_task_team_assignments_team ON task_team_assignments(team_id)`;
    console.log('✔  task_team_assignments indexes');
  } catch (e) { console.log('ℹ  task_team_assignments indexes:', e.message); }

  // ── 6. SUBMISSIONS — grade / feedback / assessed_* ────────
  try {
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS grade NUMERIC(5,2)`;
    console.log('✔  submissions.grade');
  } catch (e) { console.log('ℹ  submissions.grade:', e.message); }

  try {
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS feedback TEXT`;
    console.log('✔  submissions.feedback');
  } catch (e) { console.log('ℹ  submissions.feedback:', e.message); }

  try {
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assessed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`;
    console.log('✔  submissions.assessed_by');
  } catch (e) { console.log('ℹ  submissions.assessed_by:', e.message); }

  try {
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assessed_at TIMESTAMP WITH TIME ZONE`;
    console.log('✔  submissions.assessed_at');
  } catch (e) { console.log('ℹ  submissions.assessed_at:', e.message); }

  // ── 7. CHAT_ROOMS — cohort_id + room_type update ──────────
  try {
    await sql`ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL`;
    console.log('✔  chat_rooms.cohort_id');
  } catch (e) { console.log('ℹ  chat_rooms.cohort_id:', e.message); }

  // Add dm + cohort to room_type if it uses a CHECK constraint or enum
  // (skip silently if column type is just varchar — no action needed)
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_rooms_cohort ON chat_rooms(cohort_id) WHERE cohort_id IS NOT NULL`;
    console.log('✔  chat_rooms.cohort_id index');
  } catch (e) { console.log('ℹ  chat_rooms index:', e.message); }

  // ── 8. USER_COHORTS indexes ───────────────────────────────
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_user_cohorts_user   ON user_cohorts(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_cohorts_cohort ON user_cohorts(cohort_id)`;
    console.log('✔  user_cohorts indexes');
  } catch (e) { console.log('ℹ  user_cohorts indexes:', e.message); }

  console.log('\n✅  Schema patch complete!');
  await sql.end();
  process.exit(0);
}

patch().catch((err) => {
  console.error('Patch failed:', err);
  process.exit(1);
});
