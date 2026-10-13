import { query, validationResult } from 'express-validator';

export const dateRangeValidator = [
    query('from')
        .optional()
        .isISO8601()
        .withMessage('from must be a valid ISO date (YYYY-MM-DD)'),
    query('to')
        .optional()
        .isISO8601()
        .withMessage('to must be a valid ISO date (YYYY-MM-DD)')
        .custom((val, { req }) => {
            if (req.query.from && val) {
                if (new Date(req.query.from) > new Date(val)) {
                    throw new Error('from date cannot be after to date');
                }
            }
            return true;
        }),
    query('range')
        .optional()
        .isIn(['7d', '30d', '6m', '12m'])
        .withMessage('range must be one of: 7d, 30d, 6m, 12m'),
    query('groupBy')
        .optional()
        .isIn(['day', 'week', 'month'])
        .withMessage('groupBy must be one of: day, week, month'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: errors.array(),
            });
        }
        next();
    },
];

export const exportTypeValidator = [
    query('type')
        .notEmpty()
        .withMessage('type query parameter is required')
        .isIn(['overview', 'requests-trend', 'certificate-types', 'turnaround', 'team-leaders', 'domains', 'pipeline'])
        .withMessage('type must be one of: overview, requests-trend, certificate-types, turnaround, team-leaders, domains, pipeline'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: errors.array(),
            });
        }
        next();
    },
];

export const parseDateRange = (req) => {
    const { from, to, range = '30d' } = req.query;

    let fromDate = null;
    let toDate = null;

    if (from && to) {
        fromDate = new Date(from);
        toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
    } else if (from) {
        fromDate = new Date(from);
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
    } else {
        const rangeMap = {
            '7d': 7,
            '30d': 30,
            '6m': 180,
            '12m': 365,
        };
        const days = rangeMap[range] || rangeMap['30d'];
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
    }

    return { fromDate, toDate, range };
};
