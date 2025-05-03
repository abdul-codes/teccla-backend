import { Router } from "express";
import { authenticateUser, authorizeAdmin, authorizeRoles } from "../middleware/authMIddleware";
import { getAllUsers, updateCurrentUser } from "../controller/UserController";
import { UserRole } from "@prisma/client";


const router =  Router()

router.get("/allusers", authenticateUser, authorizeAdmin, getAllUsers)
router.get("/allusers", authenticateUser, authorizeRoles(UserRole.ADMIN), getAllUsers)
router.get("updateprofile", authenticateUser, updateCurrentUser)


export default router;