import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    return NextResponse.json({ success: true, url: result?.url || "/dashboard" });
  } catch (error) {
    console.error("Credentials login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
