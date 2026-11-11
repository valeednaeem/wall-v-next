import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import GoogleServiceConfig from "@/models/google-services";

export async function GET() {
  try {
    await connectToDatabase();

    const service = await GoogleServiceConfig.findOne({ serviceId: "analytics" }).lean();

    if (!service) {
      return NextResponse.json({
        success: true,
        data: {
          enabled: false,
          measurementId: "",
          debugMode: false,
          consentMode: "default",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        enabled: service.enabled === true && service.status === "connected",
        measurementId: service.config?.measurementId || "",
        propertyId: service.config?.propertyId || "",
        debugMode: service.config?.debugMode || false,
        consentMode: service.config?.consentMode || "default",
      },
    });
  } catch (error) {
    console.error("Public GA config error:", error);
    return NextResponse.json({
      success: true,
      data: {
        enabled: false,
        measurementId: "",
        debugMode: false,
        consentMode: "default",
      },
    });
  }
}