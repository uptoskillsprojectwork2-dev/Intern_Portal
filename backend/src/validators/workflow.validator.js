import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) return res.status(400).json({ message: result.array()[0].msg, errors: result.array() });
  return next();
};

export const certificateRequestValidator = [
  body('certificateType').isString().isIn(['offer_letter', 'bonafide', 'ojt_certificate', 'experience_letter', 'completion_certificate', 'intern_of_month', 'league_winner', 'custom']),
  body('reason').optional().isString().isLength({ max: 2000 }),
  body('metadata').optional().isObject({ strict: true }),
  validate
];

export const teamLeaderReviewValidator = [
  param('id').custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid request ID'),
  body('action').isIn(['forward', 'reject']).withMessage('Action must be forward or reject'),
  body('rejectionReason').custom((value, { req }) => req.body.action !== 'reject' || (typeof value === 'string' && value.trim().length > 0 && value.length <= 2000)).withMessage('Rejection reason is required'),
  validate
];

export const adminReviewValidator = [
  param('id').custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid request ID'),
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('rejectionReason').custom((value, { req }) => req.body.action !== 'reject' || (typeof value === 'string' && value.trim().length > 0 && value.length <= 2000)).withMessage('Rejection reason is required'),
  validate
];

export const templateCreateValidator = [
  body('templateCode').isString().trim().notEmpty().isLength({ max: 100 }),
  body('templateName').isString().trim().notEmpty().isLength({ max: 200 }),
  body('certificateType').isString().trim().notEmpty().isLength({ max: 100 }),
  body('title').isString().trim().notEmpty().isLength({ max: 300 }),
  body('htmlContent').optional().isString(),
  body('content').optional().isString(),
  body().custom((value) => typeof (value.htmlContent || value.content) === 'string' && (value.htmlContent || value.content).length > 0).withMessage('Template HTML content is required'),
  body('status').optional().isIn(['draft', 'active', 'inactive']),
  validate
];

export const templateUpdateValidator = [
  param('id').custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid template ID'),
  body('templateCode').optional().isString().trim().notEmpty().isLength({ max: 100 }),
  body('templateName').optional().isString().trim().notEmpty().isLength({ max: 200 }),
  body('certificateType').optional().isString().trim().notEmpty().isLength({ max: 100 }),
  body('title').optional().isString().trim().notEmpty().isLength({ max: 300 }),
  body('htmlContent').optional().isString(),
  body('content').optional().isString(),
  body('status').optional().isIn(['draft', 'active', 'inactive']),
  validate
];
