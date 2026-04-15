/**
 * Reports routes  (admin / instructor)
 * GET /api/reports/daily?date=YYYY-MM-DD
 * GET /api/reports/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 * GET /api/reports/student/:id
 * GET /api/reports/summary
 */
import { Router } from 'express';
import sql from '../db/index.js';
import authenticate from '../middleware/authenticate.js';
import { authorize, cohortFilter } from '../middleware/rbac.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'instructor'));

/* ── GET /reports/daily?date= ─────────────────────────────────────────────── */
router.get('/daily', async (req, res, next) => {
    try {
        const date = req.query.date ?? new Date().toISOString().slice(0, 10);
        const { isAdmin, cohortIds } = cohortFilter(req.user);

        const [{ total }] = isAdmin
            ? await sql`SELECT COUNT(*) AS total FROM profiles WHERE role = 'student'`
            : await sql`
                SELECT COUNT(DISTINCT uc.user_id) AS total
                FROM user_cohorts uc
                JOIN profiles p ON p.id = uc.user_id
                WHERE uc.cohort_id = ANY(${cohortIds ?? []}::uuid[])
                  AND p.role = 'student'
              `;

        const attendance = isAdmin
            ? await sql`
                SELECT a.*, p.full_name, p.avatar_url, tm.team_id, t.name AS team_name
                FROM attendance a
                JOIN profiles p ON p.id = a.user_id
                LEFT JOIN team_members tm ON tm.user_id = a.user_id
                LEFT JOIN teams t ON t.id = tm.team_id
                WHERE a.date = ${date}
                ORDER BY p.full_name
              `
            : await sql`
                SELECT a.*, p.full_name, p.avatar_url, tm.team_id, t.name AS team_name
                FROM attendance a
                JOIN profiles p ON p.id = a.user_id
                JOIN user_cohorts uc ON uc.user_id = a.user_id AND uc.cohort_id = ANY(${cohortIds ?? []}::uuid[])
                LEFT JOIN team_members tm ON tm.user_id = a.user_id
                LEFT JOIN teams t ON t.id = tm.team_id
                WHERE a.date = ${date}
                ORDER BY p.full_name
              `;

        const presentCount = attendance.filter(r => r.status === 'present').length;
        const absentCount  = Number(total) - presentCount;

        const tasks = isAdmin
            ? await sql`
                SELECT t.*, tm.name AS team_name
                FROM tasks t
                LEFT JOIN teams tm ON tm.id = t.team_id
                WHERE t.due_date::date = ${date}::date
                ORDER BY t.status
              `
            : await sql`
                SELECT t.*, tm.name AS team_name
                FROM tasks t
                LEFT JOIN teams tm ON tm.id = t.team_id
                WHERE t.due_date::date = ${date}::date
                  AND t.course_id IN (SELECT id FROM courses WHERE cohort_id = ANY(${cohortIds ?? []}::uuid[]))
                ORDER BY t.status
              `;

        return successResponse(res, 'Daily report retrieved successfully.', {
            date,
            attendance: { total: Number(total), present: presentCount, absent: absentCount, records: attendance },
            tasks,
        });
    } catch (err) { next(err); }
});

