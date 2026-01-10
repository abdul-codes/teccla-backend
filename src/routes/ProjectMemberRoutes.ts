import { Router } from 'express';
import {
  getMyProjects,
  inviteUserToProject,
  removeUserFromProject,
} from '../controller/ProjectMemberController';
import { authenticateUser } from '../middleware/authMIddleware';
import { validateSchema } from '../middleware/validateMiddleware';
import { inviteUserToProjectSchema } from '../validation/project';

const router = Router();

router.get('/my-projects', authenticateUser, getMyProjects);

router.post(
  '/:projectId/invite',
  authenticateUser,
  validateSchema(inviteUserToProjectSchema),
  inviteUserToProject,
);

router.delete(
  '/:projectId/members/:userId',
  authenticateUser,
  removeUserFromProject,
);

export default router;
