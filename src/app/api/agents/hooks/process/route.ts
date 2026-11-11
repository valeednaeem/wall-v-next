import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { processHooks } from "@/lib/agent-hooks";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const { formType, data } = await request.json();

    if (!formType || !data) {
      return NextResponse.json({ error: "formType and data are required" }, { status: 400 });
    }

    // Process form-handler hooks
    const results = await processHooks("form-handler", {
      form: {
        type: formType,
        ...data,
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      hooksProcessed: results.length,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Form processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
