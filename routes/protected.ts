// routes/protected.ts
import express from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = express.Router();

/**
 * Role-based authorization middleware
 */
const authorizeRoles = (roles: string[]) => {
  return (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
};

// Accessible by any logged-in user
// Accessible by any logged-in user
router.get("/user", authenticateToken, (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  // ✅ Now TypeScript knows `req.user` is defined
  res.json({
    message: `Hello User!`,
    userId: req.user.id,
    role: req.user.role,
    email: req.user.email,
    name: req.user.name,
  });
});

// Only for mechanics
router.get("/seller", authenticateToken, authorizeRoles(["Seller"]), (req: AuthRequest, res) => {
  const user = req.user;
  res.json({ message: `Hello Mechanic!`, user: req.user });
});

// Only for admins
router.get("/admin", authenticateToken, authorizeRoles(["Admin"]), (req: AuthRequest, res) => {
  const user = req.user;
  res.json({ message: `Hello Admin!`, user: req.user });
});

export default router;
