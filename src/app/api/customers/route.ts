export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { isDbAvailable, prisma, getEffectiveRestaurantId } from "@/lib/db";
import { demoCustomers, demoBills, demoReviews, demoLoyaltyTx, demoCoupons } from "@/data/demo";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q")||"").toLowerCase();
  const phone = (url.searchParams.get("phone")||"").trim();
  const page = Number(url.searchParams.get("page")||"1");
  const take = Math.min(Number(url.searchParams.get("take")||"20"), 100);
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    // exact phone lookup for POS billing flow
    if (phone) {
      const exact = demoCustomers.find(c=> c.phone===phone);
      if (exact) {
        const enriched = {
          ...exact,
          totalOrders: demoBills.filter(b=> b.customerId===exact.id && b.paymentStatus==="PAID").length,
          totalVisits: exact.totalVisits,
          lastVisitDate: exact.createdAt,
          _counts: {
            bills: demoBills.filter(b=> b.customerId===exact.id).length,
            reviews: demoReviews.filter(r=> r.phone===exact.phone).length,
            loyalty: demoLoyaltyTx.filter(l=> l.customerId===exact.id).length,
            coupons: demoCoupons.filter(cp=> cp.customerId===exact.id && cp.status==="ACTIVE").length,
          },
          availableCoupons: demoCoupons.filter(cp=> cp.customerId===exact.id && cp.status==="ACTIVE"),
          bills: demoBills.filter(b=> b.customerId===exact.id).slice(0,5),
        };
        return NextResponse.json({ found: true, customer: enriched });
      }
      return NextResponse.json({ found: false, customer: null });
    }
    let list = [...demoCustomers];
    if (q) list = list.filter(c=> c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email||"").toLowerCase().includes(q));
    const total = list.length;
    const paged = list.slice((page-1)*take, page*take).map(c=> ({
      ...c,
      _counts: {
        bills: demoBills.filter(b=> b.customerId===c.id).length,
        reviews: demoReviews.filter(r=> r.phone===c.phone).length,
        loyalty: demoLoyaltyTx.filter(l=> l.customerId===c.id).length,
        coupons: demoCoupons.filter(cp=> cp.customerId===c.id).length,
      }
    }));
    return NextResponse.json({ total, page, take, data: paged });
  }
  const session = await getSession();
  let restaurantId: string | undefined = session?.restaurantId || undefined;
  if (session?.restaurantId) restaurantId = (await getEffectiveRestaurantId(session.restaurantId)) || undefined;
  else restaurantId = (await getEffectiveRestaurantId(null)) || undefined;
  // exact phone lookup — POS billing primary path (§3)
  if (phone) {
    const cust = await prisma.customer.findFirst({ where:{ restaurantId, phone } , include:{ loyaltyAccount:true, coupons:{ where:{ status:"ACTIVE", expiryDate:{ gt: new Date() } } }, _count:{ select:{ bills:true, reviews:true, loyaltyTxs:true } } } });
    if (!cust) return NextResponse.json({ found: false, customer: null });
    // analytics: paid bills only for visits/spending (§19)
    const paidBills = await prisma.bill.findMany({ where:{ customerId: cust.id, paymentStatus:"PAID" }, orderBy:{ createdAt:"desc"}, take:5, select:{ billNumber:true, totalAmount:true, createdAt:true } });
    const agg = await prisma.bill.aggregate({ where:{ customerId: cust.id, paymentStatus:"PAID" }, _sum:{ totalAmount:true }, _count:{ _all:true } });
    const lastVisit = paidBills[0]?.createdAt || cust.updatedAt;
    return NextResponse.json({
      found: true,
      customer: {
        ...cust,
        totalOrders: agg._count._all,
        totalSpending: agg._sum.totalAmount||0,
        totalVisits: agg._count._all,
        lastVisitDate: lastVisit,
        availableCoupons: cust.coupons,
        recentBills: paidBills,
      }
    });
  }
  const where: Record<string, unknown> = { restaurantId };
  if (q) {
    (where as Record<string, unknown>).OR = [
      { name: { contains: q, mode:"insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode:"insensitive" } },
    ];
  }
  const [total, data] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, orderBy:{ totalSpend:"desc"}, skip:(page-1)*take, take, include:{ _count:{ select:{ bills:true, reviews:true, loyaltyTxs:true, coupons:true } } } }),
  ]);
  // fallback to demo-ish empty check — if stale restaurant gave 0 but DB has data, return all (POS parity)
  if (total===0 && (await prisma.customer.count())>0) {
    const fallbackWhere: Record<string, unknown> = {};
    if (q) (fallbackWhere as Record<string, unknown>).OR = (where as Record<string, unknown>).OR as unknown;
    const [fbTotal, fbData] = await Promise.all([
      prisma.customer.count({ where: fallbackWhere }),
      prisma.customer.findMany({ where: fallbackWhere, orderBy:{ totalSpend:"desc"}, skip:(page-1)*take, take, include:{ _count:{ select:{ bills:true, reviews:true, loyaltyTxs:true, coupons:true } } } }),
    ]);
    if (fbTotal) return NextResponse.json({ total: fbTotal, page, take, data: fbData });
  }
  return NextResponse.json({ total, page, take, data });
}

export async function POST(req: Request){
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const body = await req.json().catch(()=>null);
  const { name, phone, email, birthday, dateOfBirth, marketingConsent, whatsappOptIn, smsOptIn, emailOptIn } = body || {};
  const dob = birthday || dateOfBirth;
  if (!name || !phone) return NextResponse.json({ error:"name and phone required" }, { status:400 });
  if (!/^[6-9]\d{9}$/.test(phone)) return NextResponse.json({ error:"Invalid phone — must be 10 digits starting 6-9" }, { status:400 });
  if (name.trim().length < 2) return NextResponse.json({ error:"Name must be at least 2 characters" }, { status:400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error:"Invalid email" }, { status:400 });
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const created = { id:`cust_${Date.now()}`, name: name.trim(), phone, email: email||null, birthday: dob||null, dateOfBirth: dob||null, marketingConsent: !!marketingConsent, whatsappOptIn: !!whatsappOptIn, smsOptIn: !!smsOptIn, emailOptIn: !!emailOptIn, totalVisits:0, totalSpend:0, loyaltyPoints:0, createdAt: new Date().toISOString() };
    return NextResponse.json(created, { status:201 });
  }
  try{
    const restaurantId = await getEffectiveRestaurantId(session.restaurantId);
    if (!restaurantId) return NextResponse.json({ error:"Restaurant not found — please re-login" }, { status:400 });
    const created = await prisma.customer.create({ data:{ restaurantId, name: name.trim(), phone, email: email||undefined, birthday: dob? new Date(dob):undefined, marketingConsent: !!marketingConsent, whatsappOptIn: !!whatsappOptIn, smsOptIn: !!smsOptIn, emailOptIn: !!emailOptIn } });
    // also create loyalty account lazily
    await prisma.loyaltyAccount.create({ data:{ customerId: created.id, points:0 } }).catch(()=>null);
    return NextResponse.json(created, { status:201 });
  } catch (e: unknown){
    const msg = e instanceof Error? e.message : "Error";
    if (msg.includes("Unique constraint")) return NextResponse.json({ error:"Phone already exists for this restaurant" }, { status:409 });
    return NextResponse.json({ error: msg }, { status:500 });
  }
}

