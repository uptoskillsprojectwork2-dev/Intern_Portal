import { body, oneOf, validationResult } from 'express-validator';

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  next();
}

export const registerValidator = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  body('mobileNo').optional({ values: 'falsy' }).matches(/^\d{10}$/).withMessage('Mobile number must contain exactly 10 digits'),
  body('domain').optional().isString().trim().isLength({ max: 100 }),
  body('startDate').optional({ values: 'falsy' }).isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional({ values: 'falsy' }).isISO8601().withMessage('End date must be a valid date')
    .custom((value, { req }) => !req.body.startDate || new Date(req.body.startDate) <= new Date(value)).withMessage('End date must be on or after start date'),
    
  validate,
];


export const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  oneOf([
    body('internCode').trim().notEmpty(),
    body('password').trim().notEmpty()
  ], {
    message: 'Intern code or password is required'
  }),
  validate
];

export const teamLeaderValidator = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('mobileNo').optional({ values: 'falsy' }).matches(/^\d{10}$/).withMessage('Mobile number must contain exactly 10 digits'),
  body('startDate').optional({ values: 'falsy' }).isISO8601(),
  body('endDate').optional({ values: 'falsy' }).isISO8601()
    .custom((value, { req }) => !req.body.startDate || new Date(req.body.startDate) <= new Date(value)).withMessage('End date must be on or after start date'),
  validate
];
