import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth"; // <-- FIXED
import protectedRoutes from "./routes/protected";
import partsRoutes from "./routes/parts"; // ✅ Import
import sellerRoutes from "./routes/seller"; // ✅ Import seller routes
import adminUserRoutes from "./routes/admin/users"; // ✅ Import seller routes
import orderRoutes from "./routes/orders"; // ✅ Import order routes
import adminOrdersRouter from './routes/admin/orders';
import authUsers from './routes/user';
import { prisma } from "./lib/prisma";

import cors from "cors";

dotenv.config();
const app = express();

const allowedOrigins = [
  "http://localhost:3001", // Local frontend
  "http://localhost:3000",
  "https://junkyard-frontend-app.vercel.app", // ✅ Your live frontend
  "https://junkyard-frontend-app-git-main-simranpal07s-projects.vercel.app", // ✅ Vercel preview
];
app.use(
  cors({
    origin: function (origin, callback) {
      // ✅ Allow requests with no origin (like mobile apps, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = "The CORS policy for this site does not allow access from the specified origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // If you're sending cookies or auth
  })
);

app.use(express.json({ limit: '512kb' }));

app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(req.method, req.url);
  }
  next();
});

// Routes – mount /api/auth/user before /api/auth so /api/auth/user/me is matched
app.use("/api/auth/user", authUsers);
app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/parts", partsRoutes); // ✅ Add parts route
app.use("/api/seller", sellerRoutes); 
app.use("/api/admin/users", adminUserRoutes); // Placeholder for admin routes
app.use("/api/orders", orderRoutes); // Add after auth, parts, etc.
app.use("/api/admin/orders", adminOrdersRouter);

// Test default route
app.get("/", (req, res) => {
  res.send("Car Parts Backend API is running 🚀");
});

// No-auth health check – also pings DB to warm the connection after Render cold start
app.get("/api/health", async (_req, res) => {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    // DB not ready yet (e.g. cold start) – still return 200 so crons don't think we're down
  }
  // Show which DB host:port we're using (password redacted) so you can confirm 5432 vs 6543
  const raw = process.env.DATABASE_URL || "";
  const match = raw.match(/@([^/]+)\//);
  const dbHost = match ? match[1] : (raw ? "set" : "missing");
  res.json({ ok: true, backend: "Car Parts", db, dbHost, time: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found', message: 'Route not found' });
});

// Global error handler (4-arg middleware)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err?.message || err);
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    message: err.message || 'Internal server error',
  });
});

const PORT = Number(process.env.PORT) || 4000;
const KEEPALIVE_MS = 5 * 1000; // 5 seconds – Supabase closes idle connections very quickly

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    // Keep DB connection alive so Supabase doesn't close it after ~10s idle
    setInterval(async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (e) {
        // Connection dead – disconnect so next request opens a fresh one
        try {
          await prisma.$disconnect();
        } catch (_) {}
      }
    }, KEEPALIVE_MS);
  });
}

export { app };
