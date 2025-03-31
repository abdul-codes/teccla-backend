import { Router } from "express";
import { authenticateUser, authorizeAdmin } from "../middleware/authMIddleware";
import { getAllUsers, updateCurrentUser } from "../controller/UserController";


const router =  Router()

router.get("/allusers",  getAllUsers)
router.get("updateprofile", authenticateUser, updateCurrentUser)


export default router;