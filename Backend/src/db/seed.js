/**
 * Seed script — populates the database with comprehensive demo data.
 *
 * Run with:  npm run seed
 *
 * LOCAL PostgreSQL (init.sql):
 *   Inserts auth.users with bcrypt-hashed passwords + all public tables.
 *
 * Supabase cloud (supabase_schema.sql):
 *   Skips auth.users (those must be created via Supabase Dashboard →
 *   Authentication → Users). Only seeds public tables.
 *   After creating Supabase Auth users, update the UUID constants below
 *   to match the generated auth.users IDs, then re-run the seed.
 */

import bcrypt from 'bcryptjs';
import sql from './index.js';
import config from '../config/index.js';

/* ── Helper UUIDs ─────────────────────────────────────────── */
const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
const INSTRUCTOR_1_ID = '00000000-0000-0000-0000-000000000002';
const INSTRUCTOR_2_ID = '00000000-0000-0000-0000-000000000020';
const STUDENT_1_ID = '00000000-0000-0000-0000-000000000003';
const STUDENT_2_ID = '00000000-0000-0000-0000-000000000004';
const STUDENT_3_ID = '00000000-0000-0000-0000-000000000005';
const LEADER_1_ID = '00000000-0000-0000-0000-000000000006';
const STUDENT_4_ID = '00000000-0000-0000-0000-000000000007';
const STUDENT_5_ID = '00000000-0000-0000-0000-000000000008';
const STUDENT_6_ID = '00000000-0000-0000-0000-000000000009';
const STUDENT_7_ID = '00000000-0000-0000-0000-000000000010';
const STUDENT_8_ID = '00000000-0000-0000-0000-000000000011';
const LEADER_2_ID = '00000000-0000-0000-0000-000000000012';
const STUDENT_9_ID = '00000000-0000-0000-0000-000000000013';
const STUDENT_10_ID = '00000000-0000-0000-0000-000000000014';
const STUDENT_11_ID = '00000000-0000-0000-0000-000000000015';
const STUDENT_12_ID = '00000000-0000-0000-0000-000000000016';

/* Detect Supabase connection so we can skip the custom auth.users step */
const isSupabase = (config.databaseUrl ?? '').includes('supabase');

