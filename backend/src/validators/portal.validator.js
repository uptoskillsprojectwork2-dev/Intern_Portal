import { body, param, validationResult } from "express-validator";
import mongoose from "mongoose";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errArray = errors.array();
    return res.status(400).json({
      message: errArray[0]?.msg || "Validation error",
      errors: errArray
    });
  }
  next();
};

export const createInternValidator = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid")
    .normalizeEmail(),
  body("startDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  body("endDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("End date must be a valid date")
    .custom((val, { req }) => {
      if (req.body.startDate && val && new Date(req.body.startDate) > new Date(val)) {
        throw new Error("Start date cannot be after end date");
      }
      return true;
    }),
  validate
];

export const createTLValidator = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  validate
];

export const submitCertificateRequestValidator = [
  body("certificateType")
    .trim()
    .notEmpty()
    .withMessage("Valid certificate type is required"),
  validate
];

export const templateCreateValidator = [
  body("templateCode")
    .trim()
    .notEmpty()
    .withMessage("templateCode is required"),
  body("templateName")
    .trim()
    .notEmpty()
    .withMessage("templateName is required"),
  body("certificateType")
    .trim()
    .notEmpty()
    .withMessage("certificateType is required"),
  body("title")
    .trim()
    .notEmpty()
    .withMessage("title is required"),
  validate
];

export const templateUpdateValidator = [
  param("id")
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage("Invalid template ID format"),
  validate
];

export const reviewRequestTLValidator = [
  param("id")
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage("Invalid request ID format"),
  body("action")
    .trim()
    .notEmpty()
    .withMessage("Action is required")
    .isIn(["forward", "reject"])
    .withMessage('action must be "forward" or "reject"'),
  body("rejectionReason")
    .if(body("action").equals("reject"))
    .trim()
    .notEmpty()
    .withMessage("rejectionReason is required when rejecting"),
  validate
];

export const finalizeRequestAdminValidator = [
  param("id")
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage("Invalid request ID format"),
  body("action")
    .trim()
    .notEmpty()
    .withMessage("Action is required")
    .isIn(["approve", "reject"])
    .withMessage('action must be "approve" or "reject"'),
  body("rejectionReason")
    .if(body("action").equals("reject"))
    .trim()
    .notEmpty()
    .withMessage("rejectionReason is required when rejecting"),
  validate
];
