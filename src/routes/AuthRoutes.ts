import { Router } from "express";
import { loginValidation, registervalidation, validateResendOtp, validateVerifyOtp } from "../validation/validation";
import { loginUser, logoutUser, registerUser } from "../controller/AuthController";
import { authenticateUser } from "../middleware/authMIddleware";
import { verifyOtp } from "../controller/verifyOtp";
import { resendOtp } from "../controller/resendOtp";
import { refreshToken } from "../controller/JwtController";


const router =  Router()

router.post("/refresh", refreshToken)
router.post("/register", registervalidation, registerUser)
router.post("/login", loginValidation, loginUser)
router.post("/verifyOtp", validateVerifyOtp, verifyOtp)
router.post("/resendOtp",validateResendOtp, resendOtp)
router.post("/logout", authenticateUser, logoutUser)

export default router;