import express, { Request, Response } from "express";
import { createServer } from "http";
import cors from "cors";
import "dotenv/config";
import compression from "compression";
import path from "path";
import limiter from "./middleware/rateLImitMiddleware";
import authRoutes from "./routes/AuthRoutes";
import userRoutes from "./routes/UserRoutes";
import userProfileRoutes from "./routes/UserProfileRoutes";
import projectRoutes from "./routes/ProjectRoutes";
import chatRoutes from "./routes/chat/ChatRoutes";
import paymentRoutes from "./routes/PaymentRoutes";
import webhookRoutes from "./routes/WebhookRoutes";
import { initializeSocket } from "./socket/socketServer";
import Logger from "./utils/logger";


const app = express();
const server = createServer(app);

// Enable trust proxy for ngrok and production load balancers
app.set('trust proxy', 1);

app.use(compression());
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Enable credentials (cookies, authorization headers, etc.)
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

// Serve static files from uploads directory (only needed for local storage)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting (enabled for production)
app.use(limiter);

// Health check endpoint (for load balancers, Docker, monitoring)
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users/profile", userProfileRoutes); // Must be BEFORE /api/users
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);

// Fix for Paystack redirecting to backend instead of frontend
app.get("/payment/verify", (req, res) => {
  const reference = req.query.reference || req.query.trxref;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl.replace(/\/$/, '')}/payment/verify?reference=${reference}`);
});

app.get("/api/test", async (_req: Request, res: Response) => {
  res.json({ message: "hello and welcome back" });
});

const PORT = process.env.PORT || 8000;

// Initialize Socket.io
initializeSocket(server);


server.listen(PORT, () => {
  Logger.info(`Server running with Socket.io on localhost:${PORT}`);
});
// Trigger restart 2

export default app;
