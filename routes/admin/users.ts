// routes/admin/users.ts
import express from "express";
import { authenticateToken, AuthRequest } from "../../middleware/auth";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";


const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /admin/users
 * Get all users (Admin only)
 */
router.get(
  "/",
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    // 🔐 Only Admin can access
    if (req.role !== "Admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  }
);

/**
 * PUT /admin/users/:id
 * Update user role (Admin only)
 */
router.put(
  "/:id",
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    if (req.role !== "Admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const targetId = Number(id);
    const { role } = req.body;

    // Validate role
    if (!["customer", "Seller", "Admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    try {
      // Fetch the user being updated
      const userToEdit = await prisma.user.findUnique({
        where: { id: targetId },
      });

      if (!userToEdit) {
        return res.status(404).json({ message: "User not found" });
      }

      // 🔐 Prevent Admin from editing another Admin
      if (userToEdit.role === "Admin" && req.userId !== targetId) {
        return res.status(403).json({
          message: "Permission denied: Cannot modify another Admin account",
        });
      }

      // ✅ Allow self-edit (e.g. Admin updating their own info)
      // But prevent self-demotion? Optional (see below)

      const updatedUser = await prisma.user.update({
        where: { id: targetId },
         data:{
          role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      res.json(updatedUser);
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  }
);
/**
 * DELETE /admin/users/:id
 * Delete a user (Admin only)
 */
router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    if (req.role !== "Admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const targetId = Number(id);

    try {
      const userToDelete = await prisma.user.findUnique({
        where: { id: targetId },
      });

      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }

      // 🔐 Prevent deletion of another Admin
      if (userToDelete.role === "Admin") {
        return res.status(403).json({
          message: "Permission denied: Cannot delete Admin accounts",
        });
      }

      await prisma.user.delete({
        where: { id: targetId },
      });

      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(500).json({ message: "Failed to delete user" });
    }
  }
);
/**
 * POST /admin/users
 * Create a new user (Admin only)
 * Admin sets: name, email, role
 * Password is auto-generated or set by email link
 */
router.post(
  "/",
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    if (req.role !== "Admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    const { name, email, role } = req.body;

    // Validate required fields
    if (!name || !email || !role) {
      return res.status(400).json({ message: "Name, email, and role are required" });
    }

    // Validate role
    if (!["customer", "Seller", "Admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Validate email format
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // 🛑 Important: We cannot set a plaintext password here
      // Instead, we:
      // 1. Set a temporary password (hashed), or
      // 2. Force password reset on first login

      const tempPassword = Math.random().toString(36).slice(-8); // 8-char random string
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const newUser = await prisma.user.create({
         data:{
          name,
          email,
          password: hashedPassword,
          role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // 📧 Optional: Send welcome email with temp password or reset link
      // await sendEmail({
      //   to: email,
      //   subject: "Welcome to Junkyard App",
      //   text: `Hello ${name}, your account has been created. Temporary password: ${tempPassword}`,
      // });

      res.status(201).json(newUser);
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  }
);

export default router;