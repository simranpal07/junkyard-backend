// src/routes/user.ts
import { Router, Request, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /api/auth/me
router.get("/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });

    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, phoneNumber: true },
    });

    if (!dbUser) return res.status(404).json({ message: "User not found in database" });

    return res.json({ user: dbUser });
  } catch (err) {
    console.error("❌ Error fetching user from DB:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /user/save-phone-and-address - Save phone number and address together
router.post("/save-phone-and-address", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { phoneNumber, address } = req.body;

  if (!phoneNumber || typeof phoneNumber !== "string") {
    return res.status(400).json({ message: "Invalid phone number" });
  }

  if (!address || typeof address !== "string") {
    return res.status(400).json({ message: "Invalid address" });
  }

  try {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });

    // Check if the user already has 4 addresses
    const addressCount = await prisma.address.count({
      where: { userId: req.user.id },
    });

    if (addressCount >= 4) {
      return res.status(400).json({ message: "You can only save up to 4 addresses" });
    }

    // Update phone number
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { phoneNumber },
    });

    // Create a new address
    const newAddress = await prisma.address.create({
      data: {
        userId: req.user.id,
        address,
      },
    });

    return res.json({
      message: "Phone number and address saved successfully",
      user: updatedUser,
      address: newAddress,
    });
  } catch (err) {
    console.error("❌ Error saving phone number and address:", err);
    return res.status(500).json({ message: "Failed to save phone number and address" });
  }
});

// DELETE /user/delete-address/:id - Delete a saved address
router.delete("/delete-address/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });

    const deletedAddress = await prisma.address.delete({
      where: { id: parseInt(id), userId: req.user.id },
    });

    if (!deletedAddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    return res.json({ message: "Address deleted successfully", address: deletedAddress });
  } catch (err) {
    console.error("❌ Error deleting address:", err);
    return res.status(500).json({ message: "Failed to delete address" });
  }
});

router.get("/addresses", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });

    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
    });

    // Get user's phone number to attach to each address
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { phoneNumber: true },
    });

    // Attach phone number to each address
    const addressesWithPhone = addresses.map(addr => ({
      ...addr,
      phoneNumber: user?.phoneNumber || null
    }));

    return res.json({ addresses: addressesWithPhone });
  } catch (err) {
    console.error("❌ Error fetching addresses:", err);
    return res.status(500).json({ message: "Failed to fetch addresses" });
  }
});

export default router;