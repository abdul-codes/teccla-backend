import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";

// Adjust the function signature to return Promise<void>
export const getCurrentUser = asyncMiddleware(
  async (req: Request, res: Response): Promise<void> => {
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
  }
);

export const updateCurrentUser = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json("User not found");
        return; // Ensure to exit after sending a response
      }

      //update user details
      const {
        profilePicture,
        companyName,
        companyRole,
        address,
        city,
        state,
        country,
      } = req.body;

      if (
        !profilePicture ||
        !companyName ||
        !companyRole ||
        !address ||
        !city ||
        !country ||
        !state
      ) {
        return res
          .status(400)
          .json({ error: "Missing required fields for full update." });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          profilePicture,
          companyName,
          companyRole,
          address,
          city,
          state,
          country,
        },
      });
      res.status(201).json(updatedUser)
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export const getAllUsers = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany();
      return res.status(201).json(users);
    } catch (error) {
      res.status(500).json({ error: "Error fetching Users" });
    }
  }
);
