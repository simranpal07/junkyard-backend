import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

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
      res.status(500).json({
        error: "Failed to fetch your parts",
        details: error,
      });
    }
  }
);

// POST /seller/parts - Add a new part (owned by seller)
router.post(
  "/parts",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const { name, description, price, inStock } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        error: "Name and price are required",
      });
    }

    try {
      const part = await prisma.part.create({
         data:{
          name,
          description,
          price: parseFloat(price),
          inStock: inStock ?? true,
          createdBy: req.userId!, // Assigned to logged-in seller
        },
      });
      res.status(201).json(part);
    } catch (error) {
      res.status(500).json({
        error: "Failed to add part",
        details: error,
      });
    }
  }
);

// PUT /seller/parts/:id - Update own part
router.put(
  "/parts/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, description, price, inStock } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        error: "Name and price are required",
      });
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
          description,
          price: parseFloat(price),
          inStock: inStock ?? true,
        },
      });

      res.json(updatedPart);
    } catch (error) {
      if ((error as any).code === "P2025") {
        return res.status(404).json({ error: "Part not found" });
      }
      res.status(500).json({
        error: "Failed to update part",
        details: error,
      });
    }
  }
);

export default router;