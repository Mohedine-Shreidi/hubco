/**
 * Migration: add attendance table
 * Run with:  npm run migrate
 *
 * Safe to run multiple times (uses IF NOT EXISTS).
 */
import sql from './index.js';

async function migrate() {
    console.log('Running migrations …');

    await sql`
        CREATE TABLE IF NOT EXISTS attendance (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            date            DATE NOT NULL DEFAULT CURRENT_DATE,
            check_in_time   TIMESTAMP WITH TIME ZONE,
            check_out_time  TIMESTAMP WITH TIME ZONE,
            status          VARCHAR(50) DEFAULT 'present',
            notes           TEXT,
            created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date)
        )
    `;
    console.log('  ✔  attendance table ready');

    await sql`
        CREATE INDEX IF NOT EXISTS idx_attendance_user_date
            ON attendance(user_id, date)
    `;
    await sql`
        CREATE INDEX IF NOT EXISTS idx_attendance_org_date
            ON attendance(organization_id, date)
    `;
    console.log('  ✔  attendance indexes ready');

    console.log('\nMigrations complete!');
    process.exit(0);
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
