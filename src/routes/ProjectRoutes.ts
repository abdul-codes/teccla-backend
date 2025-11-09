import { Router } from "express";
import { authenticateUser, authorizeAdmin } from "../middleware/authMIddleware";
import {
  createProject,
  deleteProject,
  getAllProjects,
  getProjectById,
  updateProject,
} from "../controller/ProjectController";
import { validateSchema } from "../middleware/validateMiddleware";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../validation/project";

import { uploadProjectFiles } from "../middleware/fileUploadMiddleware";

const router = Router();

router.get("/projects", authenticateUser, getAllProjects);
router.get("/projects/:id", authenticateUser, getProjectById);
router.post(
  "/create-project",
  authenticateUser,
  uploadProjectFiles,
  validateSchema(createProjectSchema),
  createProject,
);
router.patch(
  "/projects/:id",
  authenticateUser,
  validateSchema(updateProjectSchema),
  updateProject,
);
router.delete("/projects/:id", authenticateUser, deleteProject);

export default router;
