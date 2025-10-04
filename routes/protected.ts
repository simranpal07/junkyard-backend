import express from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { authorizeRoles } from "../middleware/role";

const router = express.Router();

/**
 * Generic protected endpoint for any authenticated user
 */
router.get("/user", authenticateToken, (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated", message: "User not authenticated" });
  }
  res.json({
    message: "Hello User!",
    user: { id: req.user.id, email: req.user.email, role: req.user.role },
  });
});

/**
 * Only sellers can access
 */
router.get("/seller", authenticateToken, authorizeRoles("seller"), (req: AuthRequest, res) => {
  res.json({ message: "Hello Seller!", user: req.user });
});

/**
 * Only admins can access
 */
router.get("/admin", authenticateToken, authorizeRoles("admin"), (req: AuthRequest, res) => {
  res.json({ message: "Hello Admin!", user: req.user });
});

export default router;
