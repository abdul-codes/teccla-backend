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

router.get("/", authenticateUser, getAllProjects);
router.get("/:id", authenticateUser, getProjectById);
router.post(
  "/",
  authenticateUser,
  uploadProjectFiles,
  validateSchema(createProjectSchema),
  createProject,
);
router.patch(
  "/:id",
  authenticateUser,
  uploadProjectFiles,
  validateSchema(updateProjectSchema),
  updateProject,
);
router.delete("/:id", authenticateUser, deleteProject);

export default router;
