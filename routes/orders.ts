// src/routes/order.ts
import { Router, Request, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

// POST /orders - Place a new order
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { items, address, phoneNumber } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Invalid order items" });
  }

  if (!address || typeof address !== "string") {
    return res.status(400).json({ message: "Invalid delivery address" });
  }

  // Validate phone number format (e.g., 10 digits for Indian phone numbers)
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return res.status(400).json({ message: "Invalid phone number" });
  }

  try {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });

    // Create a new order
    const newOrder = await prisma.order.create({
      data: {
        userId: req.user.id,
        status: "Placed",
        address,
        phoneNumber,
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