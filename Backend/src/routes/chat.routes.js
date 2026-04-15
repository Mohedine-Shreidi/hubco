/**
 * Chat routes — team/cohort scoped
 *
 * GET  /api/chat/rooms
 * POST /api/chat/rooms
 * GET  /api/chat/rooms/:id/messages
 * POST /api/chat/rooms/:id/messages
 * GET  /api/chat/users
 * POST /api/chat/dm/:userId
 * POST /api/chat/rooms/team/:teamId   — get/create team chat room
 */
import { Router } from 'express';
import { body } from 'express-validator';
import sql from '../db/index.js';
import authenticate from '../middleware/authenticate.js';
import { authorize, cohortFilter } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();
router.use(authenticate);

/* GET /chat/rooms — scoped by role/cohort/team */
router.get('/rooms', async (req, res, next) => {
    try {
        const { role, id: userId } = req.user;
        const { isAdmin, cohortIds } = cohortFilter(req.user);

        // Ensure general room exists
        const [existingGeneral] = await sql`SELECT id FROM chat_rooms WHERE room_type = 'general' LIMIT 1`;
        if (!existingGeneral) {
            const [org] = await sql`SELECT id FROM organizations LIMIT 1`;
            if (org) await sql`INSERT INTO chat_rooms (organization_id, room_name, room_type, created_by) VALUES (${org.id}, 'General', 'general', ${userId}) ON CONFLICT DO NOTHING`;
        }

        let rooms;
        if (isAdmin) {
            // Admin sees everything
            rooms = await sql`
                SELECT cr.*, c.name AS course_name, t.name AS team_name, co.name AS cohort_name
                FROM chat_rooms cr
                LEFT JOIN courses co_c ON co_c.id = cr.course_id
                LEFT JOIN courses c ON c.id = cr.course_id
                LEFT JOIN teams t ON t.id = cr.team_id
                LEFT JOIN cohorts co ON co.id = cr.cohort_id
                WHERE cr.room_type != 'dm'
                ORDER BY cr.created_at DESC`;
        } else if (role === 'instructor') {
            // Instructor: general + cohort rooms + team rooms in their cohorts
            rooms = await sql`
                SELECT cr.*, t.name AS team_name, co.name AS cohort_name
                FROM chat_rooms cr
                LEFT JOIN teams t ON t.id = cr.team_id
                LEFT JOIN cohorts co ON co.id = cr.cohort_id
                WHERE cr.room_type != 'dm'
                  AND (
                      cr.room_type = 'general'
                   OR (cr.room_type = 'cohort' AND cr.cohort_id = ANY(${cohortIds}::uuid[]))
                   OR (cr.room_type = 'team'   AND t.cohort_id  = ANY(${cohortIds}::uuid[]))
                  )
                ORDER BY cr.created_at DESC`;
        } else {
            // Student: general + their team rooms
            rooms = await sql`
                SELECT DISTINCT cr.*, t.name AS team_name, co.name AS cohort_name
                FROM chat_rooms cr
                LEFT JOIN teams t  ON t.id = cr.team_id
                LEFT JOIN cohorts co ON co.id = cr.cohort_id
                LEFT JOIN team_members tm ON tm.team_id = cr.team_id AND tm.user_id = ${userId}
                WHERE cr.room_type != 'dm'
                  AND (cr.room_type = 'general' OR (cr.room_type = 'team' AND tm.user_id IS NOT NULL))
                ORDER BY cr.created_at DESC`;
        }
        return successResponse(res, 'Chat rooms retrieved successfully.', rooms);
    } catch (err) { next(err); }
});

/* POST /chat/rooms */
router.post(
    '/rooms',
    authorize('admin', 'instructor'),
    [
        body('roomName').trim().notEmpty(),
        body('roomType').isIn(['general', 'course', 'team', 'cohort']),
        body('organizationId').isUUID(),
        body('cohortId').optional().isUUID(),
        body('teamId').optional().isUUID(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { roomName, roomType, organizationId, courseId, teamId, cohortId } = req.body;

            // Instructor cohort check
            if (req.user.role === 'instructor' && cohortId) {
                if (!(req.user.cohorts ?? []).includes(cohortId)) {
                    return errorResponse(res, 'You do not belong to this cohort.', 403);
                }
            }

            const [room] = await sql`
                INSERT INTO chat_rooms (organization_id, room_name, room_type, course_id, team_id, cohort_id, created_by)
                VALUES (${organizationId}, ${roomName}, ${roomType}, ${courseId ?? null},
                        ${teamId ?? null}, ${cohortId ?? null}, ${req.user.id})
                RETURNING *`;
            return successResponse(res, 'Chat room created successfully.', room, 201);
        } catch (err) { next(err); }
    }
);

