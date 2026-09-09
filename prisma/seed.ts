import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function chunk<T>(arr: T[], size: number): Promise<T[][]> {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  console.log("Seeding RestroERP…");
  const rest = await prisma.restaurant.upsert({
    where: { slug: "spice-garden" },
    update: {},
    create: {
      name: "Spice Garden",
      slug: "spice-garden",
      address: "MG Road, Pune MH 411001",
      phone: "+91 98765 43210",
      email: "hello@spicegarden.in",
      gstin: "27ABCDE1234F1Z5",
    },
  });
  await prisma.restaurantSettings.upsert({
    where: { restaurantId: rest.id },
    update: {},
    create: { restaurantId: rest.id, currency: "INR", taxPercent: 5 },
  });

  const categories = [
    { name: "Starters", slug: "starters" },
    { name: "Main Course", slug: "main-course" },
    { name: "Biryani & Rice", slug: "biryani-rice" },
    { name: "Breads", slug: "breads" },
    { name: "Desserts", slug: "desserts" },
    { name: "Beverages", slug: "beverages" },
    { name: "South Indian", slug: "south-indian" },
    { name: "Chinese", slug: "chinese" },
  ];
  for (let i = 0; i < categories.length; i++) {
    await prisma.category.upsert({
      where: { restaurantId_slug: { restaurantId: rest.id, slug: categories[i].slug } },
      update: {},
      create: { restaurantId: rest.id, name: categories[i].name, slug: categories[i].slug, sortOrder: i },
    });
  }
  const cats = await prisma.category.findMany({ where: { restaurantId: rest.id } });
  const menuNames = [
    "Paneer Tikka","Chicken Tikka","Veg Manchurian","Gobi 65","Chicken 65","Hara Bhara Kabab","Fish Amritsari","Mushroom Chilli",
    "Dal Tadka","Dal Makhani","Paneer Butter Masala","Chicken Butter Masala","Kadai Paneer","Veg Kolhapuri","Chicken Handi","Mutton Rogan Josh",
    "Veg Biryani","Chicken Biryani","Mutton Biryani","Egg Biryani","Jeera Rice","Steamed Rice","Fried Rice","Pulao",
    "Tandoori Roti","Butter Naan","Garlic Naan","Cheese Naan","Laccha Paratha","Kulcha",
    "Gulab Jamun","Rasgulla","Kulfi","Ice Cream","Brownie","Gajar Halwa","Phirni","Rasmalai",
    "Masala Chai","Cold Coffee","Lassi","Mojito","Fresh Lime","Mango Shake","Filter Coffee","Tea",
    "Masala Dosa","Idli Sambar","Vada Sambar","Uttapam","Pongal","Upma","Poha","Medu Vada",
    "Hakka Noodles","Manchurian Gravy","Chilli Paneer","Schezwan Fried Rice","Spring Roll","Honey Chilli Potato","Veg Noodles","Chicken Noodles",
    "Veg Thali","Non-Veg Thali","Paneer Lababdar","Chicken Changezi","Egg Curry","Fish Curry","Prawns Masala","Veg Pulao",
  ];
  // Helpers: serving unit (PCS for roti/naan etc, PLATE for sabzi) & curated images (Petpooja/Zomato style)
  function getServingUnit(name: string, slug: string): "PCS" | "PLATE" | "BOWL" | "GLASS" | "THALI" | "HALF" | "FULL" | "BOTTLE" {
    const n = name.toLowerCase();
    if (slug === "breads") return "PCS";
    if (slug === "beverages") {
      if (n.includes("bottle") || n.includes("water")) return "BOTTLE";
      return "GLASS";
    }
    if (slug === "desserts") return "BOWL";
    if (n.includes("thali")) return "THALI";
    if (["roti","naan","paratha","kulcha","dosa","idli","vada","samosa","kachori","bhature","pav","thali"].some(k => n.includes(k))) return "PCS";
    if (n.includes("chai") || n.includes("coffee") || n.includes("lassi") || n.includes("mojito") || n.includes("shake") || n.includes("lime") || n.includes("tea") ) return "GLASS";
    if (n.includes("gulab") || n.includes("rasgulla") || n.includes("kulfi") || n.includes("ice cream") || n.includes("brownie") || n.includes("halwa") || n.includes("phirni") || n.includes("rasmalai")) return "BOWL";
    return "PLATE";
  }
  const curatedImages: Record<string, string> = {
    "Paneer Tikka":"https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80&auto=format&fit=crop",
    "Chicken Tikka":"https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80&auto=format&fit=crop",
    "Veg Manchurian":"https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80&auto=format&fit=crop",
    "Gobi 65":"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format&fit=crop",
    "Chicken 65":"https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80&auto=format&fit=crop",
    "Dal Tadka":"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80&auto=format&fit=crop",
    "Dal Makhani":"https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80&auto=format&fit=crop",
    "Paneer Butter Masala":"https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600&q=80&auto=format&fit=crop",
    "Chicken Butter Masala":"https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80&auto=format&fit=crop",
    "Veg Biryani":"https://images.unsplash.com/photo-1631515242808-497c3fbd3972?w=600&q=80&auto=format&fit=crop",
    "Chicken Biryani":"https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&q=80&auto=format&fit=crop",
    "Mutton Biryani":"https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80&auto=format&fit=crop",
    "Tandoori Roti":"https://images.unsplash.com/photo-1626132647528-4d28822f74ef?w=600&q=80&auto=format&fit=crop",
    "Butter Naan":"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80&auto=format&fit=crop",
    "Garlic Naan":"https://images.unsplash.com/photo-1610192299482-665286e2120a?w=600&q=80&auto=format&fit=crop",
    "Gulab Jamun":"https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80&auto=format&fit=crop",
    "Masala Chai":"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&auto=format&fit=crop",
    "Cold Coffee":"https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80&auto=format&fit=crop",
    "Masala Dosa":"https://images.unsplash.com/photo-1610192299482-665286e2120a?w=600&q=80&auto=format&fit=crop",
    "Hakka Noodles":"https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80&auto=format&fit=crop",
    "Veg Thali":"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80&auto=format&fit=crop",
  };
  const fallbackBySlug: Record<string,string> = {
    "starters":"https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80&auto=format&fit=crop",
    "main-course":"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80&auto=format&fit=crop",
    "biryani-rice":"https://images.unsplash.com/photo-1631515242808-497c3fbd3972?w=600&q=80&auto=format&fit=crop",
    "breads":"https://images.unsplash.com/photo-1626132647528-4d28822f74ef?w=600&q=80&auto=format&fit=crop",
    "desserts":"https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80&auto=format&fit=crop",
    "beverages":"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&auto=format&fit=crop",
    "south-indian":"https://images.unsplash.com/photo-1610192299482-665286e2120a?w=600&q=80&auto=format&fit=crop",
    "chinese":"https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80&auto=format&fit=crop",
  };
  // proper category mapping — reference: Petpooja correct grouping (Roti= Breads PCS, Sabzi=Main-course Plate)
  function slugForName(name: string): string {
    const n = name.toLowerCase();
    if (["roti","naan","paratha","kulcha"].some(k=>n.includes(k))) return "breads";
    if (["gulab","rasgulla","kulfi","ice cream","brownie","halwa","phirni","rasmalai"].some(k=>n.includes(k))) return "desserts";
    if (["chai","coffee","lassi","mojito","lime","shake","tea"].some(k=>n.includes(k))) return "beverages";
    if (["biryani","jeera rice","steamed rice","fried rice","pulao"].some(k=>n.includes(k))) return "biryani-rice";
    if (["dosa","idli","vada","uttapam","pongal","upma","poha","medu"].some(k=>n.includes(k))) return "south-indian";
    if (["noodles","manchurian","chilli paneer","schezwan","spring roll","honey chilli"].some(k=>n.includes(k))) return "chinese";
    if (["thali"].some(k=>n.includes(k))) return "main-course";
    if (["paneer tikka","chicken tikka","manchurian","gobi 65","chicken 65","hara bhara","fish amritsari","mushroom chilli","samosa","kachori"].some(k=>n.includes(k))) return "starters";
    return "main-course";
  }
  const slugToCat = Object.fromEntries(cats.map(c=>[c.slug,c]));
  // menu items - createMany bulk (with imageUrl + servingUnit, correctly grouped)
  const menuItemsData = Array.from({ length: 80 }, (_, i) => {
    const baseName = menuNames[i % menuNames.length];
    const fullName = baseName + (i >= menuNames.length ? ` ${Math.floor(i / menuNames.length) + 1}` : "");
    const trueSlug = slugForName(baseName);
    const cat = slugToCat[trueSlug] || cats[i % cats.length];
    return {
      restaurantId: rest.id,
      categoryId: cat.id,
      name: fullName,
      description: `Delicious ${baseName} with authentic spices — ${cat.name} special`,
      price: 120 + (i * 13) % 350,
      isVeg: i % 3 !== 0,
      isAvailable: true,
      imageUrl: curatedImages[baseName] || fallbackBySlug[trueSlug] || null,
      servingUnit: getServingUnit(baseName, trueSlug) as unknown as import("@prisma/client").ServingUnit,
    };
  });
  await prisma.menuItem.createMany({ data: menuItemsData });

  // staff
  const staffData = [
    ["Aarav Sharma", "owner@spicegarden.in", "OWNER"],
    ["Priya Patel", "priya@spicegarden.in", "MANAGER"],
    ["Rohan Mehta", "rohan@spicegarden.in", "CASHIER"],
    ["Sneha Gupta", "sneha@spicegarden.in", "WAITER"],
    ["Vikram Singh", "vikram@spicegarden.in", "KITCHEN_MANAGER"],
    ["Ananya Rao", "ananya@spicegarden.in", "CHEF"],
  ];
  const pass = await bcrypt.hash("password123", 10);
  for (const [name, email, role] of staffData) {
    await prisma.staff.upsert({
      where: { email: email as string },
      update: {},
      create: { restaurantId: rest.id, name: name as string, email: email as string, passwordHash: pass, role: role as import("@prisma/client").Role },
    });
  }
  for (let i = 6; i < 20; i++) {
    const email = `staff${i + 1}@spicegarden.in`;
    await prisma.staff.upsert({
      where: { email },
      update: {},
      create: { restaurantId: rest.id, name: `Staff ${i + 1}`, email, passwordHash: pass, role: "WAITER" as import("@prisma/client").Role },
    });
  }

  // tables - bulk
  const tablesData = Array.from({ length: 30 }, (_, idx) => {
    const i = idx + 1;
    return {
      restaurantId: rest.id,
      number: `T-${String(i).padStart(2, "0")}`,
      capacity: [2, 4, 4, 6][i % 4],
      floor: i <= 15 ? "Ground" : i <= 25 ? "First" : "Rooftop",
      status: (["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING"] as const)[i % 4] as import("@prisma/client").TableStatus,
      qrToken: `qr_table_${i}_${Date.now()}_${i}`,
    };
  });
  await prisma.table.createMany({ data: tablesData });

  // customers 500 - bulk createMany in batches of 100
  console.log("Creating customers...");
  const customerData = Array.from({ length: 500 }, (_, i) => {
    const birthday = i % 7 === 0 ? new Date(1990 + (i % 30), new Date().getMonth(), new Date().getDate()) : i % 10 === 0 ? new Date(1990 + (i % 30), (i % 12), (i % 28) + 1) : null;
    const hasConsent = i % 2 === 0;
    return {
      restaurantId: rest.id,
      name: `Customer ${i + 1}`,
      phone: `9${String(800000000 + i * 1729).slice(0, 9)}`,
      email: i % 3 === 0 ? `customer${i + 1}@example.com` : null,
      birthday,
      totalVisits: 1 + (i % 12),
      totalSpend: 500 + (i * 47) % 15000,
      loyaltyPoints: (i * 13) % 500,
      marketingConsent: hasConsent,
      whatsappOptIn: hasConsent,
      smsOptIn: i % 3 === 0,
      emailOptIn: i % 3 === 0,
      consentTimestamp: hasConsent ? new Date() : null,
      consentSource: hasConsent ? (i % 2 === 0 ? "qr_scan" : "pos") : null,
    };
  });
  for (const batch of await chunk(customerData, 100)) {
    await prisma.customer.createMany({ data: batch });
  }
  const customers = await prisma.customer.findMany({ where: { restaurantId: rest.id }, orderBy: { phone: "asc" } });
  // need 500 in creation order - sort by phone correlates with i but not perfect. Instead fetch by name order
  const customersByName = await prisma.customer.findMany({ where: { restaurantId: rest.id } });
  // create map by phone to keep order deterministic: sort by createdAt
  const customersOrdered = await prisma.customer.findMany({ where: { restaurantId: rest.id }, orderBy: { createdAt: "asc" } });
  // customersOrdered should be 500 in insertion order

  const menuItems = await prisma.menuItem.findMany({ where: { restaurantId: rest.id }, orderBy: { createdAt: "asc" } });
  const tables = await prisma.table.findMany({ where: { restaurantId: rest.id }, orderBy: { number: "asc" } });

  console.log("Creating orders/bills (1000) in parallel batches...");
  // Create orders/bills in parallel batches of 20 to speed up pooled DB
  const BATCH_SIZE = 25;
  for (let batchStart = 0; batchStart < 1000; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, 1000);
    await Promise.all(
      Array.from({ length: batchEnd - batchStart }, (_, idx) => {
        const i = batchStart + idx;
        return (async () => {
          const cust = customersOrdered[i % 500];
          const table = tables[i % 30];
          const order = await prisma.order.create({
            data: {
              restaurantId: rest.id,
              orderNumber: `ORD-2026-${String(i + 1).padStart(5, "0")}`,
              tableId: table.id,
              customerId: cust.id,
              type: "DINE_IN",
              status: "COMPLETED",
              subtotal: 300,
              taxAmount: 15,
              totalAmount: 315,
            },
          });
          await prisma.orderItem.create({
            data: {
              orderId: order.id,
              menuItemId: menuItems[i % menuItems.length].id,
              quantity: 1 + (i % 3),
              unitPrice: menuItems[i % menuItems.length].price,
              totalPrice: menuItems[i % menuItems.length].price * (1 + (i % 3)),
            },
          });
          const paid = i % 10 !== 9;
          const bill = await prisma.bill.create({
            data: {
              restaurantId: rest.id,
              billNumber: `BILL-2026-${String(i + 1).padStart(5, "0")}`,
              orderId: order.id,
              customerId: cust.id,
              status: paid ? "PAID" : "UNPAID",
              paymentStatus: paid ? "PAID" : "PENDING",
              subtotal: 300,
              taxAmount: 15,
              totalAmount: 315,
              paidAt: paid ? new Date() : null,
              qrToken: `qr_bill_${i + 1}_${Math.random().toString(36).slice(2, 8)}`,
            },
          });
          if (paid) {
            await prisma.payment.create({
              data: { billId: bill.id, orderId: order.id, method: "CASH", amount: 315, status: "PAID" },
            });
          }
          if (i % 2 === 0 && paid) {
            await prisma.review.create({
              data: {
                billId: bill.id,
                customerId: cust.id,
                rating: (i % 5) + 1,
                comment: ["Average", "Good", "Great", "Excellent", "Outstanding"][i % 5],
                name: cust.id,
                phone: "9999999999",
              },
            });
          }
        })();
      })
    );
    if (batchStart % 100 === 0) console.log(`  orders ${batchStart}-${batchEnd} done`);
  }

  // campaigns
  await prisma.campaign.upsert({
    where: { slug: "4-star" },
    update: {},
    create: { restaurantId: rest.id, name: "4-Star Reward", slug: "4-star", minRating: 4, rewardType: "PERCENTAGE", rewardValue: 40, couponPrefix: "SPICE40", couponExpiryDays: 30 },
  });
  await prisma.campaign.upsert({
    where: { slug: "5-star" },
    update: {},
    create: { restaurantId: rest.id, name: "5-Star Reward", slug: "5-star", minRating: 5, rewardType: "PERCENTAGE", rewardValue: 50, couponPrefix: "SPICE50", couponExpiryDays: 30 },
  });

  // Inventory suppliers
  const suppliersData = [
    { name: "Fresh Farms Pvt Ltd", contactName: "Ramesh Patel", phone: "9876500001", email: "fresh@farms.in", address: "Pune APMC", gstin: "27AAAAA0000A1Z5" },
    { name: "Beverage Distributors Co", contactName: "Anita Desai", phone: "9876500002", email: "bev@dist.in", address: "Mumbai" },
    { name: "Packaging World", contactName: "Suresh Kumar", phone: "9876500003", email: "pack@world.in", address: "Delhi" },
    { name: "Cleaning Solutions Ltd", contactName: "Priya Nair", phone: "9876500004", email: "clean@sol.in", address: "Pune" },
  ];
  for (const s of suppliersData) {
    await prisma.supplier.create({ data: { restaurantId: rest.id, ...s } });
  }
  const supList = await prisma.supplier.findMany({ where: { restaurantId: rest.id } });

  // 500 inventory items - bulk
  console.log("Creating inventory items...");
  const inventoryCategories: string[] = ["Ingredients", "Beverages", "Packaging", "Cleaning supplies", "Other stock"];
  const units = ["KG", "G", "LTR", "ML", "PCS"] as const;
  const names = ["Basmati Rice","Paneer","Chicken Breast","Tomato","Onion","Cooking Oil","Flour","Sugar","Milk","Butter","Coriander","Garam Masala","Disposable Box","Paper Napkin","Cleaning Spray","Dish Soap","Mineral Water","Cold Drink Can","Tea Leaves","Coffee Powder"];
  const inventoryData = Array.from({ length: 500 }, (_, i) => {
    const sku = `SKU-${String(i + 1).padStart(5, "0")}`;
    const cat = inventoryCategories[i % 5];
    const unit = units[i % 5] as import("@prisma/client").InventoryUnit;
    const supplierId = supList[i % supList.length]?.id || null;
    const expiry = i % 10 === 0 ? new Date(Date.now() + (14 + i % 60) * 86400000) : i % 7 === 0 ? new Date(Date.now() - 5 * 86400000) : null;
    return {
      restaurantId: rest.id,
      sku,
      name: names[i % 20] + ` ${i + 1}`,
      category: cat,
      unit,
      currentStock: 5 + (i * 7) % 120,
      reorderLevel: 10 + (i % 15),
      costPerUnit: 20 + (i * 3) % 500,
      supplierId,
      batchNumber: `BATCH-${String(1000 + i)}`,
      expiryDate: expiry,
    };
  });
  for (const batch of await chunk(inventoryData, 100)) {
    await prisma.inventoryItem.createMany({ data: batch });
  }
  const invItems = await prisma.inventoryItem.findMany({ where: { restaurantId: rest.id }, take: 500, orderBy: { sku: "asc" } });

  // stock transactions 200 - bulk
  console.log("Creating stock transactions...");
  const txTypes: import("@prisma/client").StockTxType[] = ["PURCHASE", "CONSUMPTION", "ADJUSTMENT", "WASTE", "RETURN", "TRANSFER"];
  const stockTxData = Array.from({ length: 200 }, (_, i) => {
    const item = invItems[i % invItems.length];
    const type = txTypes[i % 6];
    const qty = type === "CONSUMPTION" || type === "WASTE" ? -(1 + Math.floor(Math.random() * 10)) : 5 + Math.floor(Math.random() * 20);
    return {
      inventoryItemId: item.id,
      type,
      quantity: qty,
      unitCost: item.costPerUnit,
      reference: `Seed ${type} #${i + 1}`,
    };
  });
  for (const batch of await chunk(stockTxData, 50)) {
    await prisma.stockTransaction.createMany({ data: batch });
  }
  // update stocks in batches
  for (let i = 0; i < 200; i += 50) {
    await Promise.all(
      stockTxData.slice(i, i + 50).map(d =>
        prisma.inventoryItem.update({ where: { id: d.inventoryItemId }, data: { currentStock: { increment: d.quantity } } }).catch(() => null)
      )
    );
  }

  // purchase orders
  for (let i = 0; i < 10; i++) {
    const sup = supList[i % supList.length];
    const poNumber = `PO-2026-${String(9000 + i).padStart(4, "0")}`;
    const items = [invItems[i % 500], invItems[(i + 5) % 500]].map(it => ({ inventoryItemId: it.id, quantity: 10 + i % 20, unitCost: it.costPerUnit, totalCost: (10 + i % 20) * it.costPerUnit }));
    const totalAmount = items.reduce((a, b) => a + b.totalCost, 0);
    await prisma.purchaseOrder.create({
      data: {
        restaurantId: rest.id,
        supplierId: sup.id,
        poNumber,
        status: (["DRAFT", "ORDERED", "RECEIVED", "INVOICED"] as const)[i % 4] as import("@prisma/client").PurchaseOrderStatus,
        totalAmount,
        notes: `Seed PO ${i + 1}`,
        items: { create: items },
      },
    });
  }

  // Loyalty accounts - bulk
  console.log("Creating loyalty accounts...");
  const loyaltyData = customersOrdered.map(c => {
    const pts = (c as any).loyaltyPoints || 0;
    return {
      customerId: c.id,
      points: pts,
      tier: pts > 300 ? "GOLD" : pts > 100 ? "SILVER" : "BRONZE",
    };
  });
  for (const batch of await chunk(loyaltyData, 100)) {
    await prisma.loyaltyAccount.createMany({ data: batch });
  }
  // addresses for ~30% customers
  const addressData = customersOrdered.filter(() => Math.random() < 0.3).map(c => ({
    customerId: c.id,
    label: "HOME",
    line1: `${100 + Math.floor(Math.random() * 900)} MG Road`,
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    isDefault: true,
  }));
  if (addressData.length) {
    for (const batch of await chunk(addressData, 100)) {
      await prisma.address.createMany({ data: batch });
    }
  }

  // Permissions
  const perms = [
    { name: "menu:read", description: "View menu", roles: ["OWNER", "MANAGER", "CASHIER", "WAITER", "CHEF"] as never },
    { name: "menu:write", description: "Edit menu", roles: ["OWNER", "MANAGER"] as never },
    { name: "order:create", description: "Create orders", roles: ["OWNER", "MANAGER", "CASHIER", "WAITER"] as never },
    { name: "billing:write", description: "Billing/payments", roles: ["OWNER", "MANAGER", "CASHIER"] as never },
    { name: "kitchen:manage", description: "KOT/kitchen", roles: ["OWNER", "MANAGER", "CHEF", "KITCHEN_MANAGER", "KITCHEN_STAFF"] as never },
    { name: "inventory:manage", description: "Inventory", roles: ["OWNER", "MANAGER"] as never },
  ];
  for (const p of perms) {
    await prisma.permission.upsert({ where: { name: p.name }, update: {}, create: { name: p.name, description: p.description, roles: p.roles } }).catch(() => null);
  }

  // WhatsApp templates & campaigns
  const waTemplates = [
    { name: "welcome", content: "Hi {{name}}! Welcome to {{restaurant}} 🎉", variables: ["name", "restaurant"] },
    { name: "bill_receipt", content: "Hi {{name}}, your bill {{billNumber}} for ₹{{total}} is paid. Receipt: {{link}}", variables: ["name", "billNumber", "total", "link"] },
    { name: "coupon_issued", content: "Hi {{name}}! Coupon {{coupon}} — {{value}} off till {{expiry}} at {{restaurant}}!", variables: ["name", "coupon", "value", "expiry", "restaurant"] },
    { name: "birthday_offer", content: "Happy Birthday {{name}} 🎂! Enjoy {{value}} off with {{coupon}} till {{expiry}} at {{restaurant}}!", variables: ["name", "value", "coupon", "expiry", "restaurant"] },
    { name: "feedback_request", content: "Hi {{name}}, enjoyed {{restaurant}}? Rate us {{link}} and get {{value}} off!", variables: ["name", "restaurant", "link", "value"] },
    { name: "order_confirmation", content: "Hi {{name}}, order {{orderNumber}} confirmed! Total ₹{{total}}. Track: {{link}}", variables: ["name", "orderNumber", "total", "link"] },
    { name: "delivery_update", content: "Hi {{name}}, your order {{orderNumber}} is {{status}}! ETA {{eta}}. OTP {{otp}}", variables: ["name", "orderNumber", "status", "eta", "otp"] },
  ];
  for (const t of waTemplates) {
    await prisma.whatsAppTemplate.upsert({ where: { name: t.name }, update: {}, create: { name: t.name, content: t.content, variables: t.variables } });
  }
  const tmplBirthday = await prisma.whatsAppTemplate.findUnique({ where: { name: "birthday_offer" } });
  const tmplWelcome = await prisma.whatsAppTemplate.findUnique({ where: { name: "welcome" } });
  const tmplFeedback = await prisma.whatsAppTemplate.findUnique({ where: { name: "feedback_request" } });
  if (tmplBirthday) {
    await prisma.whatsAppCampaign.upsert({
      where: { id: "seed_bday_camp" },
      update: {},
      create: { id: "seed_bday_camp", name: "Birthday Offer — ₹200 off", event: "BIRTHDAY_OFFER" as never, templateId: tmplBirthday.id, audience: { hasBirthday: true, consentRequired: true }, schedule: "RECURRING_DAILY" as never, couponRequired: true, couponValue: 200, couponPrefix: "BDAY", isActive: true },
    });
  }
  if (tmplWelcome) {
    await prisma.whatsAppCampaign.upsert({
      where: { id: "seed_welcome_camp" },
      update: {},
      create: { id: "seed_welcome_camp", name: "Welcome New Customer", event: "WELCOME" as never, templateId: tmplWelcome.id, audience: { minVisits: 1 }, schedule: "IMMEDIATE" as never, isActive: true },
    });
  }
  if (tmplFeedback) {
    await prisma.whatsAppCampaign.upsert({
      where: { id: "seed_feedback_camp" },
      update: {},
      create: { id: "seed_feedback_camp", name: "Feedback Request 24h", event: "FEEDBACK_REQUEST" as never, templateId: tmplFeedback.id, audience: { minSpend: 500 }, schedule: "SCHEDULED" as never, scheduledAt: new Date(Date.now() + 24 * 3600000), couponRequired: true, couponValue: 100, isActive: true },
    });
  }

  console.log("Seed complete");
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect());