async function seed() {
    console.log('Seeding database …');
    console.log(`  Mode: ${isSupabase ? 'Supabase cloud' : 'Local PostgreSQL'}`);

    /* ── 0. Auth users (diverse creative names) ──────────── */
    const authUsers = [
        { id: ADMIN_ID, email: 'admin@hub.com', password: 'admin123', role: 'admin', full_name: 'Razan Ata' },
        { id: INSTRUCTOR_1_ID, email: 'instructor@hub.com', password: 'inst123', role: 'instructor', full_name: 'Arthur Leywin' },
        { id: INSTRUCTOR_2_ID, email: 'instructor2@hub.com', password: 'inst123', role: 'instructor', full_name: 'Kakashi Hatake' },
        { id: STUDENT_1_ID, email: 'sherlock@hub.com', password: 'stud123', role: 'student', full_name: 'Sherlock Holmes' },
        { id: STUDENT_2_ID, email: 'ada@hub.com', password: 'stud123', role: 'student', full_name: 'Alice' },
        { id: STUDENT_3_ID, email: 'jinwoo@hub.com', password: 'stud123', role: 'student', full_name: 'Sung Jin Woo' },
        { id: LEADER_1_ID, email: 'leader@hub.com', password: 'lead123', role: 'team_leader', full_name: 'Kim Dokja' },
        { id: STUDENT_4_ID, email: 'rosalind@hub.com', password: 'stud123', role: 'student', full_name: 'Raviel Valdez' },
        { id: STUDENT_5_ID, email: 'leonardo@hub.com', password: 'stud123', role: 'student', full_name: 'Leonardo da Vinci' },
        { id: STUDENT_6_ID, email: 'marie@hub.com', password: 'stud123', role: 'student', full_name: 'Asuna Yuuki' },
        { id: STUDENT_7_ID, email: 'alan@hub.com', password: 'stud123', role: 'student', full_name: 'Zoro Ronorwa' },
        { id: STUDENT_8_ID, email: 'grace@hub.com', password: 'stud123', role: 'student', full_name: 'Gintoki Sakata' },
        { id: LEADER_2_ID, email: 'leader2@hub.com', password: 'lead123', role: 'team_leader', full_name: 'Alhaitham' },
        { id: STUDENT_9_ID, email: 'hypatia@hub.com', password: 'stud123', role: 'student', full_name: 'Emilia Rose' },
        { id: STUDENT_10_ID, email: 'student@hub.com', password: 'stud123', role: 'student', full_name: 'Kaiden' },
        { id: STUDENT_11_ID, email: 'hedy@hub.com', password: 'stud123', role: 'student', full_name: 'Subaru' },
        { id: STUDENT_12_ID, email: 'katherine@hub.com', password: 'stud123', role: 'student', full_name: 'Katherine Johnson' },
    ];

    const rounds = config.bcryptRounds ?? 10;

    if (isSupabase) {
        for (const u of authUsers) {
            try {
                await sql`
                    INSERT INTO auth.users
                        (id, aud, role, email, encrypted_password,
                         email_confirmed_at, created_at, updated_at,
                         raw_app_meta_data, raw_user_meta_data, is_super_admin,
                         confirmation_token, recovery_token, email_change_token_new, email_change)
                    VALUES
                        (${u.id}, 'authenticated', 'authenticated', ${u.email}, '',
                         NOW(), NOW(), NOW(),
                         ${'{"provider":"email","providers":["email"]}'}::jsonb,
                         '{}'::jsonb, false, '', '', '', '')
                    ON CONFLICT (id) DO NOTHING
                `;
            } catch {
                await sql`INSERT INTO auth.users (id, email) VALUES (${u.id}, ${u.email}) ON CONFLICT (id) DO NOTHING`;
            }
        }
        console.log('\n  ⚠  Supabase detected — auth.users rows created (no password).');
        console.log('     Credentials (password_hash + role) are stored in profiles below.');
        console.log('     Demo accounts:');
        for (const u of authUsers) {
            console.log(`       ${u.email}  /  ${u.password}`);
        }
        console.log();
    } else {
        for (const u of authUsers) {
            await sql`
                INSERT INTO auth.users (id, email)
                VALUES (${u.id}, ${u.email})
                ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
            `;
        }
        console.log('  Auth users seeded');
    }

    /* ── 1. Organization ────────────────────────── */
    const [org] = await sql`
        INSERT INTO organizations (name, slug, description)
        VALUES ('HubConnect Academy', 'hubconnect-academy', 'A world-class learning platform for future innovators')
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
    `;
    const orgId = org.id;
    console.log('  Organization:', orgId);

    /* ── 2. Profiles (with credentials) ────────── */
    for (const u of authUsers) {
        const hash = await bcrypt.hash(u.password, rounds);
        await sql`
            INSERT INTO profiles (id, email, full_name, role, password_hash)
            VALUES (${u.id}, ${u.email}, ${u.full_name}, ${u.role}, ${hash})
            ON CONFLICT (id) DO UPDATE
                SET full_name     = EXCLUDED.full_name,
                    role          = EXCLUDED.role,
                    password_hash = EXCLUDED.password_hash
        `;
    }
    console.log('  Profiles seeded (with credentials)');

    /* ── 3. Organization users ──────────────────── */
    for (const u of authUsers) {
        await sql`
            INSERT INTO organization_users (organization_id, user_id)
            VALUES (${orgId}, ${u.id})
            ON CONFLICT (organization_id, user_id) DO NOTHING
        `;
    }
    console.log('  Organization users linked');

    /* ── 4. Roles ───────────────────────────────── */
    const roleNames = ['admin', 'instructor', 'student', 'team_leader'];
    const roleIds = {};
    for (const name of roleNames) {
        const [role] = await sql`
            INSERT INTO roles (organization_id, name, is_system_role)
            VALUES (${orgId}, ${name}, true)
            ON CONFLICT (organization_id, name) DO UPDATE SET is_system_role = true
            RETURNING id
        `;
        roleIds[name] = role.id;
    }
    console.log('  Roles seeded');

    /* ── 5. Assign roles ────────────────────────── */
    for (const u of authUsers) {
        await sql`
            INSERT INTO user_roles (organization_id, user_id, role_id)
            VALUES (${orgId}, ${u.id}, ${roleIds[u.role]})
            ON CONFLICT (organization_id, user_id, role_id) DO NOTHING
        `;
    }
    console.log('  User roles assigned');

    /* ── 6. Cohorts (two cohorts) ──────────────── */
    const [cohort1] = await sql`
        INSERT INTO cohorts (organization_id, name, code, start_date, end_date)
        VALUES (${orgId}, 'Cohort 2026-A', 'C2026A', '2026-01-01', '2026-06-30')
        ON CONFLICT DO NOTHING RETURNING id
    `;
    const [cohort2] = await sql`
        INSERT INTO cohorts (organization_id, name, code, start_date, end_date)
        VALUES (${orgId}, 'Cohort 2026-B', 'C2026B', '2026-03-01', '2026-09-30')
        ON CONFLICT DO NOTHING RETURNING id
    `;
    const cohort1Id = cohort1?.id;
    const cohort2Id = cohort2?.id;

    // Build a lookup from user ID → role for correct user_cohorts.role values
    const roleMap = Object.fromEntries(authUsers.map(u => [u.id, u.role === 'team_leader' ? 'student' : u.role]));

    // Cohort 1 members: admin, instructor1, students 1-7, leader1
    const cohort1Users = [ADMIN_ID, INSTRUCTOR_1_ID, STUDENT_1_ID, STUDENT_2_ID, STUDENT_3_ID,
        LEADER_1_ID, STUDENT_4_ID, STUDENT_5_ID, STUDENT_6_ID, STUDENT_7_ID, STUDENT_8_ID];
    // Cohort 2 members: admin, instructor2, students 9-12, leader2
    const cohort2Users = [ADMIN_ID, INSTRUCTOR_2_ID, LEADER_2_ID, STUDENT_9_ID, STUDENT_10_ID,
        STUDENT_11_ID, STUDENT_12_ID];

    if (cohort1Id) {
        for (const uid of cohort1Users) {
            await sql`INSERT INTO user_cohorts (organization_id, user_id, cohort_id, role)
                      VALUES (${orgId}, ${uid}, ${cohort1Id}, ${roleMap[uid] || 'student'})
                      ON CONFLICT (organization_id, user_id, cohort_id) DO UPDATE SET role = EXCLUDED.role`;
        }
    }
    if (cohort2Id) {
        for (const uid of cohort2Users) {
            await sql`INSERT INTO user_cohorts (organization_id, user_id, cohort_id, role)
                      VALUES (${orgId}, ${uid}, ${cohort2Id}, ${roleMap[uid] || 'student'})
                      ON CONFLICT (organization_id, user_id, cohort_id) DO UPDATE SET role = EXCLUDED.role`;
        }
    }
    console.log('  Cohorts seeded');

    /* ── 7. Courses (4 courses, assigned to cohorts) ─── */
    const courseDefs = [
        { name: 'Full-Stack Web Development', desc: 'Build modern web applications with React, Node.js, and PostgreSQL. Covers REST APIs, authentication, and deployment.', instructor: INSTRUCTOR_1_ID },
        { name: 'Data Structures & Algorithms', desc: 'Master fundamental CS concepts: arrays, trees, graphs, sorting, dynamic programming, and Big-O analysis.', instructor: INSTRUCTOR_1_ID },
        { name: 'Mobile App Development', desc: 'Create cross-platform mobile apps with React Native. Covers navigation, state management, and native APIs.', instructor: INSTRUCTOR_2_ID },
        { name: 'Cloud & DevOps Engineering', desc: 'Learn Docker, Kubernetes, CI/CD pipelines, AWS services, and infrastructure as code with Terraform.', instructor: INSTRUCTOR_2_ID },
    ];

    const courseIds = [];
    for (const c of courseDefs) {
        const [course] = await sql`
            INSERT INTO courses (organization_id, name, description, created_by)
            VALUES (${orgId}, ${c.name}, ${c.desc}, ${c.instructor})
            ON CONFLICT DO NOTHING RETURNING id
        `;
        if (course) courseIds.push(course.id);
    }

    // Assign courses to cohorts via cohort_courses junction table
    if (cohort1Id && courseIds.length >= 2) {
        await sql`INSERT INTO cohort_courses (organization_id, cohort_id, course_id) VALUES (${orgId}, ${cohort1Id}, ${courseIds[0]}) ON CONFLICT DO NOTHING`;
        await sql`INSERT INTO cohort_courses (organization_id, cohort_id, course_id) VALUES (${orgId}, ${cohort1Id}, ${courseIds[1]}) ON CONFLICT DO NOTHING`;
    }
    if (cohort2Id && courseIds.length >= 4) {
        await sql`INSERT INTO cohort_courses (organization_id, cohort_id, course_id) VALUES (${orgId}, ${cohort2Id}, ${courseIds[2]}) ON CONFLICT DO NOTHING`;
        await sql`INSERT INTO cohort_courses (organization_id, cohort_id, course_id) VALUES (${orgId}, ${cohort2Id}, ${courseIds[3]}) ON CONFLICT DO NOTHING`;
    }
    // Also assign course 0 to cohort 2 (shared course)
    if (cohort2Id && courseIds.length >= 1) {
        await sql`INSERT INTO cohort_courses (organization_id, cohort_id, course_id) VALUES (${orgId}, ${cohort2Id}, ${courseIds[0]}) ON CONFLICT DO NOTHING`;
    }
    console.log('  Courses & cohort_courses seeded');

    /* ── 8. Teams (4 teams across courses) ──────── */
    const teamDefs = [
        { name: 'The Debugging Ducks', courseIdx: 0, cohortId: cohort1Id, leader: LEADER_1_ID, members: [STUDENT_1_ID, STUDENT_2_ID, STUDENT_3_ID] },
        { name: 'Syntax Samurai', courseIdx: 0, cohortId: cohort1Id, leader: STUDENT_4_ID, members: [STUDENT_5_ID, STUDENT_6_ID, STUDENT_7_ID, STUDENT_8_ID] },
        { name: 'Binary Sages', courseIdx: 1, cohortId: cohort1Id, leader: LEADER_1_ID, members: [STUDENT_1_ID, STUDENT_4_ID, STUDENT_6_ID] },
        { name: 'Cloud Ninjas', courseIdx: 2, cohortId: cohort2Id, leader: LEADER_2_ID, members: [STUDENT_9_ID, STUDENT_10_ID, STUDENT_11_ID, STUDENT_12_ID] },
    ];

    const teamIds = [];
    for (const t of teamDefs) {
        if (!courseIds[t.courseIdx]) continue;
        const [team] = await sql`
            INSERT INTO teams (organization_id, course_id, cohort_id, name, team_leader_id, created_by)
            VALUES (${orgId}, ${courseIds[t.courseIdx]}, ${t.cohortId}, ${t.name}, ${t.leader}, ${INSTRUCTOR_1_ID})
            ON CONFLICT (course_id, name) DO UPDATE SET team_leader_id = EXCLUDED.team_leader_id
            RETURNING id
        `;
        teamIds.push(team.id);

        // Add leader + members
        const allMembers = [t.leader, ...t.members];
        for (const uid of allMembers) {
            await sql`INSERT INTO team_members (organization_id, team_id, user_id) VALUES (${orgId}, ${team.id}, ${uid}) ON CONFLICT (team_id, user_id) DO NOTHING`;
        }
    }
    console.log('  Teams & members seeded');

    /* ── 9. Tasks (8 diverse tasks) ────────────── */
    const taskDefs = [
        { title: 'Build REST API', desc: 'Create an Express REST API with CRUD endpoints, input validation, and error handling. Include Swagger docs.', courseIdx: 0, cohortId: cohort1Id, priority: 'high', dueOffset: 30, type: 'team' },
        { title: 'React Dashboard UI', desc: 'Build a responsive dashboard with Recharts graphs, dark mode support, and real-time data updates via WebSocket.', courseIdx: 0, cohortId: cohort1Id, priority: 'high', dueOffset: 45, type: 'team' },
        { title: 'Binary Search Tree Implementation', desc: 'Implement a BST with insert, delete, search, inorder, preorder, and level-order traversal. Include unit tests.', courseIdx: 1, cohortId: cohort1Id, priority: 'medium', dueOffset: 14, type: 'individual' },
        { title: 'Algorithm Complexity Report', desc: 'Analyze time and space complexity of 5 sorting algorithms. Include benchmark results and comparison charts.', courseIdx: 1, cohortId: cohort1Id, priority: 'low', dueOffset: 21, type: 'individual' },
        { title: 'Mobile Onboarding Flow', desc: 'Design and implement a 3-step onboarding screen with animations, skip functionality, and progress indicators.', courseIdx: 2, cohortId: cohort2Id, priority: 'medium', dueOffset: 20, type: 'team' },
        { title: 'Docker Compose Setup', desc: 'Create a Docker Compose file for a full-stack app with Node.js backend, React frontend, PostgreSQL, and Redis.', courseIdx: 3, cohortId: cohort2Id, priority: 'high', dueOffset: 10, type: 'cohort' },
        { title: 'Authentication System', desc: 'Implement JWT authentication with login, register, password reset, and role-based access control.', courseIdx: 0, cohortId: cohort1Id, priority: 'high', dueOffset: -5, type: 'individual' },
        { title: 'CI/CD Pipeline', desc: 'Set up GitHub Actions CI/CD pipeline with linting, testing, and automated deployment to staging.', courseIdx: 3, cohortId: cohort2Id, priority: 'medium', dueOffset: 35, type: 'individual' },
    ];

    const taskIds = [];
    const now = new Date();
    for (const t of taskDefs) {
        if (!courseIds[t.courseIdx]) continue;
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + t.dueOffset);
        const [task] = await sql`
            INSERT INTO tasks (organization_id, course_id, cohort_id, title, description, priority, due_date, assignment_type, created_by)
            VALUES (${orgId}, ${courseIds[t.courseIdx]}, ${t.cohortId}, ${t.title}, ${t.desc},
                    ${t.priority}::task_priority, ${dueDate.toISOString()}, ${t.type}::assignment_type, ${INSTRUCTOR_1_ID})
            ON CONFLICT DO NOTHING RETURNING id
        `;
        taskIds.push(task?.id);
    }

    // Task assignments
    // Task 0 (Build REST API) - team assignment to team 0 (Debugging Ducks)
    if (taskIds[0] && teamIds[0]) {
        await sql`INSERT INTO task_team_assignments (organization_id, task_id, team_id, assigned_by) VALUES (${orgId}, ${taskIds[0]}, ${teamIds[0]}, ${INSTRUCTOR_1_ID}) ON CONFLICT DO NOTHING`;
    }
    // Task 1 (React Dashboard) - team assignment to team 1 (Syntax Samurai)
    if (taskIds[1] && teamIds[1]) {
        await sql`INSERT INTO task_team_assignments (organization_id, task_id, team_id, assigned_by) VALUES (${orgId}, ${taskIds[1]}, ${teamIds[1]}, ${INSTRUCTOR_1_ID}) ON CONFLICT DO NOTHING`;
    }
    // Task 2 (BST) - individual assignments
    if (taskIds[2]) {
        for (const sid of [STUDENT_1_ID, STUDENT_2_ID, STUDENT_3_ID, STUDENT_4_ID, STUDENT_5_ID]) {
            await sql`INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_by) VALUES (${orgId}, ${taskIds[2]}, ${sid}, ${INSTRUCTOR_1_ID}) ON CONFLICT DO NOTHING`;
        }
    }
    // Task 3 (Algorithm Report) - individual assignments
    if (taskIds[3]) {
        for (const sid of [STUDENT_1_ID, STUDENT_6_ID, STUDENT_7_ID]) {
            await sql`INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_by) VALUES (${orgId}, ${taskIds[3]}, ${sid}, ${INSTRUCTOR_1_ID}) ON CONFLICT DO NOTHING`;
        }
    }
    // Task 4 (Mobile Onboarding) - team assignment to Cloud Ninjas
    if (taskIds[4] && teamIds[3]) {
        await sql`INSERT INTO task_team_assignments (organization_id, task_id, team_id, assigned_by) VALUES (${orgId}, ${taskIds[4]}, ${teamIds[3]}, ${INSTRUCTOR_2_ID}) ON CONFLICT DO NOTHING`;
    }
    // Task 5 (Docker Compose) - cohort-wide, assign all cohort2 students
    if (taskIds[5] && cohort2Id) {
        for (const sid of [LEADER_2_ID, STUDENT_9_ID, STUDENT_10_ID, STUDENT_11_ID, STUDENT_12_ID]) {
            await sql`INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_by) VALUES (${orgId}, ${taskIds[5]}, ${sid}, ${INSTRUCTOR_2_ID}) ON CONFLICT DO NOTHING`;
        }
    }
    // Task 6 (Auth System - overdue) - individual
    if (taskIds[6]) {
        for (const sid of [STUDENT_1_ID, STUDENT_2_ID, STUDENT_8_ID]) {
            await sql`INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_by) VALUES (${orgId}, ${taskIds[6]}, ${sid}, ${INSTRUCTOR_1_ID}) ON CONFLICT DO NOTHING`;
        }
    }
    // Task 7 (CI/CD Pipeline) - individual
    if (taskIds[7]) {
        for (const sid of [STUDENT_9_ID, STUDENT_10_ID, STUDENT_11_ID]) {
            await sql`INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_by) VALUES (${orgId}, ${taskIds[7]}, ${sid}, ${INSTRUCTOR_2_ID}) ON CONFLICT DO NOTHING`;
        }
    }
    console.log('  Tasks & assignments seeded');

    /* ── 10. Submissions (with various statuses & grades) ── */
    const submissionDefs = [
        // Sherlock submitted BST (task 2) - accepted with perfect score
        { taskIdx: 2, teamIdx: null, student: STUDENT_1_ID, status: 'accepted', grade: 98, feedback: 'Excellent implementation with clean code and comprehensive tests.', github: 'https://github.com/sherlock/bst-implementation', comment: 'Implemented all traversal methods with O(log n) complexity' },
        // Ada submitted BST (task 2) - accepted
        { taskIdx: 2, teamIdx: null, student: STUDENT_2_ID, status: 'accepted', grade: 92, feedback: 'Great work! Minor edge case handling could be improved.', github: 'https://github.com/ada/bst-solution', comment: 'Includes visualization helper' },
        // Nikola submitted BST (task 2) - submitted (pending review)
        { taskIdx: 2, teamIdx: null, student: STUDENT_3_ID, status: 'submitted', grade: null, feedback: null, github: 'https://github.com/nikola/bst', comment: 'Ready for review' },
        // Rosalind submitted BST (task 2) - revision requested
        { taskIdx: 2, teamIdx: null, student: STUDENT_4_ID, status: 'revision_requested', grade: null, feedback: 'Delete operation has a bug with two-child nodes. Please fix and resubmit.', github: 'https://github.com/rosalind/bst-attempt', comment: 'First attempt' },
        // Sherlock submitted Auth System (task 6 - overdue) - accepted
        { taskIdx: 6, teamIdx: null, student: STUDENT_1_ID, status: 'accepted', grade: 100, feedback: 'Perfect! Role-based access control is production-ready.', github: 'https://github.com/sherlock/auth-system', comment: 'Complete auth with refresh tokens' },
        // Ada submitted Auth System - submitted
        { taskIdx: 6, teamIdx: null, student: STUDENT_2_ID, status: 'submitted', grade: null, feedback: null, github: 'https://github.com/ada/auth-jwt', comment: 'Implemented JWT with bcrypt' },
        // Build REST API - team submission
        { taskIdx: 0, teamIdx: 0, student: LEADER_1_ID, status: 'accepted', grade: 88, feedback: 'Well-structured API. Swagger docs are thorough. Consider adding rate limiting.', github: 'https://github.com/debugging-ducks/rest-api', comment: 'Team effort - full CRUD with validation' },
        // Algorithm Report - Sherlock (100% student)
        { taskIdx: 3, teamIdx: null, student: STUDENT_1_ID, status: 'accepted', grade: 95, feedback: 'Thorough analysis with excellent benchmarks.', github: 'https://github.com/sherlock/algo-report', comment: 'Comparative analysis of 5 algorithms' },
    ];

    for (const s of submissionDefs) {
        if (!taskIds[s.taskIdx]) continue;
        const [sub] = await sql`
            INSERT INTO submissions (organization_id, task_id, team_id, submitted_by, status, github_link, comment, grade, feedback)
            VALUES (${orgId}, ${taskIds[s.taskIdx]}, ${s.teamIdx != null ? teamIds[s.teamIdx] : null},
                    ${s.student}, ${s.status}, ${s.github}, ${s.comment}, ${s.grade}, ${s.feedback})
            ON CONFLICT DO NOTHING RETURNING id
        `;
    }

    // Mark tasks with submissions as submitted/accepted
    if (taskIds[6]) await sql`UPDATE tasks SET status = 'submitted' WHERE id = ${taskIds[6]} AND deleted_at IS NULL`;
    if (taskIds[0]) await sql`UPDATE tasks SET status = 'accepted' WHERE id = ${taskIds[0]} AND deleted_at IS NULL`;
    console.log('  Submissions seeded');

    /* ── 11. Attendance records (past 7 days) ────── */
    const attendanceStudents = [STUDENT_1_ID, STUDENT_2_ID, STUDENT_3_ID, STUDENT_4_ID,
        STUDENT_5_ID, STUDENT_6_ID, STUDENT_7_ID, STUDENT_8_ID,
        STUDENT_9_ID, STUDENT_10_ID, LEADER_1_ID, LEADER_2_ID];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date();
        date.setDate(date.getDate() - dayOffset);
        const dateStr = date.toISOString().split('T')[0];

        // Not everyone checks in every day (some randomness)
        const checkingIn = attendanceStudents.filter((_, i) => {
            if (dayOffset === 0) return i < 8; // Today: 8 people
            return (i + dayOffset) % 3 !== 0;  // Other days: skip some
        });

        for (const uid of checkingIn) {
            const checkIn = new Date(date);
            checkIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0);
            const checkOut = dayOffset === 0 ? null : new Date(date);
            if (checkOut) {
                checkOut.setHours(15 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0);
            }

            const notes = ['Working on assignments', 'Group project meeting', 'Lab session', 'Self-study period', null];
            const note = notes[Math.floor(Math.random() * notes.length)];

            await sql`
                INSERT INTO attendance (organization_id, user_id, date, check_in_time, check_out_time, notes, status)
                VALUES (${orgId}, ${uid}, ${dateStr}, ${checkIn.toISOString()}, ${checkOut ? checkOut.toISOString() : null}, ${note}, 'present')
                ON CONFLICT (user_id, date) DO NOTHING
            `;
        }
    }
    console.log('  Attendance records seeded (7 days)');

    /* ── 12. Chat rooms & messages ────────────────── */
    // General room
    const [generalRoom] = await sql`
        INSERT INTO chat_rooms (organization_id, room_name, room_type, created_by)
        VALUES (${orgId}, 'General Chat', 'general', ${ADMIN_ID})
        ON CONFLICT DO NOTHING RETURNING id
    `;

    // Course rooms
    const courseRoomIds = [];
    for (let i = 0; i < courseIds.length; i++) {
        const [room] = await sql`
            INSERT INTO chat_rooms (organization_id, room_name, room_type, course_id, created_by)
            VALUES (${orgId}, ${courseDefs[i].name + ' Chat'}, 'course', ${courseIds[i]}, ${INSTRUCTOR_1_ID})
            ON CONFLICT DO NOTHING RETURNING id
        `;
        courseRoomIds.push(room?.id);
    }

    // Team rooms
    const teamRoomIds = [];
    for (let i = 0; i < teamIds.length; i++) {
        const ci = teamDefs[i].courseIdx;
        const [room] = await sql`
            INSERT INTO chat_rooms (organization_id, room_name, room_type, course_id, team_id, created_by)
            VALUES (${orgId}, ${teamDefs[i].name + ' Chat'}, 'team', ${courseIds[ci]}, ${teamIds[i]}, ${INSTRUCTOR_1_ID})
            ON CONFLICT DO NOTHING RETURNING id
        `;
        teamRoomIds.push(room?.id);
    }

    // Seed messages
    const chatMessages = [
        { roomId: generalRoom?.id, sender: ADMIN_ID, content: 'Welcome everyone to HubConnect Academy! Feel free to introduce yourselves.' },
        { roomId: generalRoom?.id, sender: STUDENT_1_ID, content: 'Hello! Excited to be here. Looking forward to the full-stack course.' },
        { roomId: generalRoom?.id, sender: STUDENT_2_ID, content: 'Hi all! Alice here. Ready to build some amazing things.' },
        { roomId: generalRoom?.id, sender: INSTRUCTOR_1_ID, content: 'Welcome class! Please check your task assignments and feel free to reach out if you have questions.' },
        { roomId: generalRoom?.id, sender: STUDENT_5_ID, content: 'Greetings! Can we discuss the project requirements?' },
        { roomId: generalRoom?.id, sender: STUDENT_7_ID, content: 'Looking forward to the algorithms course especially.' },

        { roomId: teamRoomIds[0], sender: LEADER_1_ID, content: 'Team Debugging Ducks assemble! Let us plan our REST API sprint.' },
        { roomId: teamRoomIds[0], sender: STUDENT_1_ID, content: 'I can handle the authentication middleware.' },
        { roomId: teamRoomIds[0], sender: STUDENT_2_ID, content: 'I will work on the database schema and models.' },
        { roomId: teamRoomIds[0], sender: STUDENT_3_ID, content: 'I will set up the testing framework and write the E2E tests.' },

        { roomId: teamRoomIds[1], sender: STUDENT_4_ID, content: 'Syntax Samurai team meeting at 3 PM today!' },
        { roomId: teamRoomIds[1], sender: STUDENT_5_ID, content: 'Sounds good. I have some mockups ready to share.' },
    ];

    for (const m of chatMessages) {
        if (!m.roomId) continue;
        await sql`
            INSERT INTO messages (organization_id, chat_room_id, sender_id, content)
            VALUES (${orgId}, ${m.roomId}, ${m.sender}, ${m.content})
        `;
    }
    console.log('  Chat rooms & messages seeded');

    /* ── 13. Notifications ─────────────────────── */
    const notifDefs = [
        { recipient: STUDENT_1_ID, actor: INSTRUCTOR_1_ID, type: 'task_assigned', title: 'New Task Assigned', message: 'You have been assigned "Build REST API".' },
        { recipient: STUDENT_1_ID, actor: INSTRUCTOR_1_ID, type: 'task_assigned', title: 'New Task Assigned', message: 'You have been assigned "Binary Search Tree Implementation".' },
        { recipient: STUDENT_2_ID, actor: INSTRUCTOR_1_ID, type: 'task_assigned', title: 'New Task Assigned', message: 'You have been assigned "Authentication System".' },
        { recipient: STUDENT_4_ID, actor: INSTRUCTOR_1_ID, type: 'task_rejected', title: 'Revision Requested', message: 'Your BST submission needs revision. Check the feedback.' },
        { recipient: LEADER_1_ID, actor: INSTRUCTOR_1_ID, type: 'task_accepted', title: 'Submission Accepted', message: 'Your REST API submission has been accepted! Score: 88/100.' },
        { recipient: STUDENT_9_ID, actor: INSTRUCTOR_2_ID, type: 'task_assigned', title: 'New Task Assigned', message: 'You have been assigned "Docker Compose Setup".' },
    ];

    for (const n of notifDefs) {
        await sql`
            INSERT INTO notifications (organization_id, recipient_id, actor_id, notification_type, title, message)
            VALUES (${orgId}, ${n.recipient}, ${n.actor}, ${n.type}, ${n.title}, ${n.message})
            ON CONFLICT DO NOTHING
        `;
    }
    console.log('  Notifications seeded');

    console.log('\n✅ Seeding complete!');
    console.log('\n  Demo accounts:');
    console.log('    admin@hub.com       / admin123  (Admin)');
    console.log('    instructor@hub.com  / inst123   (Instructor)');
    console.log('    sherlock@hub.com    / stud123   (Student)');
    console.log('    leader@hub.com     / lead123   (Team Leader)');
    console.log('    ada@hub.com        / stud123   (Student)');
    console.log('    ... and 12 more accounts with password: stud123 or lead123\n');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
