import type { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../lib/prisma.js';
import jwt from 'jsonwebtoken';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyJWT(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing token" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // 🔥 FIX: use userId, not email
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!dbUser) {
      return res.status(401).json({ error: "User not found" });
    }

    req.dbUser = dbUser;
    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.dbUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.dbUser.type !== "Admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  next();
}


export async function attachUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.googleUser?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { email: req.googleUser.email },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.dbUser = user;
    next();
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
}


export function requireSameUser(fieldName: string = "userId") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requestedUserId =
      req.params[fieldName] ||
      req.body?.[fieldName] ||
      req.query?.[fieldName];

    if (!requestedUserId || typeof requestedUserId !== "string") {
      return res.status(400).json({ error: "Missing user ID" });
    }

    // Admin override
    if (req.dbUser.type === "Admin") {
      return next();
    }

    if (req.dbUser.id !== requestedUserId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}

export function requireReadingOwnership(
  paramName: string = "readingId"
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const readingId =
      req.params[paramName] ||
      req.body?.[paramName] ||
      req.query?.[paramName];

    if (!readingId || typeof readingId !== "string") {
      return res.status(400).json({ error: "Missing reading ID" });
    }

    // ✅ Admin override
    if (req.dbUser.type === "Admin") {
      return next();
    }

    if (!req.dbUser.readings.includes(readingId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}