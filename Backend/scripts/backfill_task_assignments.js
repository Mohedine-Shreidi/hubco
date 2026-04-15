/**
 * backfill_task_assignments.js
 *
 * Migrates legacy task assignments stored directly on the tasks table
 * (tasks.assignee_id and tasks.team_id) into the new junction tables:
 *   • task_assignments       (individual)
 *   • task_team_assignments  (team)
 *
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING.
 */

import sql from '../src/db/index.js';

async function run() {
    console.log('⏳  Back-filling task_assignments from tasks.assignee_id …');

    const indivResult = await sql`
        INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_by)
        SELECT t.organization_id, t.id, t.assignee_id, t.created_by
        FROM   tasks t
        WHERE  t.assignee_id IS NOT NULL
          AND  t.deleted_at  IS NULL
        ON CONFLICT (task_id, user_id) DO NOTHING
    `;
    console.log(`   ✔ ${indivResult.count} individual assignment(s) inserted`);

    console.log('⏳  Back-filling task_team_assignments from tasks.team_id …');

    const teamResult = await sql`
        INSERT INTO task_team_assignments (organization_id, task_id, team_id, assigned_by)
        SELECT t.organization_id, t.id, t.team_id, t.created_by
        FROM   tasks t
        WHERE  t.team_id   IS NOT NULL
          AND  t.deleted_at IS NULL
        ON CONFLICT (task_id, team_id) DO NOTHING
    `;
    console.log(`   ✔ ${teamResult.count} team assignment(s) inserted`);

    console.log('\n✅  Back-fill complete.');
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Back-fill failed:', err.message);
    process.exit(1);
});
