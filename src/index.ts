import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import compression from "compression";
import limiter from "./middleware/rateLImitMiddleware";
import authRoutes from "./routes/AuthRoutes";
import userRoutes from "./routes/UserRoutes";
import userProfileRoutes from "./routes/UserProfileRoutes";

const app = express();

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(limiter);

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/profile", userProfileRoutes);

app.get("/api/test", async (req: Request, res: Response) => {
  res.json({ messsage: "hello and welcome back" });
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`Server running on localhost:${PORT}`);
});