/* ── GET /reports/range?start=&end= ─────────────────────────────────────────── */
router.get('/range', async (req, res, next) => {
    try {
        const start = req.query.start ?? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        const end   = req.query.end   ?? new Date().toISOString().slice(0, 10);
        const { isAdmin, cohortIds } = cohortFilter(req.user);

        const attendance = isAdmin
            ? await sql`
                SELECT a.date,
                    COUNT(*) FILTER (WHERE a.status = 'present') AS present,
                    COUNT(*) FILTER (WHERE a.status = 'absent')  AS absent,
                    COUNT(*) FILTER (WHERE a.status = 'late')    AS late
                FROM attendance a
                WHERE a.date BETWEEN ${start}::date AND ${end}::date
                GROUP BY a.date ORDER BY a.date
              `
            : await sql`
                SELECT a.date,
                    COUNT(*) FILTER (WHERE a.status = 'present') AS present,
                    COUNT(*) FILTER (WHERE a.status = 'absent')  AS absent,
                    COUNT(*) FILTER (WHERE a.status = 'late')    AS late
                FROM attendance a
                JOIN user_cohorts uc ON uc.user_id = a.user_id AND uc.cohort_id = ANY(${cohortIds ?? []}::uuid[])
                WHERE a.date BETWEEN ${start}::date AND ${end}::date
                GROUP BY a.date ORDER BY a.date
              `;

        const tasks = isAdmin
            ? await sql`
                SELECT t.due_date::date AS date,
                    COUNT(*) FILTER (WHERE t.status IN ('submitted','approved')) AS completed,
                    COUNT(*) FILTER (WHERE t.status IN ('pending','in_progress')) AS pending,
                    COUNT(*) AS total
                FROM tasks t
                WHERE t.due_date::date BETWEEN ${start}::date AND ${end}::date
                GROUP BY t.due_date::date ORDER BY t.due_date::date
              `
            : await sql`
                SELECT t.due_date::date AS date,
                    COUNT(*) FILTER (WHERE t.status IN ('submitted','approved')) AS completed,
                    COUNT(*) FILTER (WHERE t.status IN ('pending','in_progress')) AS pending,
                    COUNT(*) AS total
                FROM tasks t
                WHERE t.due_date::date BETWEEN ${start}::date AND ${end}::date
                  AND t.course_id IN (SELECT id FROM courses WHERE cohort_id = ANY(${cohortIds ?? []}::uuid[]))
                GROUP BY t.due_date::date ORDER BY t.due_date::date
              `;

        return successResponse(res, 'Range report retrieved successfully.', { start, end, attendance, tasks });
    } catch (err) { next(err); }
});

/* ── GET /reports/student/:id ─────────────────────────────────────────────── */
router.get('/student/:id', async (req, res, next) => {
    try {
        const { isAdmin, cohortIds } = cohortFilter(req.user);

        // Instructors may only view students in their cohorts
        if (!isAdmin) {
            const [membership] = await sql`
                SELECT 1 FROM user_cohorts
                WHERE user_id = ${req.params.id}
                  AND cohort_id = ANY(${cohortIds ?? []}::uuid[])
                LIMIT 1
            `;
            if (!membership) return errorResponse(res, 'Access denied to this student report.', 403);
        }

        const [profile] = await sql`
            SELECT p.*, t.name AS team_name
            FROM profiles p
            LEFT JOIN team_members tm ON tm.user_id = p.id
            LEFT JOIN teams t ON t.id = tm.team_id
            WHERE p.id = ${req.params.id}
        `;
        if (!profile) return errorResponse(res, 'Student not found.', 404);

        const attendance = await sql`
            SELECT * FROM attendance
            WHERE user_id = ${req.params.id}
            ORDER BY date DESC
            LIMIT 60
        `;
        const tasks = await sql`
            SELECT t.*
            FROM tasks t
            JOIN task_assignments ta ON ta.task_id = t.id
            WHERE ta.user_id = ${req.params.id}
            ORDER BY t.due_date DESC
        `;
        const submissions = await sql`
            SELECT s.*, t.title AS task_title
            FROM submissions s
            JOIN tasks t ON t.id = s.task_id
            WHERE s.submitted_by = ${req.params.id}
            ORDER BY s.submitted_at DESC
        `;

        const presentDays = attendance.filter(r => r.status === 'present').length;
        const totalDays   = attendance.length;
        const attendanceRate = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;
        const submittedTasks = submissions.length;
        const onTimeTasks = submissions.filter(s => s.status === 'on_time' || s.status === 'submitted').length;
        const lateTasks = submissions.filter(s => s.status === 'late').length;
        const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;

        // Calculate daily hours from attendance records
        const dailyHours = attendance
            .filter(r => r.check_in_time)
            .map(r => {
                const hrs = r.check_out_time
                    ? ((new Date(r.check_out_time) - new Date(r.check_in_time)) / 3600000).toFixed(1)
                    : 0;
                return { date: r.date?.toISOString?.()?.slice(0, 10) ?? String(r.date).slice(0, 10), hours: parseFloat(hrs) };
            })
            .reverse();

        const totalHours = dailyHours.reduce((sum, d) => sum + d.hours, 0).toFixed(1);
        const avgDailyHours = dailyHours.length ? (totalHours / dailyHours.length).toFixed(1) : '0';

        // Performance score: 40% attendance + 30% on-time rate + 30% completion rate
        const completionRate = tasks.length ? (submittedTasks / tasks.length) * 100 : 0;
        const onTimeRate = submittedTasks ? (onTimeTasks / submittedTasks) * 100 : 0;
        const performanceScore = Math.round(attendanceRate * 0.4 + onTimeRate * 0.3 + completionRate * 0.3);

        return successResponse(res, 'Student report retrieved successfully.', {
            student: {
                id: profile.id,
                name: profile.full_name || profile.email,
                email: profile.email,
                role: profile.role,
                teamName: profile.team_name || null,
            },
            attendance: {
                daysPresent: presentDays,
                totalDays,
                attendanceRate,
                totalHours: parseFloat(totalHours),
                avgDailyHours: parseFloat(avgDailyHours),
            },
            tasks: {
                total: tasks.length,
                submitted: submittedTasks,
                onTime: onTimeTasks,
                late: lateTasks,
                pending: pendingTasks,
            },
            performanceScore,
            dailyHours,
            attendanceLog: attendance.map(r => ({
                date: r.date,
                check_in_time: r.check_in_time,
                check_out_time: r.check_out_time,
                hours: r.check_in_time && r.check_out_time
                    ? ((new Date(r.check_out_time) - new Date(r.check_in_time)) / 3600000).toFixed(1)
                    : null,
                notes: r.notes,
                status: r.status,
            })),
        });
    } catch (err) { next(err); }
});

