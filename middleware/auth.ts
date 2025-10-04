// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface SupabaseJwtPayload {
  sub: string; // user id (UUID)
  email?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string; // optionally filled later
  };
}

const apiError = (res: Response, status: number, message: string) =>
  res.status(status).json({ error: message, message });

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) return apiError(res, 401, "No token provided");

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret || !process.env.SUPABASE_PROJECT_REF) {
    console.error("Missing required environment variables: SUPABASE_JWT_SECRET or SUPABASE_PROJECT_REF");
    return apiError(res, 500, "Server misconfiguration");
  }

  try {
    const decoded = jwt.verify(token, secret) as SupabaseJwtPayload;
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return apiError(res, 403, "Token expired");
    }

    const expectedBase = `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co`;
    if (!decoded.iss || !decoded.iss.startsWith(expectedBase)) {
      console.error("Invalid token issuer:", decoded.iss);
      return apiError(res, 401, "Invalid token issuer");
    }

    if (!decoded.sub) {
      return apiError(res, 401, "Invalid token payload");
    }

    // Attach minimal auth info; role will be resolved from DB when needed
    req.user = { id: decoded.sub, email: decoded.email };
    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Authenticated user id:", decoded.sub, "email:", decoded.email);
    }
    next();
  } catch (err: any) {
    console.error("JWT verify error:", err?.name, err?.message);
    if (err.name === "TokenExpiredError") return apiError(res, 403, "Token expired");
    return apiError(res, 401, "Invalid token");
  }
};
