// routes/seller.ts
import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = express.Router();
// ✅ New way (import the shared instance)
import { prisma } from '../lib/prisma';

// GET /seller/parts - Get only parts created by this seller
router.get(
  "/parts",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const parts = await prisma.part.findMany({
        where: {
          createdBy: req.userId!, // Only parts created by this user
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.json(parts);
    } catch (error) {
      console.error("Failed to fetch parts:", error);
      res.status(500).json({ error: "Failed to fetch your parts" });
    }
  }
);

// POST /seller/parts - Add a new part (owned by seller)
router.post(
  "/parts",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const { name, description, price, inStock, category, carName, model, year } = req.body;

    // ✅ Validate required fields
    if (!name || !price || !category || !carName || !model || !year) {
      return res.status(400).json({
        error:
          "Name, price, category, carName, model, and year are required",
      });
    }

    const priceNum = parseFloat(price);
    const yearNum = parseInt(year);

    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: "Valid price is required" });
    }

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
      return res.status(400).json({ error: "Valid year is required" });
    }

    try {
      const part = await prisma.part.create({
         data:{
          name,
          description: description || "",
          price: priceNum,
          inStock: inStock ?? true,
          category,
          carName,
          model,
          year: yearNum,
          createdBy: req.userId!, // Assigned to logged-in seller
        },
      });
      res.status(201).json(part);
    } catch (error: any) {
      console.error("Failed to create part:", error);
      res.status(500).json({ error: "Failed to add part" });
    }
  }
);

// PUT /seller/parts/:id - Update own part
router.put(
  "/parts/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, description, price, inStock, category, carName, model, year } = req.body;

    if (!name || !price || !category || !carName || !model || !year) {
      return res.status(400).json({
        error: "Name, price, category, carName, model, and year are required",
      });
    }

    const priceNum = parseFloat(price);
    const yearNum = parseInt(year);

    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: "Valid price is required" });
    }

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
      return res.status(400).json({ error: "Valid year is required" });
    }

    try {
      // Check if part exists and belongs to user
      const part = await prisma.part.findUnique({
        where: { id: Number(id) },
      });

      if (!part) {
        return res.status(404).json({ error: "Part not found" });
      }

      if (part.createdBy !== req.userId) {
        return res.status(403).json({
          error: "You can only edit your own parts",
        });
      }

      const updatedPart = await prisma.part.update({
        where: { id: Number(id) },
         data:{
          name,
          description: description || "",
          price: priceNum,
          inStock: inStock ?? true,
          category,
          carName,
          model,
          year: yearNum,
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
  }
);

export default router;