/* POST /chat/rooms/team/:teamId — get or create a team's dedicated chat room */
router.post('/rooms/team/:teamId', async (req, res, next) => {
    try {
        const [team] = await sql`SELECT * FROM teams WHERE id = ${req.params.teamId}`;
        if (!team) return errorResponse(res, 'Team not found.', 404);

        // Access check: must be team member OR instructor in same cohort OR admin
        const { role, id: userId } = req.user;
        if (role !== 'admin') {
            const [membership] = await sql`SELECT id FROM team_members WHERE team_id = ${req.params.teamId} AND user_id = ${userId}`;
            const isInstructor = role === 'instructor' && (req.user.cohorts ?? []).includes(team.cohort_id);
            if (!membership && !isInstructor) {
                return errorResponse(res, 'Access denied to this team chat.', 403);
            }
        }

        // Get or create the team chat room
        let [room] = await sql`SELECT * FROM chat_rooms WHERE room_type = 'team' AND team_id = ${req.params.teamId}`;
        if (!room) {
            [room] = await sql`
                INSERT INTO chat_rooms (organization_id, room_name, room_type, team_id, cohort_id, created_by)
                VALUES (${team.organization_id}, ${team.name + ' Chat'}, 'team', ${team.id}, ${team.cohort_id ?? null}, ${userId})
                RETURNING *`;
        }
        return successResponse(res, 'Team chat room retrieved successfully.', room);
    } catch (err) { next(err); }
});

/**
 * Helper: verify the calling user may access a given chat room.
 * Admins always pass. Others must be: a member of the team (team room),
 * an instructor whose cohort the room belongs to (cohort/team room),
 * or any authenticated user (general room).
 */
const canAccessRoom = async (room, user) => {
    if (user.role === 'admin') return true;
    if (room.room_type === 'general') return true;
    if (room.room_type === 'dm') {
        return Array.isArray(room.dm_participant_ids) && room.dm_participant_ids.includes(user.id);
    }
    if (room.room_type === 'cohort') {
        return room.cohort_id && (user.cohorts ?? []).includes(room.cohort_id);
    }
    if (room.room_type === 'team') {
        const [tm] = await sql`SELECT id FROM team_members WHERE team_id = ${room.team_id} AND user_id = ${user.id}`;
        if (tm) return true;
        // instructor of same cohort also allowed
        if (user.role === 'instructor' && room.cohort_id && (user.cohorts ?? []).includes(room.cohort_id)) return true;
        return false;
    }
    return false;
};

/* GET /chat/rooms/:id/messages — must be a member of the room — must be a member of the room */
router.get('/rooms/:id/messages', async (req, res, next) => {
    try {
        const [room] = await sql`SELECT * FROM chat_rooms WHERE id = ${req.params.id}`;
        if (!room) return errorResponse(res, 'Chat room not found.', 404);
        if (!(await canAccessRoom(room, req.user))) {
            return errorResponse(res, 'Access denied to this chat room.', 403);
        }

        const limit = Math.min(parseInt(req.query.limit ?? '50'), 100);
        const messages = await sql`
            SELECT m.*, p.full_name AS sender_name, p.avatar_url AS sender_avatar
            FROM messages m
            LEFT JOIN profiles p ON p.id = m.sender_id
            WHERE m.chat_room_id = ${req.params.id}
              AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT ${limit}
        `;
        return successResponse(res, 'Messages retrieved successfully.', messages.reverse());
    } catch (err) { next(err); }
});

