import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// POST /parts - Add a new part
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  const { name, description, price, createdBy,inStock } = req.body;

  if (!name || !price || !createdBy) {
    return res.status(400).json({
      error: "name, price, and createdBy are required",
    });
  }

  try {
    const part = await prisma.part.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        createdBy,
        inStock: inStock ?? true, // Use provided value or default to true
      },
    });
    res.status(201).json(part);
  } catch (error) {
    res.status(500).json({ error: "Failed to create part", details: error });
  }
});
// GET /parts - Get all parts
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const parts = await prisma.part.findMany();
    res.json(parts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch parts", details: error });
  }
});

// PUT /parts/:id - Update a part
router.put("/:id", authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, createdBy, inStock } = req.body;

  if (!name || !price || !createdBy) {
    return res.status(400).json({
      error: "name, price, and createdBy are required",
    });
  }

  try {
    const updatedPart = await prisma.part.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        price: parseFloat(price),
        createdBy,
        inStock: inStock ?? true,
      },
    });
    res.json(updatedPart);
  } catch (error) {
    if ((error as any).code === "P2025") {
      return res.status(404).json({ error: "Part not found" });
    }
    res.status(500).json({ error: "Failed to update part", details: error });
  }
});
// DELETE /parts/:id - Delete a part
router.delete("/:id", authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.part.delete({
      where: { id: Number(id) },
    });
    res.status(200).json({ message: "Part deleted successfully" });
  } catch (error) {
    if (error instanceof Error && (error as any).code === "P2025") {
      return res.status(404).json({ error: "Part not found" });
    }
    res.status(500).json({ error: "Failed to delete part", details: error });
  }
});

export default router;