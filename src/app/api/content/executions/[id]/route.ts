import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ContentExecution from "@/models/content-execution";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const execution = await ContentExecution.findById(id).lean();
    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }
    return NextResponse.json({ execution });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
