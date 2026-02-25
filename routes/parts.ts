// src/routes/parts.ts
import express, { Request, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { authorizeRoles } from "../middleware/role";
import { prisma } from "../lib/prisma";

const router = express.Router();

/**
 * POST /api/parts
 * - allowed: seller, admin
 */
router.post("/", authenticateToken, authorizeRoles("seller", "admin"), async (req: AuthRequest, res: Response) => {
  const { name, description, price, inStock, category, carName, model, year, imageUrl } = req.body;

  if (!name || price === undefined || !category || !carName || !model || year === undefined) {
    return res.status(400).json({ error: "Missing required fields", message: "Missing required fields" });
  }

  const priceNum = Number(price);
  const yearNum = Number(year);

  if (isNaN(priceNum) || priceNum < 0) return res.status(400).json({ error: "Valid price required", message: "Valid price required" });
  if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
    return res.status(400).json({ error: "Valid year required", message: "Valid year required" });
  }

  try {
    const created = await prisma.part.create({
      data: {
        name,
        description,
        price: priceNum,
        createdBy: req.user!.id,
        inStock: inStock ?? true,
        category,
        carName,
        model,
        year: yearNum,
        imageUrl: imageUrl && typeof imageUrl === "string" ? imageUrl : null,
      },
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error("❌ Failed to create part:", err);
    return res.status(500).json({ error: "Failed to create part", message: "Failed to create part" });
  }
});

/**
 * GET /api/parts/filter-options
 * Returns distinct carName, model, year for filter dropdowns (public).
 */
router.get("/filter-options", async (req: Request, res: Response) => {
  const { category, carName, model } = req.query;

  try {
    const makesWhere: any = { carName: { not: "" } };
    if (category) makesWhere.category = { equals: category as string, mode: "insensitive" };

    const modelsWhere: any = { model: { not: "" } };
    if (category) modelsWhere.category = { equals: category as string, mode: "insensitive" };
    if (carName) modelsWhere.carName = { equals: carName as string, mode: "insensitive" };

    const yearsWhere: any = { year: { not: 0 } };
    if (category) yearsWhere.category = { equals: category as string, mode: "insensitive" };
    if (carName) yearsWhere.carName = { equals: carName as string, mode: "insensitive" };
    if (model) yearsWhere.model = { equals: model as string, mode: "insensitive" };

    const [partsForMakes, partsForModels, partsForYears] = await Promise.all([
      prisma.part.findMany({ select: { carName: true }, where: makesWhere, distinct: ["carName"], orderBy: { carName: "asc" } }),
      prisma.part.findMany({ select: { model: true }, where: modelsWhere, distinct: ["model"], orderBy: { model: "asc" } }),
      prisma.part.findMany({ select: { year: true }, where: yearsWhere, distinct: ["year"], orderBy: { year: "desc" } }),
    ]);
    const carNames = partsForMakes.map((p) => p.carName).filter(Boolean);
    const models = partsForModels.map((p) => p.model).filter(Boolean);
    const years = partsForYears.map((p) => p.year).filter((y) => y > 0);
    return res.json({ carNames, models, years });
  } catch (err) {
    console.error("❌ Failed to fetch filter options:", err);
    return res.status(500).json({ error: "Failed to fetch filter options", message: "Failed to fetch filter options" });
  }
});

/**
 * GET /api/parts (public)
 */
router.get("/", async (req: Request, res: Response) => {
  const { carName, model, year, category, sellerName, q } = req.query;
  const where: any = {};

  if (carName) where.carName = { equals: carName as string, mode: "insensitive" };
  if (model) where.model = { equals: model as string, mode: "insensitive" };
  const yearNum = year ? parseInt(year as string, 10) : undefined;
  if (yearNum !== undefined && !isNaN(yearNum)) where.year = yearNum;
  if (category) where.category = { equals: category as string, mode: "insensitive" };

  if (sellerName && typeof sellerName === "string" && sellerName.trim()) {
    where.user = {
      name: { contains: sellerName.trim(), mode: "insensitive" },
    };
  }

  const qStr = typeof q === "string" ? q.trim() : "";
  if (qStr) {
    const qYear = parseInt(qStr, 10);
    where.OR = [
      { name: { contains: qStr, mode: "insensitive" } },
      { description: { contains: qStr, mode: "insensitive" } },
      { carName: { contains: qStr, mode: "insensitive" } },
      { model: { contains: qStr, mode: "insensitive" } },
      { category: { contains: qStr, mode: "insensitive" } },
      { user: { name: { contains: qStr, mode: "insensitive" } } },
      ...(isNaN(qYear) ? [] : [{ year: qYear }]),
    ];
  }

  try {
    const parts = await prisma.part.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    });
    // Strip user object if you don't want to expose seller name in list (optional)
    const payload = parts.map(({ user, ...p }) => ({ ...p, sellerName: user?.name ?? null }));
    return res.json(payload);
  } catch (err) {
    console.error("❌ Failed to fetch parts:", err);
    return res.status(500).json({ error: "Failed to fetch parts", message: "Failed to fetch parts" });
  }
});

/**
 * PUT /api/parts/:id
 * - seller: only their own parts
 * - admin: any part
 */
router.put("/:id", authenticateToken, authorizeRoles("seller", "admin"), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid part id", message: "Invalid part id" });

  const { name, description, price, inStock, category, carName, model, year, imageUrl } = req.body;

  const priceNum = Number(price);
  const yearNum = Number(year);

  if (!name || isNaN(priceNum) || isNaN(yearNum)) {
    return res.status(400).json({ error: "Valid name, price and year required", message: "Valid name, price and year required" });
  }

  try {
    const existing = await prisma.part.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Part not found", message: "Part not found" });

    // If seller, ensure they own this part
    if (req.user!.role === "seller" && existing.createdBy !== req.user!.id) {
      return res.status(403).json({ error: "You can only edit your own parts", message: "You can only edit your own parts" });
    }

    const updateData: any = {
      name,
      description,
      price: priceNum,
      inStock: inStock ?? true,
      category,
      carName,
      model,
      year: yearNum,
    };
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl && typeof imageUrl === "string" ? imageUrl : null;

    const updated = await prisma.part.update({
      where: { id },
      data: updateData,
    });

    return res.json(updated);
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Part not found", message: "Part not found" });
    console.error("❌ Failed to update part:", err);
    return res.status(500).json({ error: "Failed to update part", message: "Failed to update part" });
  }
});

/**
 * DELETE /api/parts/:id
 * - seller: only their own
 * - admin: any
 */
router.delete("/:id", authenticateToken, authorizeRoles("seller", "admin"), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid part id", message: "Invalid part id" });

  try {
    const existing = await prisma.part.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Part not found", message: "Part not found" });

    if (req.user!.role === "seller" && existing.createdBy !== req.user!.id) {
      return res.status(403).json({ error: "You can only delete your own parts", message: "You can only delete your own parts" });
    }

    await prisma.part.delete({ where: { id } });
    return res.json({ message: "Part deleted successfully" });
  } catch (err: any) {
    console.error("❌ Failed to delete part:", err);
    return res.status(500).json({ error: "Failed to delete part", message: "Failed to delete part" });
  }
});

export default router;
