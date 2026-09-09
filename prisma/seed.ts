import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
  for (let i=0;i<categories.length;i++) {
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
  for (let i=0;i<80;i++) {
    const cat = cats[i%cats.length];
    await prisma.menuItem.create({
      data: {
        restaurantId: rest.id,
        categoryId: cat.id,
        name: menuNames[i],
        description: `Delicious ${menuNames[i]} with authentic spices`,
        price: 120 + (i*13)%350,
        isVeg: i%3!==0,
        isAvailable: true,
      },
    });
  }

  // staff
  const staffData = [
    ["Aarav Sharma","owner@spicegarden.in","OWNER"],
    ["Priya Patel","priya@spicegarden.in","MANAGER"],
    ["Rohan Mehta","rohan@spicegarden.in","CASHIER"],
    ["Sneha Gupta","sneha@spicegarden.in","WAITER"],
    ["Vikram Singh","vikram@spicegarden.in","KITCHEN_MANAGER"],
    ["Ananya Rao","ananya@spicegarden.in","CHEF"],
  ];
  const pass = await bcrypt.hash("password123",10);
  for (const [name,email,role] of staffData) {
    await prisma.staff.upsert({
      where: { email: email as string },
      update: {},
      create: { restaurantId: rest.id, name: name as string, email: email as string, passwordHash: pass, role: role as import("@prisma/client").Role },
    });
  }
  // add 14 more
  for(let i=6;i<20;i++) {
    const email = `staff${i+1}@spicegarden.in`;
    await prisma.staff.upsert({
      where: { email },
      update: {},
      create: { restaurantId: rest.id, name: `Staff ${i+1}`, email, passwordHash: pass, role: "WAITER" as import("@prisma/client").Role },
    });
  }

  // tables
  for(let i=1;i<=30;i++) {
    await prisma.table.create({
      data: {
        restaurantId: rest.id,
        number: `T-${String(i).padStart(2,"0")}`,
        capacity: [2,4,4,6][i%4],
        floor: i<=15?"Ground":i<=25?"First":"Rooftop",
        status: (["AVAILABLE","OCCUPIED","RESERVED","CLEANING"] as const)[i%4] as import("@prisma/client").TableStatus,
        qrToken: `qr_table_${i}_${Date.now()}_${i}`,
      },
    });
  }

  // customers 500, bills 1000 etc simplified
  const customers: { id:string }[] = [];
  for(let i=0;i<500;i++) {
    const birthday = i%7===0 ? new Date(1990 + (i%30), new Date().getMonth(), new Date().getDate()) : i%10===0 ? new Date(1990 + (i%30), (i%12), (i%28)+1) : null; // some birthdays today for demo
    const hasConsent = i%2===0;
    const c = await prisma.customer.create({
      data: {
        restaurantId: rest.id,
        name: `Customer ${i+1}`,
        phone: `9${String(800000000+i*1729).slice(0,9)}`,
        email: i%3===0?`customer${i+1}@example.com`:undefined,
        birthday,
        totalVisits: 1+(i%12),
        totalSpend: 500+(i*47)%15000,
        loyaltyPoints: (i*13)%500,
        marketingConsent: hasConsent,
        whatsappOptIn: hasConsent,
        smsOptIn: i%3===0,
        emailOptIn: i%3===0,
        consentTimestamp: hasConsent? new Date(): null,
        consentSource: hasConsent? (i%2===0? "qr_scan":"pos") : null,
      },
    });
    customers.push(c);
  }
  const menuItems = await prisma.menuItem.findMany({ where:{ restaurantId: rest.id } });
  const tables = await prisma.table.findMany({ where:{ restaurantId: rest.id } });

  for(let i=0;i<1000;i++) {
    const cust = customers[i%500];
    const table = tables[i%30];
    const order = await prisma.order.create({
      data: {
        restaurantId: rest.id,
        orderNumber: `ORD-2026-${String(i+1).padStart(5,"0")}`,
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
        menuItemId: menuItems[i%menuItems.length].id,
        quantity: 1+(i%3),
        unitPrice: menuItems[i%menuItems.length].price,
        totalPrice: menuItems[i%menuItems.length].price*(1+(i%3)),
      },
    });
    const paid = i%10!==9;
    const bill = await prisma.bill.create({
      data: {
        restaurantId: rest.id,
        billNumber: `BILL-2026-${String(i+1).padStart(5,"0")}`,
        orderId: order.id,
        customerId: cust.id,
        status: paid?"PAID":"UNPAID",
        paymentStatus: paid?"PAID":"PENDING",
        subtotal: 300,
        taxAmount: 15,
        totalAmount: 315,
        paidAt: paid? new Date(): null,
        qrToken: `qr_bill_${i+1}_${Math.random().toString(36).slice(2,8)}`,
      },
    });
    if (paid) {
      await prisma.payment.create({
        data: { billId: bill.id, orderId: order.id, method:"CASH", amount:315, status:"PAID" },
      });
    }
    if (i%2===0 && paid) {
      await prisma.review.create({
        data: {
          billId: bill.id,
          customerId: cust.id,
          rating: (i%5)+1,
          comment: ["Average","Good","Great","Excellent","Outstanding"][i%5],
          name: cust.id,
          phone: "9999999999",
        },
      });
    }
  }

  // campaigns
  await prisma.campaign.upsert({
    where:{ slug:"4-star" },
    update:{},
    create:{ restaurantId: rest.id, name:"4-Star Reward", slug:"4-star", minRating:4, rewardType:"PERCENTAGE", rewardValue:40, couponPrefix:"SPICE40", couponExpiryDays:30 },
  });
  await prisma.campaign.upsert({
    where:{ slug:"5-star" },
    update:{},
    create:{ restaurantId: rest.id, name:"5-Star Reward", slug:"5-star", minRating:5, rewardType:"PERCENTAGE", rewardValue:50, couponPrefix:"SPICE50", couponExpiryDays:30 },
  });

  // Inventory suppliers
  const suppliersData = [
    { name:"Fresh Farms Pvt Ltd", contactName:"Ramesh Patel", phone:"9876500001", email:"fresh@farms.in", address:"Pune APMC", gstin:"27AAAAA0000A1Z5" },
    { name:"Beverage Distributors Co", contactName:"Anita Desai", phone:"9876500002", email:"bev@dist.in", address:"Mumbai" },
    { name:"Packaging World", contactName:"Suresh Kumar", phone:"9876500003", email:"pack@world.in", address:"Delhi" },
    { name:"Cleaning Solutions Ltd", contactName:"Priya Nair", phone:"9876500004", email:"clean@sol.in", address:"Pune" },
  ];
  const suppliers: { id:string }[] = [];
  for(const s of suppliersData){
    const sup = await prisma.supplier.upsert({
      where:{ id: `sup_seed_${s.name.slice(0,3)}` },
      update:{},
      create:{ id:`sup_seed_${s.name.slice(0,3)}_${Date.now()}_${Math.random().toString(36).slice(2,4)}`, restaurantId: rest.id, ...s },
    }).catch(async ()=> {
      // fallback without explicit id
      return prisma.supplier.create({ data:{ restaurantId: rest.id, ...s } });
    });
    suppliers.push(sup);
  }
  const supList = await prisma.supplier.findMany({ where:{ restaurantId: rest.id } });

  // 500 inventory items
  const inventoryCategories: string[] = ["Ingredients","Beverages","Packaging","Cleaning supplies","Other stock"];
  const units = ["KG","G","LTR","ML","PCS"] as const;
  const names = ["Basmati Rice","Paneer","Chicken Breast","Tomato","Onion","Cooking Oil","Flour","Sugar","Milk","Butter","Coriander","Garam Masala","Disposable Box","Paper Napkin","Cleaning Spray","Dish Soap","Mineral Water","Cold Drink Can","Tea Leaves","Coffee Powder"];
  for(let i=0;i<500;i++){
    const sku = `SKU-${String(i+1).padStart(5,"0")}`;
    const cat = inventoryCategories[i%5];
    const unit = units[i%5] as import("@prisma/client").InventoryUnit;
    const supplierId = supList[i%(supList.length)]?.id || null;
    const expiry = i%10===0 ? new Date(Date.now()+ (14+ i%60)*86400000) : i%7===0 ? new Date(Date.now()-5*86400000) : null; // some near expiry, some expired
    await prisma.inventoryItem.upsert({
      where:{ sku },
      update:{},
      create:{
        restaurantId: rest.id,
        sku,
        name: names[i%20] + ` ${i+1}`,
        category: cat,
        unit,
        currentStock: 5 + (i*7)%120,
        reorderLevel: 10 + (i%15),
        costPerUnit: 20 + (i*3)%500,
        supplierId,
        batchNumber: `BATCH-${String(1000+i)}`,
        expiryDate: expiry,
      },
    });
  }
  const invItems = await prisma.inventoryItem.findMany({ where:{ restaurantId: rest.id }, take:500 });
  // realistic stock transactions 200
  const txTypes: import("@prisma/client").StockTxType[] = ["PURCHASE","CONSUMPTION","ADJUSTMENT","WASTE","RETURN","TRANSFER"];
  for(let i=0;i<200;i++){
    const item = invItems[i % invItems.length];
    const type = txTypes[i%6];
    const qty = type==="CONSUMPTION"||type==="WASTE" ? -(1+ Math.floor(Math.random()*10)) : (5+ Math.floor(Math.random()*20));
    await prisma.stockTransaction.create({
      data:{
        inventoryItemId: item.id,
        type,
        quantity: qty,
        unitCost: item.costPerUnit,
        reference: `Seed ${type} #${i+1}`,
      }
    });
    // also update stock to reflect
    await prisma.inventoryItem.update({ where:{ id: item.id }, data:{ currentStock: { increment: qty } } }).catch(()=>null);
  }
  // purchase orders
  for(let i=0;i<10;i++){
    const sup = supList[i% supList.length];
    const poNumber = `PO-2026-${String(9000+i).padStart(4,"0")}`;
    const items = [invItems[i%500], invItems[(i+5)%500]].map(it=> ({ inventoryItemId: it.id, quantity: 10+ i%20, unitCost: it.costPerUnit, totalCost: (10+ i%20)*it.costPerUnit }));
    const totalAmount = items.reduce((a,b)=>a+b.totalCost,0);
    await prisma.purchaseOrder.create({
      data:{
        restaurantId: rest.id,
        supplierId: sup.id,
        poNumber,
        status: (["DRAFT","ORDERED","RECEIVED","INVOICED"] as const)[i%4] as import("@prisma/client").PurchaseOrderStatus,
        totalAmount,
        notes: `Seed PO ${i+1}`,
        items:{ create: items },
      }
    });
  }

  // Loyalty accounts (unique per customer)
  for(const c of customers){
    const custData = await prisma.customer.findUnique({ where:{ id: c.id }});
    const pts = custData?.loyaltyPoints || 0;
    await prisma.loyaltyAccount.upsert({
      where:{ customerId: c.id },
      update:{},
      create:{ customerId: c.id, points: pts, tier: pts>300?"GOLD": pts>100?"SILVER":"BRONZE" },
    });
    // also create 1 address for 30% customers
    if(Math.random()<0.3){
      await prisma.address.create({
        data:{ customerId: c.id, label:"HOME", line1:`${100+ Math.floor(Math.random()*900)} MG Road`, city:"Pune", state:"Maharashtra", pincode:"411001", isDefault:true },
      });
    }
  }
  // Permissions
  const perms=[
    { name:"menu:read", description:"View menu", roles:["OWNER","MANAGER","CASHIER","WAITER","CHEF"] as never },
    { name:"menu:write", description:"Edit menu", roles:["OWNER","MANAGER"] as never },
    { name:"order:create", description:"Create orders", roles:["OWNER","MANAGER","CASHIER","WAITER"] as never },
    { name:"billing:write", description:"Billing/payments", roles:["OWNER","MANAGER","CASHIER"] as never },
    { name:"kitchen:manage", description:"KOT/kitchen", roles:["OWNER","MANAGER","CHEF","KITCHEN_MANAGER","KITCHEN_STAFF"] as never },
    { name:"inventory:manage", description:"Inventory", roles:["OWNER","MANAGER"] as never },
  ];
  for(const p of perms){
    await prisma.permission.upsert({ where:{ name: p.name }, update:{}, create:{ name: p.name, description: p.description, roles: p.roles }}).catch(()=>null);
  }
  // Coupon redemptions sample (for redeemed coupons)
  const redeemedCoupons = await prisma.coupon.findMany({ where:{ status:"REDEEMED" }, take:5 });
  for(const cp of redeemedCoupons){
    await prisma.couponRedemption.create({
      data:{ couponId: cp.id, customerId: cp.customerId, billId: cp.billId, discount: cp.value, redeemedAt: new Date() },
    }).catch(()=>null);
  }

  // WhatsApp templates & campaigns
  const waTemplates = [
    { name:"welcome", content:"Hi {{name}}! Welcome to {{restaurant}} 🎉", variables:["name","restaurant"]},
    { name:"bill_receipt", content:"Hi {{name}}, your bill {{billNumber}} for ₹{{total}} is paid. Receipt: {{link}}", variables:["name","billNumber","total","link"]},
    { name:"coupon_issued", content:"Hi {{name}}! Coupon {{coupon}} — {{value}} off till {{expiry}} at {{restaurant}}!", variables:["name","coupon","value","expiry","restaurant"]},
    { name:"birthday_offer", content:"Happy Birthday {{name}} 🎂! Enjoy {{value}} off with {{coupon}} till {{expiry}} at {{restaurant}}!", variables:["name","value","coupon","expiry","restaurant"]},
    { name:"feedback_request", content:"Hi {{name}}, enjoyed {{restaurant}}? Rate us {{link}} and get {{value}} off!", variables:["name","restaurant","link","value"]},
    { name:"order_confirmation", content:"Hi {{name}}, order {{orderNumber}} confirmed! Total ₹{{total}}. Track: {{link}}", variables:["name","orderNumber","total","link"]},
    { name:"delivery_update", content:"Hi {{name}}, your order {{orderNumber}} is {{status}}! ETA {{eta}}. OTP {{otp}}", variables:["name","orderNumber","status","eta","otp"]},
  ];
  for(const t of waTemplates){
    await prisma.whatsAppTemplate.upsert({ where:{ name: t.name }, update:{}, create:{ name: t.name, content: t.content, variables: t.variables }});
  }
  const tmplBirthday = await prisma.whatsAppTemplate.findUnique({ where:{ name:"birthday_offer" }});
  const tmplWelcome = await prisma.whatsAppTemplate.findUnique({ where:{ name:"welcome" }});
  const tmplFeedback = await prisma.whatsAppTemplate.findUnique({ where:{ name:"feedback_request" }});
  if(tmplBirthday){
    await prisma.whatsAppCampaign.upsert({
      where:{ id:"seed_bday_camp" },
      update:{},
      create:{ id:"seed_bday_camp", name:"Birthday Offer — ₹200 off", event:"BIRTHDAY_OFFER" as never, templateId: tmplBirthday.id, audience:{ hasBirthday:true, consentRequired:true }, schedule:"RECURRING_DAILY" as never, couponRequired:true, couponValue:200, couponPrefix:"BDAY", isActive:true },
    });
  }
  if(tmplWelcome){
    await prisma.whatsAppCampaign.upsert({
      where:{ id:"seed_welcome_camp" },
      update:{},
      create:{ id:"seed_welcome_camp", name:"Welcome New Customer", event:"WELCOME" as never, templateId: tmplWelcome.id, audience:{ minVisits:1 }, schedule:"IMMEDIATE" as never, isActive:true },
    });
  }
  if(tmplFeedback){
    await prisma.whatsAppCampaign.upsert({
      where:{ id:"seed_feedback_camp" },
      update:{},
      create:{ id:"seed_feedback_camp", name:"Feedback Request 24h", event:"FEEDBACK_REQUEST" as never, templateId: tmplFeedback.id, audience:{ minSpend:500 }, schedule:"SCHEDULED" as never, scheduledAt: new Date(Date.now()+ 24*3600000), couponRequired:true, couponValue:100, isActive:true },
    });
  }

  console.log("Seed complete");
}

main().catch(e=>{ console.error(e); process.exit(1)}).finally(()=> prisma.$disconnect());