/* POST /chat/rooms/:id/messages — must be a member of the room */
router.post(
    '/rooms/:id/messages',
    [body('content').trim().notEmpty()],
    validate,
    async (req, res, next) => {
        try {
            const [room] = await sql`SELECT * FROM chat_rooms WHERE id = ${req.params.id}`;
            if (!room) return errorResponse(res, 'Chat room not found.', 404);
            if (!(await canAccessRoom(room, req.user))) {
                return errorResponse(res, 'Access denied to this chat room.', 403);
            }

            const [message] = await sql`
                INSERT INTO messages (organization_id, chat_room_id, sender_id, content)
                VALUES (${room.organization_id}, ${req.params.id}, ${req.user.id}, ${req.body.content})
                RETURNING *
            `;

            const [profile] = await sql`SELECT full_name, avatar_url FROM profiles WHERE id = ${req.user.id}`;
            const full = { ...message, sender_name: profile?.full_name, sender_avatar: profile?.avatar_url };

            const io = req.app.get('io');
            io?.to(`room:${req.params.id}`).emit('receive_message', full);

            return successResponse(res, 'Message sent successfully.', full, 201);
        } catch (err) { next(err); }
    }
);

/* GET /chat/users – list all users available for DM (exclude self) */
router.get('/users', async (req, res, next) => {
    try {
        const users = await sql`
            SELECT p.id, p.full_name, p.avatar_url, p.role
            FROM profiles p
            WHERE p.id != ${req.user.id}
            ORDER BY p.full_name ASC
        `;
        return successResponse(res, 'Users retrieved successfully.', users);
    } catch (err) { next(err); }
});

/* POST /chat/dm/:userId – create or fetch existing DM room */
router.post('/dm/:userId', async (req, res, next) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.userId;

        if (currentUserId === targetUserId) {
            return errorResponse(res, 'Cannot DM yourself.', 400);
        }

        // Ensure target user exists
        const [targetUser] = await sql`SELECT id, full_name FROM profiles WHERE id = ${targetUserId}`;
        if (!targetUser) return errorResponse(res, 'User not found.', 404);

        // Sort UUIDs to create a canonical pair for uniqueness
        const sortedIds = [currentUserId, targetUserId].sort();

        // Check for existing DM room
        const [existing] = await sql`
            SELECT * FROM chat_rooms
            WHERE room_type = 'dm' AND dm_participant_ids = ${sortedIds}
        `;

        if (existing) {
            return successResponse(res, 'DM room retrieved successfully.', existing);
        }

        // Get an organization id for the room
        const [org] = await sql`SELECT id FROM organizations LIMIT 1`;
        if (!org) return errorResponse(res, 'No organization found.', 500);

        // Fetch current user's name for room name
        const [currentProfile] = await sql`SELECT full_name FROM profiles WHERE id = ${currentUserId}`;

        const roomName = `DM: ${currentProfile?.full_name || 'User'} & ${targetUser.full_name}`;

        const [room] = await sql`
            INSERT INTO chat_rooms (organization_id, room_name, room_type, created_by, dm_participant_ids)
            VALUES (${org.id}, ${roomName}, 'dm', ${currentUserId}, ${sortedIds})
            RETURNING *
        `;

        return successResponse(res, 'DM room created successfully.', room, 201);
    } catch (err) { next(err); }
});

/* GET /chat/dm/unread – returns user IDs that have unread DM messages for the current user */
router.get('/dm/unread', async (req, res, next) => {
    try {
        const currentUserId = req.user.id;

        // Find DM rooms where the most recent message was NOT sent by the current user
        // and the room involves the current user
        const rows = await sql`
            SELECT DISTINCT
                CASE
                    WHEN cr.dm_participant_ids[1] = ${currentUserId} THEN cr.dm_participant_ids[2]
                    ELSE cr.dm_participant_ids[1]
                END AS other_user_id
            FROM chat_rooms cr
            WHERE cr.room_type = 'dm'
              AND ${currentUserId} = ANY(cr.dm_participant_ids)
              AND EXISTS (
                  SELECT 1 FROM messages m
                  WHERE m.chat_room_id = cr.id
                    AND m.deleted_at IS NULL
                    AND m.sender_id != ${currentUserId}
                    AND m.created_at > COALESCE(
                        (SELECT MAX(m2.created_at) FROM messages m2
                         WHERE m2.chat_room_id = cr.id
                           AND m2.sender_id = ${currentUserId}
                           AND m2.deleted_at IS NULL),
                        '1970-01-01'::timestamptz
                    )
              )
        `;

        return successResponse(res, 'Unread DM senders retrieved successfully.', rows.map(r => r.other_user_id));
    } catch (err) { next(err); }
});

export default router;
