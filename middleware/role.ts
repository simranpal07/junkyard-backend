import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission." });
    }
    next();
  };
};
