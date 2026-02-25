import express, { Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { authorizeRoles } from "../middleware/role";
import { prisma } from "../lib/prisma";

const router = express.Router();

/**
 * GET /seller/parts
 * - Only seller/admin can view parts they created
 */
router.get("/parts", authenticateToken, authorizeRoles("seller", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const parts = await prisma.part.findMany({
      where: { createdBy: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(parts);
  } catch (err) {
    console.error("❌ Failed to fetch seller parts:", err);
    res.status(500).json({ error: "Failed to fetch parts", message: "Failed to fetch parts" });
  }
});

/**
 * POST /seller/parts
 * - Only seller/admin can add parts
 */
router.post("/parts", authenticateToken, authorizeRoles("seller", "admin"), async (req: AuthRequest, res: Response) => {
  const { name, description, price, inStock, category, carName, model, year, imageUrl } = req.body;

  if (!name || price === undefined || !category || !carName || !model || year === undefined) {
    return res.status(400).json({ error: "Missing required fields", message: "Missing required fields" });
  }

  const priceNum = Number(price);
  const yearNum = Number(year);

  if (isNaN(priceNum) || priceNum <= 0) return res.status(400).json({ error: "Invalid price", message: "Invalid price" });
  if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
    return res.status(400).json({ error: "Invalid year", message: "Invalid year" });
  }

  try {
    const part = await prisma.part.create({
      data: {
        name,
        description: description || "",
        price: priceNum,
        inStock: inStock ?? true,
        category,
        carName,
        model,
        year: yearNum,
        createdBy: req.user!.id,
        imageUrl: imageUrl && typeof imageUrl === "string" ? imageUrl : null,
      },
    });
    res.status(201).json(part);
  } catch (err) {
    console.error("❌ Failed to add part:", err);
    res.status(500).json({ error: "Failed to add part", message: "Failed to add part" });
  }
});

/**
 * PUT /seller/parts/:id
 * - Seller can only edit their own parts
 * - Admin can edit any part
 */
router.put("/parts/:id", authenticateToken, authorizeRoles("seller", "admin"), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid part ID", message: "Invalid part ID" });

  const { name, description, price, inStock, category, carName, model, year, imageUrl } = req.body;
  const priceNum = Number(price);
  const yearNum = Number(year);

  if (!name || isNaN(priceNum) || isNaN(yearNum)) {
    return res.status(400).json({ error: "Valid name, price, and year required", message: "Valid name, price, and year required" });
  }

  try {
    const part = await prisma.part.findUnique({ where: { id } });
    if (!part) return res.status(404).json({ error: "Part not found", message: "Part not found" });

    if (req.user!.role === "seller" && part.createdBy !== req.user!.id) {
      return res.status(403).json({ error: "You can only edit your own parts", message: "You can only edit your own parts" });
    }

    const updateData: any = { name, description, price: priceNum, inStock: inStock ?? true, category, carName, model, year: yearNum };
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl && typeof imageUrl === "string" ? imageUrl : null;

    const updatedPart = await prisma.part.update({
      where: { id },
      data: updateData,
    });

    res.json(updatedPart);
  } catch (err) {
    console.error("❌ Failed to update part:", err);
    res.status(500).json({ error: "Failed to update part", message: "Failed to update part" });
  }
});

/**
 * DELETE /seller/parts/:id
 * - Seller can only delete their own parts
 * - Admin can delete any
 */
router.delete("/parts/:id", authenticateToken, authorizeRoles("seller", "admin"), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid part ID", message: "Invalid part ID" });

  try {
    const part = await prisma.part.findUnique({ where: { id } });
    if (!part) return res.status(404).json({ error: "Part not found", message: "Part not found" });

    if (req.user!.role === "seller" && part.createdBy !== req.user!.id) {
      return res.status(403).json({ error: "You can only delete your own parts", message: "You can only delete your own parts" });
    }

    await prisma.part.delete({ where: { id } });
    res.json({ message: "Part deleted successfully" });
  } catch (err) {
    console.error("❌ Failed to delete part:", err);
    res.status(500).json({ error: "Failed to delete part", message: "Failed to delete part" });
  }
});

export default router;
