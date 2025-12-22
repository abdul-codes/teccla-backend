import { Router } from "express";
import { authenticateUser } from "../middleware/authMIddleware";
import {
  createProject,
  deleteProject,
  getFilteredProjects,
  getProjectById,
  updateProject,
} from "../controller/ProjectController";
import { validateSchema } from "../middleware/validateMiddleware";
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
} from "../validation/project";

import { uploadProjectFiles } from "../middleware/fileUploadMiddleware";

const router = Router();

router.get("/", authenticateUser, validateSchema(projectQuerySchema, 'query'), getFilteredProjects);
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
