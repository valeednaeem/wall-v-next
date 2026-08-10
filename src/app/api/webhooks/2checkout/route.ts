import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/order";
import Project from "@/models/project";
import Invoice from "@/models/invoice";
import { verifyIpnHash, generateIpnResponse, generateIpnErrorResponse } from "@/services/2checkout";

export async function POST(request: Request) {
  try {
    // 2Checkout sends IPN as form-urlencoded POST
    const text = await request.text();
    const params = new URLSearchParams(text);

    // Convert to flat record for array params
    const ipnParams: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      ipnParams[key] = value;
    }

    console.log("[2Checkout IPN] Received:", JSON.stringify({
      refno: ipnParams.REFNO,
      orderno: ipnParams.ORDERNO,
      status: ipnParams.ORDERSTATUS,
      currency: ipnParams.CURRENCY,
      total: ipnParams.IPN_TOTALGENERAL,
    }));

    // Verify HMAC signature (optional but recommended)
    const receivedHash = ipnParams.HASH || ipnParams.HASH_SHA3 || "";
    if (receivedHash) {
      const isValid = verifyIpnHash(ipnParams, receivedHash);
      if (!isValid) {
        console.error("[2Checkout IPN] Invalid HMAC signature");
        return new NextResponse(generateIpnErrorResponse(), {
          status: 400,
          headers: { "Content-Type": "text/xml" },
        });
      }
    }

    const orderStatus = ipnParams.ORDERSTATUS;
    const orderRefNo = ipnParams.REFNO;
    const orderNo = ipnParams.ORDERNO;
    const refNoExt = ipnParams.REFNOEXT || "";
    const currency = ipnParams.CURRENCY || "USD";
    const totalGeneral = parseFloat(ipnParams.IPN_TOTALGENERAL || "0");
    const saleDate = ipnParams.SALEDATE || "";
    const customerEmail = ipnParams.CUSTOMEREMAIL || "";
    const customerFirstName = ipnParams.FIRSTNAME || "";
    const customerLastName = ipnParams.LASTNAME || "";

    // Extract product info from IPN
    const products: { id: string; name: string; price: number }[] = [];
    let idx = 0;
    while (ipnParams[`IPN_PID[${idx}]`] !== undefined) {
      products.push({
        id: ipnParams[`IPN_PID[${idx}]`] || "",
        name: ipnParams[`IPN_PNAME[${idx}]`] || "",
        price: parseFloat(ipnParams[`IPN_PRICE[${idx}]`] || "0"),
      });
      idx++;
    }

    await connectToDatabase();

    // Find order by orderNumber (stored in REFNOEXT or we use REFNO)
    const order = await Order.findOne({
      $or: [
        { orderNumber: refNoExt },
        { orderNumber: orderRefNo },
      ],
    });

    if (!order) {
      console.warn("[2Checkout IPN] Order not found for ref:", refNoExt || orderRefNo);
      // Still respond success to 2Checkout to stop retries
      const ipnPid0 = ipnParams["IPN_PID[0]"] || "";
      const ipnPname0 = ipnParams["IPN_PNAME[0]"] || "";
      const ipnDate = ipnParams.IPN_DATE || "";
      return new NextResponse(generateIpnResponse(ipnPid0, ipnPname0, ipnDate), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Update order based on status
    switch (orderStatus) {
      case "COMPLETE":
      case "PENDING":
        order.status = "confirmed";
        order.paymentStatus = "paid";
        order.paymentReference = orderRefNo;
        order.billingAddress = {
          ...order.billingAddress,
          name: `${customerFirstName} ${customerLastName}`.trim(),
          email: customerEmail,
        };
        break;
      case "REFUND":
        order.status = "refunded";
        order.paymentStatus = "refunded";
        order.paymentReference = orderRefNo;
        break;
      case "REVERSED":
        order.status = "cancelled";
        order.paymentStatus = "failed";
        order.paymentReference = orderRefNo;
        break;
      default:
        // Other statuses — keep as is but update reference
        order.paymentReference = orderRefNo;
        break;
    }

    await order.save();

    // If this is a project milestone payment, update the project
    if (order.notes?.includes("Project milestone payment") && order.status === "confirmed") {
      // Extract project ID from first item
      const firstItem = order.items[0];
      if (firstItem?.product) {
        const project = await Project.findById(firstItem.product);
        if (project && project.milestones?.length) {
          // Find and update the milestone
          const milestoneIdx = project.milestones.findIndex(
            (m: { name: string }) => m.name === firstItem.name.replace("Milestone: ", "")
          );
          if (milestoneIdx >= 0) {
            project.milestones[milestoneIdx].status = "completed";
            await project.save();
          }

          // Update project payment status
          const completedMilestones = project.milestones.filter(
            (m: { status: string }) => m.status === "completed"
          ).length;
          project.paymentStatus = completedMilestones === project.milestones.length ? "paid" : "partial";
          if (project.status === "pending-payment") {
            project.status = "in-progress";
          }

          // Create invoice
          await Invoice.create({
            invoiceNumber: `INV-${order.orderNumber}`,
            client: { name: customerFirstName + " " + customerLastName, email: customerEmail },
            project: project._id,
            items: [{
              description: firstItem.name,
              quantity: 1,
              unitPrice: firstItem.price,
              total: firstItem.price,
            }],
            subtotal: firstItem.price,
            total: firstItem.price,
            currency,
            status: "paid",
            paidAt: new Date(),
            paymentMethod: "2checkout",
            paymentReference: orderRefNo,
          });
        }
      }
    }

    // Generate IPN read receipt response
    const ipnPid0 = ipnParams["IPN_PID[0]"] || "";
    const ipnPname0 = ipnParams["IPN_PNAME[0]"] || "";
    const ipnDate = ipnParams.IPN_DATE || "";
    const responseXml = generateIpnResponse(ipnPid0, ipnPname0, ipnDate);

    console.log("[2Checkout IPN] Processed:", order.orderNumber, "->", order.status);

    return new NextResponse(responseXml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[2Checkout IPN] Error:", error);
    // Return error to trigger 2Checkout retry
    return new NextResponse(generateIpnErrorResponse(), {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

// 2Checkout may also send GET requests for verification
export async function GET() {
  return NextResponse.json({ status: "ok", message: "2Checkout IPN endpoint active" });
}
