/**
 * Centralized HTTP response helpers.
 *
 * All API responses MUST use these helpers so that the contract remains:
 *
 * Success:
 *   { success: true, message: string, data?: any, meta?: any }
 *
 * Failure:
 *   { success: false, message: string, error?: any }
 *
 * HTTP status conventions enforced here:
 *   201  — resource created
 *   200  — normal success / updated / deleted
 *   400  — bad request / validation error
 *   401  — unauthenticated
 *   403  — forbidden
 *   404  — not found
 *   409  — conflict (duplicate)
 *   500  — internal server error
 */

/**
 * Send a successful response.
 *
 * @param {import('express').Response} res
 * @param {string} message  Human-readable, action-specific message.
 * @param {any}    data     Payload (omitted from body when null).
 * @param {number} status   HTTP status code (default 200).
 */
export const successResponse = (res, message, data = null, status = 200) => {
    const body = { success: true, message };
    if (data !== null) body.data = data;
    return res.status(status).json(body);
};

/**
 * Send an error response.
 *
 * @param {import('express').Response} res
 * @param {string} message  Human-readable explanation.
 * @param {number} status   HTTP status code (default 400).
 * @param {any}    error    Optional technical detail / validation errors.
 */
export const errorResponse = (res, message, status = 400, error = null) => {
    const body = { success: false, message };
    if (error !== null) body.error = error;
    return res.status(status).json(body);
};

/**
 * Send a paginated list response.
 *
 * @param {import('express').Response} res
 * @param {string}  message
 * @param {any[]}   data
 * @param {{ total: number, page: number, limit: number, pages: number }} meta
 */
export const paginatedResponse = (res, message, data, meta) => {
    return res.status(200).json({ success: true, message, data, meta });
};
