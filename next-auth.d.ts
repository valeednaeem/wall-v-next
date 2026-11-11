import { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      userId: string;
      role: string;
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    userId: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId?: string;
    role?: string;
    permissions?: string[];
  }
}
