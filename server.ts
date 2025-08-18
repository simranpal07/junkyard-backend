import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth"; // <-- FIXED
import protectedRoutes from "./routes/protected";
import partsRoutes from "./routes/parts"; // ✅ Import
import sellerRoutes from "./routes/seller"; // ✅ Import seller routes
import adminUserRoutes from "./routes/admin/users"; // ✅ Import seller routes
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors({
  origin: "http://localhost:3000", // allow your frontend origin
  credentials: true                // if you need to send cookies/auth headers
}));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);           
app.use("/api/protected", protectedRoutes);
app.use("/api/parts", partsRoutes); // ✅ Add parts route
app.use("/api/seller", sellerRoutes); // ✅ Add parts route
app.use("/api/admin/users", adminUserRoutes); // Placeholder for admin routes

// Test default route
app.get("/", (req, res) => {
  res.send("Car Parts Backend API is running 🚀");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
