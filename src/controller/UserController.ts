import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";

// Adjust the function signature to return Promise<void>
const getCurrentUser = asyncMiddleware(async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      res.status(404).json("User not found");
      return; // Ensure to exit after sending a response
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ message: "Internal server error" });
  }
});

export default getCurrentUser;
