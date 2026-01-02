import { Router } from "express";
import { loginValidation, registervalidation, validateResendOtp, validateVerifyOtp, forgotPasswordValidation, resetPasswordValidation } from "../validation/validation";
import { loginUser, logoutUser, registerUser } from "../controller/AuthController";
import { authenticateUser } from "../middleware/authMIddleware";
import { verifyOtp } from "../controller/verifyOtp";
import { resendOtp } from "../controller/resendOtp";
import { refreshToken } from "../controller/JwtController";
import { forgotPassword, resetPassword } from "../controller/PasswordResetController";


const router =  Router()

router.post("/refresh", refreshToken)
router.post("/register", registervalidation, registerUser)
router.post("/login", loginValidation, loginUser)
router.post("/verifyOtp", validateVerifyOtp, verifyOtp)
router.post("/resendOtp",validateResendOtp, resendOtp)
router.post("/forgot-password", forgotPasswordValidation, forgotPassword)
router.post("/reset-password", resetPasswordValidation, resetPassword)
router.post("/logout", authenticateUser, logoutUser)

export default router;