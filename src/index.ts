import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import compression from "compression";
import limiter from "./middleware/rateLImitMiddleware";
import authRoutes from "./routes/AuthRoutes";
import userRoutes from "./routes/UserRoutes";
import userProfileRoutes from "./routes/UserProfileRoutes";
import projectRoutes from "./routes/ProjectRoutes";

const app = express();

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(limiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", userProfileRoutes);
app.use("/api/projects", projectRoutes);

app.get("/api/test", async (req: Request, res: Response) => {
  res.json({ messsage: "hello and welcome back" });
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`Server running on localhost:${PORT}`);
});
