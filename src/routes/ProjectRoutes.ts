import { Router } from "express";
import { authenticateUser, authorizeAdmin } from "../middleware/authMIddleware";
import { createProject, getAllProjects } from "../controller/ProjectController";
import { validateSchema } from "../middleware/validateMiddleware";
import { createProjectSchema } from "../validation/project";


const router = Router()

router.get("/projects", authenticateUser, getAllProjects)
router.get("/create-project", authenticateUser, validateSchema(createProjectSchema), createProject)


export default router;