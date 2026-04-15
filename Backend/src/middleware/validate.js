import { validationResult } from 'express-validator';

/**
 * Run after express-validator chains.
 * Collects all validation errors and returns a 422 response if any exist.
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            error: 'Validation failed.',
            details: errors.array().map(e => ({ field: e.path, message: e.msg })),
        });
    }
    next();
};
