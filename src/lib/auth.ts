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
    const email = String(credentials.email).toLowerCase().trim();
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      console.log("[Auth] User not found:", email);
      return null;
    }
    if (!user.password) {
      console.log("[Auth] User has no password:", email);
      return null;
    }

    if (!user.isActive) {
      console.warn("[Auth] Inactive credentials sign-in attempt", { email });
      return null;
    }

    const isValid = await bcrypt.compare(credentials.password as string, user.password);
    if (!isValid) {
      console.log("[Auth] Invalid password for:", email);
      return null;
    }

    console.info("[Auth] Credentials sign-in succeeded", { email, userId: user._id.toString() });

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
      userId: user._id.toString(),
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

async function resolveApplicationAuthorization(userId: string) {
  await connectToDatabase();
  const applicationUser = await User.findById(userId).select("_id email role isActive");
  if (!applicationUser || !applicationUser.isActive) return null;

  const role = applicationUser.role || "customer";
  const roleDocument = await Role.findOne({ slug: role }).select("permissions").lean();

  return {
    userId: applicationUser._id.toString(),
    email: applicationUser.email,
    role,
    // The database role is the permission source of truth. Preserve the
    // system super-admin fallback while a legacy deployment is being seeded.
    permissions: roleDocument?.permissions || (role === "super-admin" ? ["*"] : []),
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      let userId = token.userId as string | undefined;
      if (user) {
        // OAuth providers supply their own account ID as user.id. Resolve the
        // canonical Wall-V user by email so every provider has the same
        // application identity as credentials sign-in.
        await connectToDatabase();
        const email = user.email?.toLowerCase().trim();
        const applicationUser = email ? await User.findOne({ email }).select("_id") : null;
        if (!applicationUser) {
          throw new Error("Unable to create an application session for this account");
        }
        userId = applicationUser._id.toString();
      }

      if (!userId) return token;

      const authorization = await resolveApplicationAuthorization(userId);
      if (!authorization) {
        throw new Error("Unable to resolve the application user for this session");
      }

      token.userId = authorization.userId;
      token.role = authorization.role;
      token.permissions = authorization.permissions;
      token.email = authorization.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.userId = token.userId as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).permissions = Array.isArray(token.permissions) ? token.permissions : [];
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider !== "credentials" && user?.email) {
        try {
          await connectToDatabase();
          const email = user.email.toLowerCase().trim();
          const existingUser = await User.findOne({ email });
          if (!existingUser) {
            await User.create({
              name: user.name || "User",
              email,
              avatar: user.image,
              slug: generateSlug(user.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "user"),
              role: "customer",
              provider: account?.provider,
              providerAccountId: account?.providerAccountId,
              emailVerified: new Date(),
              isEmailVerified: true,
            });
          } else {
            if (!existingUser.isActive) return false;
            await User.updateOne(
              { _id: existingUser._id },
              { $set: { emailVerified: new Date(), isEmailVerified: true, lastLogin: new Date() } }
            );
          }
        } catch {
          // Do not issue an Auth.js session when the internal user cannot be
          // synchronized. A cookie without a Wall-V user would only fail later
          // at authorization time and present as a misleading login loop.
          console.error("[Auth] OAuth user synchronization failed", {
            provider: account?.provider,
            email: user.email,
          });
          return false;
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to the callback URL or dashboard after sign-in
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
});

// Auth helper for API routes — tries legacy JWT cookie first, falls back to NextAuth session
export async function getAuthUser(): Promise<JWTPayload | null> {
  // Auth.js is the canonical dashboard session.
  const session = await auth();
  if (session?.user?.id) {
    return {
      userId: session.user.id,
      email: session.user.email || null,
      role: (session.user as { role?: string }).role || "customer",
      permissions: (session.user as { permissions?: string[] }).permissions || [],
    };
  }

  // Compatibility fallback for non-dashboard legacy clients.
  const cookieStore = await cookies();
  const legacyToken = cookieStore.get("token")?.value;
  if (legacyToken) {
    const payload = verifyToken(legacyToken);
    if (payload) return payload;
  }

  return null;
}

export async function getFullUser() {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  await connectToDatabase();
  const user = await User.findById(authUser.userId).select("-password").lean();
  return user;
}
