// routes/orders.ts
import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { prisma } from '../lib/prisma';

const router = Router();

// POST /api/orders - Place new order
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { items } = req.body; // array of { partId: number, quantity: number }
  const userId = req.userId;

  // Validate input structure
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items array is required" });
  }

  // Parse and validate each item
  const validItems = [];
  for (const item of items) {
    const partId = Number(item.partId);
    const quantity = Number(item.quantity);

    if (!partId || isNaN(partId) || partId <= 0) {
      continue; // skip invalid partId
    }
    if (!quantity || isNaN(quantity) || quantity <= 0) {
      continue; // skip invalid quantity
    }

    validItems.push({ partId, quantity });
  }

  if (validItems.length === 0) {
    return res.status(400).json({ error: "No valid items provided" });
  }

  try {
    // 🔍 Check if all parts exist
    const partIds = validItems.map(i => i.partId);
    const existingParts = await prisma.part.findMany({
      where: { 
        id: { in: partIds },
        inStock: true // Optional: only allow ordering in-stock parts
      },
      select: { id: true },
    });

    const existingPartIds = new Set(existingParts.map(p => p.id));
    const missingOrOutOfStock = partIds.filter(id => !existingPartIds.has(id));

    if (missingOrOutOfStock.length > 0) {
      return res.status(400).json({
        error: `One or more parts are not available: IDs ${missingOrOutOfStock.join(', ')}`,
      });
    }

    // ✅ Create order with nested order items
    const order = await prisma.order.create({
      data: {
        userId,
        status: "Placed",
        items: {
          create: validItems.map(({ partId, quantity }) => ({
            part: { connect: { id: partId } },
            quantity,
          })),
        },
      },
      include: {
        items: {
          include: { part: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    console.log(`🔔 New order from user ${userId}`, order);
    return res.status(201).json(order);

  } catch (error: any) {
    console.error("Failed to place order:", error);
    return res.status(500).json({ error: "Failed to place order" });
  }
});

// GET /api/orders - Get all orders for logged-in user
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: { part: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(orders);
  } catch (error: any) {
    console.error("❌ Failed to fetch orders:", error);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default router;