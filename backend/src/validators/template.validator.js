import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Handlebars from 'handlebars';

export const ALLOWED_CERTIFICATE_TYPES = [
  'offer_letter',
  'bonafide',
  'ojt_certificate',
  'experience_letter',
  'completion_certificate',
  'intern_of_month',
  'intern_of_the_month',
  'league_winner',
  'custom'
];

const ALLOWED_STATUSES = ['draft', 'active', 'inactive', 'archived'];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0]?.msg || 'Validation failed',
      errors:  errors.array()
    });
  }
  next();
}

/**
 * Validates template HTML content:
 * 1. Must include {{fullName}}
 * 2. Compiles with Handlebars inside try/catch to reject unbalanced {{ }} brackets.
 */
const validateTemplateHtml = (val) => {
  if (val !== undefined && val !== null && typeof val === 'string' && val.trim()) {
    if (!val.includes('{{fullName}}')) {
      throw new Error(
        'Template content must include the {{fullName}} placeholder (Task B requirement)'
      );
    }
    const openCount = (val.match(/\{\{/g) || []).length;
    const closeCount = (val.match(/\}\}/g) || []).length;
    if (openCount !== closeCount) {
      throw new Error('Template has unbalanced {{ }} brackets');
    }
    try {
      Handlebars.precompile(val);
    } catch (err) {
      throw new Error(
        `Template has invalid Handlebars syntax: ${err.message}`
      );
    }
  }
  return true;
};

/**
 * Validator for POST /api/admin/templates (create).
 * Enforces required fields, certificateType enum, and Task B validation rules.
 */
export const createTemplateValidator = [
  body('templateCode')
    .trim()
    .notEmpty().withMessage('templateCode is required')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('templateCode must be uppercase alphanumeric characters with dashes or underscores only'),

  body('templateName')
    .trim()
    .notEmpty().withMessage('templateName is required'),

  body('certificateType')
    .trim()
    .notEmpty().withMessage('certificateType is required')
    .isIn(ALLOWED_CERTIFICATE_TYPES)
    .withMessage(
      `certificateType must be one of: ${ALLOWED_CERTIFICATE_TYPES.join(', ')}`
    ),

  body('title')
    .trim()
    .notEmpty().withMessage('title is required'),

  body('description')
    .optional()
    .isString().withMessage('description must be a string'),

  body('content')
    .optional()
    .isString().withMessage('content must be a string')
    .custom(validateTemplateHtml),

  body('status')
    .optional()
    .isIn(ALLOWED_STATUSES)
    .withMessage(`status must be one of: ${ALLOWED_STATUSES.join(', ')}`),

  validate
];

/**
 * Validator for PATCH /api/admin/templates/:id (update).
 * All fields are optional. Only validates fields that are present.
 */
export const updateTemplateValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid template ID format'),

  body('templateName')
    .optional()
    .trim()
    .notEmpty().withMessage('templateName cannot be set to an empty string'),

  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('title cannot be set to an empty string'),

  body('description')
    .optional()
    .isString().withMessage('description must be a string'),

  body('content')
    .optional()
    .isString().withMessage('content must be a string')
    .custom(validateTemplateHtml),

  validate
];
