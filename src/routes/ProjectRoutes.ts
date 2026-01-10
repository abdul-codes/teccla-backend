import { Router } from "express";
import { authenticateUser } from "../middleware/authMIddleware";
import {
  createProject,
  deleteProject,
  getFilteredProjects,
  getProjectById,
  updateProject,
  getPublicProjects,
  joinProject,
  getProjectMembers,
  updateProjectPricing,
} from "../controller/ProjectController";
import { validateSchema } from "../middleware/validateMiddleware";
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
  updateProjectPricingSchema,
} from "../validation/project";

import { uploadProjectFiles } from "../middleware/fileUploadMiddleware";

const router = Router();

router.get("/", authenticateUser, validateSchema(projectQuerySchema, 'query'), getFilteredProjects);
router.get("/public", authenticateUser, getPublicProjects);
router.get("/:id", authenticateUser, getProjectById);
router.post(
  "/",
  authenticateUser,
  uploadProjectFiles,
  validateSchema(createProjectSchema),
  createProject,
);
router.post("/:id/join", authenticateUser, joinProject);
router.get("/:id/members", authenticateUser, getProjectMembers);
router.patch(
  "/:id",
  authenticateUser,
  uploadProjectFiles,
  validateSchema(updateProjectSchema),
  updateProject,
);
router.patch(
  "/:id/pricing",
  authenticateUser,
  validateSchema(updateProjectPricingSchema),
  updateProjectPricing,
);
router.delete("/:id", authenticateUser, deleteProject);

export default router;
