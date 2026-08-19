import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectToDatabase();
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      mongodb: "connected",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        mongodb: "disconnected",
      },
      { status: 503 }
    );
  }
}