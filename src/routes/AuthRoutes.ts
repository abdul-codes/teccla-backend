import { Router } from "express";
import { loginValidation, registervalidation, validateResendOtp, validateVerifyOtp, forgotPasswordValidation, resetPasswordValidation } from "../validation/validation";
import { loginUser, logoutUser, registerUser } from "../controller/AuthController";
import { authenticateUser } from "../middleware/authMiddleware";
import { verifyOtp } from "../controller/verifyOtp";
import { resendOtp } from "../controller/resendOtp";
import { refreshToken } from "../controller/JwtController";
import { forgotPassword, resetPassword } from "../controller/PasswordResetController";


import { authLimiter } from "../middleware/authRateLimitMiddleware";


const router = Router()

router.post("/refresh", refreshToken)
router.post("/register", authLimiter, registervalidation, registerUser)
router.post("/login", authLimiter, loginValidation, loginUser)
router.post("/verifyOtp", authLimiter, validateVerifyOtp, verifyOtp)
router.post("/resendOtp", authLimiter, validateResendOtp, resendOtp)
router.post("/forgot-password", authLimiter, forgotPasswordValidation, forgotPassword)
router.post("/reset-password", authLimiter, resetPasswordValidation, resetPassword)
router.post("/logout", authenticateUser, logoutUser)

export default router;