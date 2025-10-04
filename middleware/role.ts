// src/middleware/role.ts
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { prisma } from "../lib/prisma";

/**
 * authorizeRoles(...allowedRoles)
 * - allowedRoles are strings like "admin", "seller", "customer" (case-insensitive)
 * - This middleware will look up the user's role from the DB (prisma.user) and compare.
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  const allowed = allowedRoles.map(r => r.toLowerCase());
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Not authenticated", message: "Not authenticated" });
    }

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true },
      });

      if (!dbUser) {
        return res.status(403).json({ error: "Access denied", message: "Access denied" });
      }

      const dbRole = (dbUser.role || "").toString().toLowerCase();
      // attach role to req.user for downstream usage
      req.user.role = dbRole;

      if (!allowed.includes(dbRole)) {
        return res.status(403).json({ error: "Access denied", message: "Access denied" });
      }

      next();
    } catch (err) {
      console.error("Role check error:", err);
      return res.status(500).json({ error: "Server error", message: "Server error" });
    }
  };
};
