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

// Routes
app.use("/api/auth", authRoutes);           
app.use("/api/protected", protectedRoutes);
app.use("/api/parts", partsRoutes); // ✅ Add parts route
app.use("/api/seller", sellerRoutes); // ✅ Add parts route
app.use("/api/admin/users", adminUserRoutes); // Placeholder for admin routes
app.use("/api/orders", orderRoutes); // Add after auth, parts, etc.
app.use("/api/admin/orders", adminOrdersRouter);
app.use("/api/auth/user", authUsers);

// Test default route
app.get("/", (req, res) => {
  res.send("Car Parts Backend API is running 🚀");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
