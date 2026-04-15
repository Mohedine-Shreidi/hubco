import sql from '../src/db/index.js';

// Fix task_team_assignments — add missing columns
try {
  await sql`ALTER TABLE task_team_assignments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE`;
  console.log('✔  task_team_assignments.organization_id');
} catch (e) { console.log('ℹ', e.message); }

try {
  await sql`ALTER TABLE task_team_assignments ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`;
  console.log('✔  task_team_assignments.assigned_by');
} catch (e) { console.log('ℹ', e.message); }

try {
  await sql`CREATE INDEX IF NOT EXISTS idx_tta_task ON task_team_assignments(task_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tta_team ON task_team_assignments(team_id)`;
  console.log('✔  task_team_assignments indexes');
} catch (e) { console.log('ℹ', e.message); }

await sql.end();
console.log('Done.');
