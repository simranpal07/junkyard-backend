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

app.use(express.json());

app.use((req, _res, next) => {
     console.log(req.method, req.url);
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

// No-auth health check – open this from your phone browser to confirm the phone can reach this server
app.get("/api/health", (req, res) => {
  res.json({ ok: true, backend: "Car Parts", time: new Date().toISOString() });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
