import { body, validationResult } from "express-validator"
import { NextFunction, Request, Response } from "express"
import { asyncMiddleware } from "../middleware/asyncMiddleware"


const handleValidationErrors = asyncMiddleware (async(req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array() })
    }
    next()
})


export const registervalidation = [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must include uppercase, lowercase, number, and special character'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  handleValidationErrors
]

export const loginValidation = [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
    .isLength({ min: 8 }),
    // .withMessage('Password must be at least 8 characters long')
    // .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
   // .withMessage('Password must include uppercase, lowercase, number, and special character'),
//   body('').notEmpty().withMessage('First name is required'),
handleValidationErrors
]

