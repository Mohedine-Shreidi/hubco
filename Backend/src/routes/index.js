import { Router } from 'express';

import authRoutes from './auth.routes.js';
import organizationsRoutes from './organizations.routes.js';
import profilesRoutes from './profiles.routes.js';
import rolesRoutes from './roles.routes.js';
import cohortsRoutes from './cohorts.routes.js';
import coursesRoutes from './courses.routes.js';
import teamsRoutes from './teams.routes.js';
import tasksRoutes from './tasks.routes.js';
import submissionsRoutes from './submissions.routes.js';
import chatRoutes from './chat.routes.js';
import notificationsRoutes from './notifications.routes.js';
import analyticsRoutes from './analytics.routes.js';
import filesRoutes from './files.routes.js';
import activityLogsRoutes from './activityLogs.routes.js';
import attendanceRoutes from './attendance.routes.js';
import reportsRoutes from './reports.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/organizations', organizationsRoutes);
router.use('/profiles', profilesRoutes);
router.use('/roles', rolesRoutes);
router.use('/cohorts', cohortsRoutes);
router.use('/courses', coursesRoutes);
router.use('/teams', teamsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/submissions', submissionsRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/files', filesRoutes);
router.use('/activity-logs', activityLogsRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/reports', reportsRoutes);

export default router;
