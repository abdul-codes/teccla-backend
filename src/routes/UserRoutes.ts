import { Router } from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMIddleware";
import { getAllUsers, getUserById, updateUser, deleteUser, getCurrentUser, searchUsers, resetUserLockout } from "../controller/UserController";
import { changePassword } from "../controller/PasswordChangeController";
import { UserRole } from "../../prisma/generated/prisma/client";
import { changePasswordValidation } from "../validation/validation";

const router = Router()

// Admin routes
router.get("/", authenticateUser, authorizeRoles(UserRole.ADMIN), getAllUsers)
router.delete("/:id", authenticateUser, authorizeRoles(UserRole.ADMIN), deleteUser)
router.post("/:id/reset-lockout", authenticateUser, authorizeRoles(UserRole.ADMIN), resetUserLockout)

// User routes (authenticated users)
router.get("/search", authenticateUser, searchUsers)
router.get("/profile", authenticateUser, getCurrentUser)
router.get("/:id", authenticateUser, getUserById)
router.put("/:id", authenticateUser, updateUser)
router.post("/change-password", authenticateUser, changePasswordValidation, changePassword)

export default router;