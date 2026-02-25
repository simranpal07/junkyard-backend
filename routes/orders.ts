// src/routes/order.ts
import { Router, Request, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

// POST /orders - Place a new order
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { items, address, phoneNumber, idempotencyKey } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Invalid order items" });
  }

  for (const item of items) {
    const partId = item?.partId != null ? Number(item.partId) : NaN;
    const quantity = item?.quantity != null ? Number(item.quantity) : NaN;
    if (!Number.isInteger(partId) || partId < 1 || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: "Each item must have a valid partId and quantity (positive integers)" });
    }
  }

  if (!address || typeof address !== "string" || !address.trim()) {
    return res.status(400).json({ message: "Invalid delivery address" });
  }

  const phoneRegex = /^\d{10}$/;
  if (!phoneNumber || !phoneRegex.test(String(phoneNumber).trim())) {
    return res.status(400).json({ message: "Invalid phone number (10 digits required)" });
  }

  try {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });

    let existingOrder = null;

    // If client provided an idempotency key, try to reuse existing order
    if (idempotencyKey && typeof idempotencyKey === "string") {
      existingOrder = await prisma.order.findFirst({
        where: { userId: req.user.id, idempotencyKey },
        include: {
          items: {
            include: { part: true },
          },
        },
      });
    }

    if (existingOrder) {
      return res.json({ message: "Order already placed", order: existingOrder });
    }

    // Create a new order
    const newOrder = await prisma.order.create({
      data: {
        userId: req.user.id,
        status: "Placed",
        address,
        phoneNumber,
        idempotencyKey: typeof idempotencyKey === "string" ? idempotencyKey : null,
        items: {
          create: items.map((item: any) => ({
            partId: item.partId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            part: true,
          },
        },
      },
    });

    return res.json({ message: "Order placed successfully", order: newOrder });
  } catch (err) {
    console.error("❌ Error placing order:", err);
    return res.status(500).json({ message: "Failed to place order" });
  }
});

// GET /orders - Fetch all orders for a user
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });

    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            part: true,
          },
        },
      },
    });

    return res.json(orders);
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
});

export default router;