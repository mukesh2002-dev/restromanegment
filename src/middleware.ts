import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-to-32-char-random-secret-dev-only";
const secretKey = new TextEncoder().encode(JWT_SECRET);

const publicPaths = ["/login", "/qr", "/order", "/track", "/api/auth/login", "/api/qr"];

const roleMap: Record<string, string[]> = {
  "/dashboard": ["OWNER","MANAGER","CASHIER","WAITER","KITCHEN_STAFF","KITCHEN_MANAGER","CHEF","DELIVERY_MANAGER"],
  "/pos": ["OWNER","MANAGER","CASHIER","WAITER"],
  "/menu": ["OWNER","MANAGER"],
  "/tables": ["OWNER","MANAGER","WAITER"],
  "/kot": ["OWNER","MANAGER","CHEF","KITCHEN_STAFF","KITCHEN_MANAGER"],
  "/customers": ["OWNER","MANAGER","CASHIER"],
  "/inventory": ["OWNER","MANAGER"],
  "/delivery": ["OWNER","MANAGER","DELIVERY_MANAGER"],
  "/reports": ["OWNER","MANAGER"],
  "/rewards": ["OWNER","MANAGER","CASHIER"],
  "/whatsapp": ["OWNER","MANAGER"],
  "/settings": ["OWNER"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let isPublic = publicPaths.some(p=> pathname.startsWith(p)) || pathname === "/";
  if (!isPublic) {
    // Public GET for online ordering menu
    if ((pathname.startsWith("/api/menu-items") || pathname.startsWith("/api/categories")) && req.method==="GET") isPublic=true;
    // Public checkout & tracking
    if (pathname==="/api/delivery-orders" && req.method==="POST") isPublic=true;
    if (pathname.startsWith("/api/delivery-orders/") && req.method==="GET") isPublic=true;
    if (pathname==="/api/coupons/redeem" && req.method==="POST") isPublic=true;
    if (pathname==="/api/rewards/claim" && req.method==="POST") isPublic=true;
    if (pathname.startsWith("/api/bills/verify")) isPublic=true;
    if (pathname.startsWith("/api/qr")) isPublic=true;
    if (pathname==="/api/reports" && req.method==="GET") isPublic=false; // reports always protected
  }
  if (isPublic) return NextResponse.next();
  const token = req.cookies.get("restroerp_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  try {
    const { payload } = await jose.jwtVerify(token, secretKey);
    const role = (payload as unknown as {role:string}).role;
    // RBAC check
    for(const [prefix, allowed] of Object.entries(roleMap)){
      if(pathname.startsWith(prefix) && !allowed.includes(role)){
        // API -> 403, page -> redirect with 403
        if(pathname.startsWith("/api/")){
          return NextResponse.json({ error:"Forbidden", required: allowed }, { status:403 });
        }
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("restroerp_session");
    return res;
  }
}
export const config = {
  matcher: ["/dashboard/:path*", "/pos/:path*", "/menu/:path*", "/tables/:path*", "/kot/:path*", "/customers/:path*", "/inventory/:path*", "/delivery/:path*", "/reports/:path*", "/settings/:path*", "/rewards/:path*", "/whatsapp/:path*", "/api/:path*"]
};
