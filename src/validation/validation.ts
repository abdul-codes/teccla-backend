import { body, validationResult } from "express-validator"
import { NextFunction, Request, Response } from "express"
import { asyncMiddleware } from "../middleware/asyncMiddleware"


const handleValidationErrors = asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    next()
})


export const registervalidation = [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password")
        .isLength({ min: 8 })
        .notEmpty()
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('Password must include uppercase, lowercase, number, and special character'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    handleValidationErrors
]

export const loginValidation = [
    body("accountId").notEmpty().withMessage("email or accountId is required"),
    body("password")
        .notEmpty()
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long'),

    // Note: Password complexity validation is intentionally NOT enforced at login.
    // Users should be able to login with any password that was accepted during registration.
    // Password complexity is enforced during registration and password change flows.

    handleValidationErrors
]
export const validateResendOtp = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    handleValidationErrors
]
export const validateVerifyOtp = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('token').isString().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    handleValidationErrors
]

export const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  handleValidationErrors
];

export const resetPasswordValidation = [
  body("token")
    .notEmpty()
    .withMessage("Reset token is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage("Password must include uppercase, lowercase, number, and special character"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("Passwords do not match"),
  handleValidationErrors
];

export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage("Password must include uppercase, lowercase, number, and special character"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("Passwords do not match"),
  handleValidationErrors
];

