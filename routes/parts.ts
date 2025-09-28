import express, { Request, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = express.Router();
// ✅ New way (import the shared instance)
import { prisma } from '../lib/prisma';

// POST /parts - Add a new part
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { name, description, price, createdBy, inStock, category, carName, model, year } = req.body;

  // ✅ Keep original required fields + add new ones as required
  if (!name || !price || !createdBy || !category || !carName || !model || !year) {
    return res.status(400).json({
      error:
        "name, price, createdBy, category, carName, model, and year are required",
    });
  }

  // ✅ Validate year and price
  const yearNum = parseInt(year);
  const priceNum = parseFloat(price);

  if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
    return res.status(400).json({ error: "Valid year is required" });
  }

  if (isNaN(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: "Valid price is required" });
  }

  try {
    const part = await prisma.part.create({
      data: {
        name,
        description,
        price: priceNum,
        createdBy,
        inStock: inStock ?? true,
        category,           // ✅ New field
        carName,            // ✅ New field
        model,              // ✅ New field
        year: yearNum,       // ✅ New field
      },
    });
    res.status(201).json(part);
  } catch (error: any) {
    console.error("Failed to create part:", error);
    res.status(500).json({ error: "Failed to create part" });
  }
});
// GET /parts - Get all parts (Public route)
router.get("/", async (req: Request, res: Response) => {
  const { carName, model, year, category } = req.query;

  const where: any = {};

  if (carName) where.carName = { equals: carName, mode: "insensitive" };
  if (model) where.model = { equals: model, mode: "insensitive" };
  if (year) where.year = { equals: parseInt(year as string) };
  if (category) where.category = { equals: category, mode: "insensitive" };

  try {
    const parts = await prisma.part.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json(parts);
  } catch (error: any) {
    console.error("Failed to fetch parts:", error);
    res.status(500).json({ error: "Failed to fetch parts" });
  }
});
// PUT /parts/:id - Update a part
router.put("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, price, createdBy, inStock, category, carName, model, year } = req.body;

  // ✅ Validate required fields including new ones
  if (!name || !price || !createdBy || !category || !carName || !model || !year) {
    return res.status(400).json({
      error:
        "name, price, createdBy, category, carName, model, and year are required",
    });
  }

  const yearNum = parseInt(year);
  const priceNum = parseFloat(price);

  if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
    return res.status(400).json({ error: "Valid year is required" });
  }

  if (isNaN(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: "Valid price is required" });
  }

  try {
    const updatedPart = await prisma.part.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        price: priceNum,
        createdBy,
        inStock: inStock ?? true,
        category,           // ✅ New field
        carName,            // ✅ New field
        model,              // ✅ New field
        year: yearNum,       // ✅ New field
      },
    });
    res.json(updatedPart);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Part not found" });
    }
    console.error("Failed to update part:", error);
    res.status(500).json({ error: "Failed to update part" });
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
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Part not found" });
    }
    console.error("Failed to delete part:", error);
    res.status(500).json({ error: "Failed to delete part" });
  }
});

export default router;