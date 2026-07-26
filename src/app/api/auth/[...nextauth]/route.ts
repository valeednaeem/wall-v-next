import { handlers } from "@/lib/auth";

const origGet = handlers.GET;

handlers.GET = async function wrappedGET(req: Request, ctx: unknown) {
  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    console.log("[Auth Callback] GET called:", req.url);
    console.log("[Auth Callback] Provider:", url.searchParams.get("provider"));
    console.log("[Auth Callback] Code:", url.searchParams.get("code")?.substring(0, 10));
    console.log("[Auth Callback] State:", url.searchParams.get("state")?.substring(0, 10));
    console.log("[Auth Callback] Error:", url.searchParams.get("error"));

    const response = await origGet(req, ctx);

    console.log("[Auth Callback] Response status:", response.status);
    console.log("[Auth Callback] Response redirect:", response.headers.get("Location"));

    const setCookies = response.headers.get("set-cookie");
    if (setCookies) {
      const cookieNames = setCookies.split(",").map(c => c.trim().split("=")[0]);
      console.log("[Auth Callback] Set-Cookie headers:", cookieNames);
    } else {
      console.log("[Auth Callback] NO Set-Cookie headers!");
    }

    return response;
  } catch (err) {
    console.error("[Auth Callback] ERROR:", err);
    throw err;
  }
};

export const { GET, POST } = handlers;
