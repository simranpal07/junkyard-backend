// middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET not set in environment variables");
}

// Define payload structure
interface JwtPayload {
  id: number;
  email: string;
  name: string;
  role: string;
}

// Extend Express Request
export interface AuthRequest extends Request {
  userId?: number;
  role?: string;
  user?: JwtPayload; // ✅ Now we'll actually use it
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "Invalid Authorization header format" });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // ✅ Assign all values
    req.userId = decoded.id;
    req.role = decoded.role;
    req.user = decoded; // ✅ Now req.user is available in routes

    console.log("Authenticated user:", { userId: req.userId, role: req.role });

    next();
  } catch (err: any) {
    console.error("JWT verification error:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token expired" });
    }

    return res.status(403).json({ message: "Invalid or expired token" });
  }
};