// src/routes/admin/users.ts
import express from "express";
import { authenticateToken, AuthRequest } from "../../middleware/auth";
import { authorizeRoles } from "../../middleware/role";
import { prisma } from "../../lib/prisma";

const router = express.Router();
const validRoles = ["admin", "seller", "customer"];

router.get("/", authenticateToken, authorizeRoles("admin"), async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(users);
  } catch (err) {
    console.error("❌ Failed to fetch users:", err);
    return res.status(500).json({ message: "Failed to fetch users", error: "Failed to fetch users" });
  }
});

router.put("/:id", authenticateToken, authorizeRoles("admin"), async (req: AuthRequest, res) => {
  const targetId = req.params.id;
  const { role } = req.body;
  if (!role || !validRoles.includes(role.toString().toLowerCase())) {
    return res.status(400).json({ message: "Invalid role", error: "Invalid role" });
  }

  try {
    const userToEdit = await prisma.user.findUnique({ where: { id: targetId } });
    if (!userToEdit) return res.status(404).json({ message: "User not found", error: "User not found" });

    // If target is another admin, prevent changing them
    if (userToEdit.role?.toLowerCase() === "admin" && req.user!.id !== targetId) {
      return res.status(403).json({ message: "Cannot modify another Admin account", error: "Cannot modify another Admin account" });
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { role: role.toString().toLowerCase() },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return res.json(updated);
  } catch (err) {
    console.error("❌ Failed to update user:", err);
    return res.status(500).json({ message: "Failed to update user", error: "Failed to update user" });
  }
});

router.delete("/:id", authenticateToken, authorizeRoles("admin"), async (req: AuthRequest, res) => {
  const targetId = req.params.id;
  try {
    const userToDelete = await prisma.user.findUnique({ where: { id: targetId } });
    if (!userToDelete) return res.status(404).json({ message: "User not found", error: "User not found" });

    if (userToDelete.role?.toLowerCase() === "admin") {
      return res.status(403).json({ message: "Cannot delete Admin accounts", error: "Cannot delete Admin accounts" });
    }

    await prisma.user.delete({ where: { id: targetId } });
    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("❌ Failed to delete user:", err);
    return res.status(500).json({ message: "Failed to delete user", error: "Failed to delete user" });
  }
});

router.post("/", authenticateToken, authorizeRoles("admin"), async (req: AuthRequest, res) => {
  const { name, email, role } = req.body;
  if (!name || !email || !role) return res.status(400).json({ message: "Required fields missing", error: "Required fields missing" });

  const roleLower = role.toString().toLowerCase();
  if (!validRoles.includes(roleLower)) return res.status(400).json({ message: "Invalid role", error: "Invalid role" });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: "User with this email already exists", error: "User exists" });

    const created = await prisma.user.create({
      data: { name, email, role: roleLower },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error("❌ Failed to create user:", err);
    return res.status(500).json({ message: "Failed to create user", error: "Failed to create user" });
  }
});

export default router;
