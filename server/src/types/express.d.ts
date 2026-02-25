import { JwtPayload } from "google-auth-library";
import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      // Raw verified Google token payload
      googleUser?: JwtPayload;

      // Fully loaded DB user from Prisma
      dbUser?: User;
    }
  }
}

export {};