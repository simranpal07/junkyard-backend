// routes/orders.ts
import { Router, Request, Response } from "express"; // ✅ Added Request & Response
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// POST /api/orders - Place new order
console.log("✅ Orders route loaded");

router.post(
  "/",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const { partId, quantity = 1 } = req.body;
    const userId = req.userId;

    // Validate
    if (!partId) {
      return res.status(400).json({ error: "Part ID is required" });
    }

    try {
      const order = await prisma.order.create({
        data: { 
          partId,
          userId,
          quantity,
        },
      });

      console.log(`🔔 New order from user ${userId} for part ${partId}`); // Notify admin

      res.status(201).json(order);
    } catch (error: any) {
      console.error("Failed to place order:", error);
      res.status(500).json({ error: "Failed to place order" });
    }
  }
);

export default router;