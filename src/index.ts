import express, { Request, Response } from "express";
import { createServer } from "http";
import cors from "cors";
import "dotenv/config";
import compression from "compression";
import limiter from "./middleware/rateLImitMiddleware";
import authRoutes from "./routes/AuthRoutes";
import userRoutes from "./routes/UserRoutes";
import userProfileRoutes from "./routes/UserProfileRoutes";
import projectRoutes from "./routes/ProjectRoutes";
import chatRoutes from "./routes/chat/ChatRoutes";
import { initializeSocket } from "./socket/socketServer";

const app = express();
const server = createServer(app);

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true, // Enable credentials (cookies, authorization headers, etc.)
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));
app.use(limiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/users/profile", userProfileRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/chat", chatRoutes);

app.get("/api/test", async (_req: Request, res: Response) => {
  res.json({ message: "hello and welcome back" });
});

const PORT = process.env.PORT || 7000;

// Initialize Socket.io
initializeSocket(server);

server.listen(PORT, () => {
  console.log(`Server running with Socket.io on localhost:${PORT}`);
});

export default app;
