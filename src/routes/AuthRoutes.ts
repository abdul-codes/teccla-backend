import { Router } from "express";
import { loginValidation, registervalidation } from "../validation/validation";
import { loginUser, logoutUser, registerUser } from "../controller/AuthController";
import { authenticateUser } from "../middleware/authMIddleware";


const router =  Router()

router.post("/register", registervalidation, registerUser)
router.post("/login", loginValidation, authenticateUser, loginUser)
router.post("/logout", logoutUser)

export default router;