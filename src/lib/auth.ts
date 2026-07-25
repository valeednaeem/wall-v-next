import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import GitHub from "next-auth/providers/github";
import LinkedIn from "next-auth/providers/linkedin";
import Credentials from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import Role from "@/models/role";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { verifyToken, type JWTPayload } from "./jwt";

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }));
}
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(Facebook({
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  }));
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(GitHub({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  }));
}
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  providers.push(LinkedIn({
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  }));
}

providers.push(Credentials({
  name: "credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      console.log("[Auth] Missing credentials");
      return null;
    }

    await connectToDatabase();
    const user = await User.findOne({ email: credentials.email }).select("+password");
    if (!user) {
      console.log("[Auth] User not found:", credentials.email);
      return null;
    }
    if (!user.password) {
      console.log("[Auth] User has no password:", credentials.email);
      return null;
    }

    const isValid = await bcrypt.compare(credentials.password as string, user.password);
    if (!isValid) {
      console.log("[Auth] Invalid password for:", credentials.email);
      return null;
    }

    console.log("[Auth] Login success for:", credentials.email);

    // Look up role slug from Role collection
    let roleSlug = "customer";
    if (user.role) {
      if (typeof user.role === "string") {
        roleSlug = user.role;
      } else {
        const roleDoc = await Role.findById(user.role);
        roleSlug = roleDoc?.slug || "customer";
      }
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      image: user.avatar,
      role: roleSlug,
    };
  },
}));

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${Date.now()}`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userRole = (user as any).role;
        token.role = typeof userRole === "string" ? userRole : userRole?.slug || "customer";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider !== "credentials") {
        try {
          await connectToDatabase();
          const existingUser = await User.findOne({ email: user.email });
          if (!existingUser) {
            await User.create({
              name: user.name || "User",
              email: user.email,
              avatar: user.image,
              slug: generateSlug(user.name || "user"),
              role: "customer",
              provider: account?.provider,
              providerAccountId: account?.providerAccountId,
              emailVerified: new Date(),
              isEmailVerified: true,
            });
          } else {
            if (!existingUser.emailVerified) {
              await User.updateOne(
                { _id: existingUser._id },
                { $set: { emailVerified: new Date(), isEmailVerified: true } }
              );
            }
            const roleSlug = typeof existingUser.role === "string" ? existingUser.role : "customer";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (user as any).role = roleSlug;
          }
        } catch (err) {
          console.error("[Auth] OAuth signIn callback error:", err);
        }
      }
      return true;
    },
  },
});

// Legacy JWT helpers for API routes that still use cookie-based auth
export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return payload;
}

export async function getFullUser() {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  await connectToDatabase();
  const user = await User.findById(authUser.userId).select("-password").lean();
  return user;
}

export function requireAuth(handler: Function) {
  return async (req: Request, ctx?: unknown) => {
    const authUser = await getAuthUser();
    if (!authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return handler(req, ctx, authUser);
  };
}

export function requireRole(roles: string[]) {
  return (handler: Function) => async (req: Request, ctx?: unknown) => {
    const authUser = await getAuthUser();
    if (!authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!roles.includes(authUser.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    return handler(req, ctx, authUser);
  };
}
