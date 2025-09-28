// routes/admin/orders.ts
import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../../middleware/auth";
import { prisma } from '../../lib/prisma';

const router = Router();

// GET /api/admin/orders — Admin only
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  // Optional: enforce admin role
  if (req.role !== "Admin") {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { part: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Add total to each order
    const ordersWithTotal = orders.map(order => ({
      ...order,
      total: order.items.reduce((sum, item) => sum + item.part.price * item.quantity, 0),
    }));

    return res.json(ordersWithTotal);
  } catch (error: any) {
    console.error("Failed to fetch admin orders:", error);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// PUT /api/admin/orders/:id/status — Update order status
router.put("/:id/status", authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.role !== "Admin") {
    return res.status(403).json({ error: "Access denied" });
  }

  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["Placed", "Shipped", "Cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { part: true } },
      },
    });

    return res.json(updatedOrder);
  } catch (error: any) {
    console.error("Failed to update order status:", error);
    return res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;