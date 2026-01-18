import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import {
  joinProject,
  leaveProject,
  getProjectMembers,
  getMyProjects,
  removeUserFromProject,
  updateMemberStatus
} from "../controller/ProjectMemberController";

const router = Router();

// Project membership routes
router.post('/projects/:id/join', authenticateUser, joinProject);
router.post('/projects/:id/leave', authenticateUser, leaveProject);
router.get('/projects/:id/members', authenticateUser, getProjectMembers);

// User's projects
router.get('/project-members/my-projects', authenticateUser, getMyProjects);

// Admin/Owner management routes
router.delete('/project-members/:projectId/members/:userId', authenticateUser, removeUserFromProject);
router.patch('/project-members/:projectId/members/:userId', authenticateUser, updateMemberStatus);

export default router;
