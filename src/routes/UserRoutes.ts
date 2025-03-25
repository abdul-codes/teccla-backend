import { Router } from "express";
import { authenticateUser, authorizeAdmin } from "../middleware/authMIddleware";
import { getAllUsers } from "../controller/UserController";


const router =  Router()

router.get("/allusers",  getAllUsers)

export default router;