/* ── GET /reports/summary ─────────────────────────────────────────────────── */
router.get('/summary', async (req, res, next) => {
    try {
        const { isAdmin, cohortIds } = cohortFilter(req.user);

        const students = isAdmin
            ? await sql`
                SELECT
                    p.id, p.full_name, p.email, p.role,
                    t.name AS team_name,
                    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'present') AS days_present,
                    COUNT(DISTINCT a.id) AS total_attendance_days,
                    COUNT(DISTINCT ta.task_id) AS total_tasks,
                    COUNT(DISTINCT s.id) AS tasks_completed
                FROM profiles p
                LEFT JOIN team_members tm ON tm.user_id = p.id
                LEFT JOIN teams t ON t.id = tm.team_id
                LEFT JOIN attendance a ON a.user_id = p.id
                LEFT JOIN task_assignments ta ON ta.user_id = p.id
                LEFT JOIN submissions s ON s.submitted_by = p.id
                WHERE p.role = 'student'
                GROUP BY p.id, p.full_name, p.email, p.role, t.name
                ORDER BY p.full_name
              `
            : await sql`
                SELECT
                    p.id, p.full_name, p.email, p.role,
                    t.name AS team_name,
                    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'present') AS days_present,
                    COUNT(DISTINCT a.id) AS total_attendance_days,
                    COUNT(DISTINCT ta.task_id) AS total_tasks,
                    COUNT(DISTINCT s.id) AS tasks_completed
                FROM profiles p
                JOIN user_cohorts uc ON uc.user_id = p.id AND uc.cohort_id = ANY(${cohortIds ?? []}::uuid[])
                LEFT JOIN team_members tm ON tm.user_id = p.id
                LEFT JOIN teams t ON t.id = tm.team_id
                LEFT JOIN attendance a ON a.user_id = p.id
                LEFT JOIN task_assignments ta ON ta.user_id = p.id
                LEFT JOIN submissions s ON s.submitted_by = p.id
                WHERE p.role = 'student'
                GROUP BY p.id, p.full_name, p.email, p.role, t.name
                ORDER BY p.full_name
              `;

        const result = students.map(s => {
            const attendanceRate = s.total_attendance_days > 0
                ? Math.round((Number(s.days_present) / Number(s.total_attendance_days)) * 100) : 0;
            const completionRate = s.total_tasks > 0
                ? Math.round((Number(s.tasks_completed) / Number(s.total_tasks)) * 100) : 0;
            const performanceScore = Math.round(attendanceRate * 0.5 + completionRate * 0.5);
            return {
                id: s.id,
                name: s.full_name || s.email,
                email: s.email,
                role: s.role,
                teamName: s.team_name || null,
                attendanceRate,
                tasksCompleted: Number(s.tasks_completed),
                totalTasks: Number(s.total_tasks),
                performanceScore,
            };
        });

        return successResponse(res, 'Summary report retrieved successfully.', result);
    } catch (err) { next(err); }
});

export default router;
