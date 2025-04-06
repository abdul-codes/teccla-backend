import { Router } from "express";
import { loginValidation, registervalidation, validateResendOtp, validateVeirfyOtp } from "../validation/validation";
import { loginUser, logoutUser, registerUser } from "../controller/AuthController";
import { authenticateUser } from "../middleware/authMIddleware";
import { verifyOtp } from "../controller/verifyOtp";
import { resendOtp } from "../controller/resendOtp";


const router =  Router()

router.post("/register", registervalidation, registerUser)
router.post("/login", loginValidation, authenticateUser, loginUser)
router.post("/verifyOtp", validateVeirfyOtp, verifyOtp)
router.post("/resendOtp",validateResendOtp, resendOtp)
router.post("/logout", logoutUser)


export default router;