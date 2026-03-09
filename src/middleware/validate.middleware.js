import { validationResult } from 'express-validator';

/**
 * Middleware to check express-validator results.
 * Returns 400 with errors if validation fails.
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const extractedErrors = errors.array().map((err) => ({
            field: err.path,
            message: err.msg,
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: extractedErrors,
        });
    }

    next();
};
