// routes/auth.ts
import { Router, Request, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

// POST /api/auth/register
// This endpoint is used by the mobile app after Supabase signup
// to ensure there is a corresponding User row in our DB.
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, role, id: supabaseUserId } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const roleLower = role.toString().toLowerCase();
    // Only allow customer/seller here - admin users must be created via admin routes
    if (!["customer", "seller"].includes(roleLower)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Use Supabase user id when provided so /me lookup by JWT sub works
    const data: { name: string; email: string; role: string; id?: string } = {
      name,
      email,
      role: roleLower,
    };
    if (supabaseUserId && typeof supabaseUserId === "string") {
      data.id = supabaseUserId;
    }

    const user = await prisma.user.create({
      data,
      select: { id: true, name: true, email: true, role: true },
    });

    return res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// POST /api/auth/login
// Deprecated: auth is handled by Supabase on the client.
router.post("/login", (_req: Request, res: Response) => {
  return res.status(410).json({ message: "This endpoint is deprecated. Use Supabase auth from the client." });
});

// GET /api/auth/me - Get current user info
router.get("/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
