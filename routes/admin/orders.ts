// src/routes/admin/orders.ts
import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../../middleware/auth";
import { authorizeRoles } from "../../middleware/role";
import { prisma } from "../../lib/prisma";

const router = Router();
const validStatuses = ["placed", "shipped", "cancelled"];

router.get("/", authenticateToken, authorizeRoles("admin"), async (_req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            phoneNumber: true // Include customer phone number
          } 
        },
        items: { 
          include: { 
            part: true 
          } 
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch seller details for each order
    const ordersWithSellerDetails = await Promise.all(
      orders.map(async (order: any) => {
        const sellerIds = order.items.map((item: any) => item.part.createdBy);
        const uniqueSellerIds = Array.from(new Set(sellerIds)) as string[]; // Explicitly type as string[]

        const sellers = await prisma.user.findMany({
          where: {
            id: {
              in: uniqueSellerIds,
            },
          },
          select: {
            id: true,
            name: true,
            phoneNumber: true, // Include seller phone number
          },
        });

        const total = order.items.reduce((sum: any, it: any) => sum + (it.part?.price ?? 0) * it.quantity, 0);

        return {
          ...order,
          total,
          sellers, // Add seller information to the order
        };
      })
    );

    return res.json(ordersWithSellerDetails);
  } catch (err) {
    console.error("❌ Failed to fetch admin orders:", err);
    return res.status(500).json({ error: "Failed to fetch orders", message: "Failed to fetch orders" });
  }
});

// update status (case-insensitive input)
router.put("/:id/status", authenticateToken, authorizeRoles("admin"), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid order ID", message: "Invalid order ID" });

  const status = (req.body.status || "").toString().toLowerCase();
  if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status", message: "Invalid status" });

  // transform to Title Case to match your DB default ("Placed", "Shipped", ...)
  const titleCase = status.charAt(0).toUpperCase() + status.slice(1);

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: { status: titleCase },
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { part: true } },
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("❌ Failed to update order status:", err);
    return res.status(500).json({ error: "Failed to update order", message: "Failed to update order" });
  }
});

export default router;