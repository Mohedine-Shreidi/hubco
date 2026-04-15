/**
 * Database reset script — truncates all tables in correct FK order, then re-seeds.
 *
 * Usage:
 *   npm run reset          — truncate + re-seed
 *   npm run reset -- --no-seed   — truncate only (no re-seed)
 */

import sql from './index.js';

const TABLES_IN_FK_ORDER = [
    'notifications',
    'messages',
    'chat_room_members',
    'chat_rooms',
    'submissions',
    'task_team_assignments',
    'task_assignments',
    'tasks',
    'team_members',
    'teams',
    'cohort_courses',
    'user_cohorts',
    'courses',
    'cohorts',
    'activity_logs',
    'attendance',
    'files',
    'user_roles',
    'roles',
    'organization_users',
    'profiles',
    'organizations',
];

async function reset() {
    const noSeed = process.argv.includes('--no-seed');

    console.log('Resetting database …\n');

    for (const table of TABLES_IN_FK_ORDER) {
        try {
            await sql`DELETE FROM ${sql(table)}`;
            console.log(`  Cleared: ${table}`);
        } catch (err) {
            console.log(`  Skipped: ${table} (${err.message.split('\n')[0]})`);
        }
    }

    // Clear auth.users last
    try {
        await sql`DELETE FROM auth.users`;
        console.log('  Cleared: auth.users');
    } catch (err) {
        console.log(`  Skipped: auth.users (${err.message.split('\n')[0]})`);
    }

    console.log('\n✅ All tables cleared.');

    if (noSeed) {
        console.log('  --no-seed flag set, skipping re-seed.');
        process.exit(0);
    }

    console.log('  Re-seeding …\n');

    // Dynamically import and run seed
    await import('./seed.js');
}

reset().catch((err) => {
    console.error('Reset failed:', err);
    process.exit(1);
});
