// Demo data generators - realistic fictional static data for UI fallback
// Counts as per master spec: 1 restaurant, 20 staff, 30 tables, 80 menu items, 500 customers, 1000 bills, 500 reviews, 700 loyalty tx, 300 coupons

export const demoRestaurant = {
  id: "rest_1",
  name: "Spice Garden",
  slug: "spice-garden",
  address: "MG Road, Pune MH 411001",
  phone: "+91 98765 43210",
  email: "hello@spicegarden.in",
  gstin: "27ABCDE1234F1Z5",
};

export const staffRoles = ["OWNER","MANAGER","CASHIER","WAITER","KITCHEN_STAFF","KITCHEN_MANAGER","CHEF","DELIVERY_MANAGER"] as const;

export const demoStaff = Array.from({ length: 20 }, (_, i) => ({
  id: `staff_${String(i+1).padStart(2,"0")}`,
  name: ["Aarav Sharma","Priya Patel","Rohan Mehta","Sneha Gupta","Vikram Singh","Ananya Rao","Karan Verma","Neha Joshi","Arjun Reddy","Kavya Nair","Rahul Desai","Pooja Kulkarni","Sameer Khan","Divya Iyer","Aditya Malhotra","Shreya Bansal","Mohit Agarwal","Ritika Jain","Siddharth Bose","Meera Krishnan"][i],
  email: `staff${i+1}@spicegarden.in`,
  phone: `98${String(10000000+i*12345).slice(0,8)}`,
  role: (["OWNER","MANAGER","CASHIER","CASHIER","WAITER","WAITER","WAITER","KITCHEN_MANAGER","CHEF","CHEF","KITCHEN_STAFF","KITCHEN_STAFF","KITCHEN_STAFF","DELIVERY_MANAGER","MANAGER","WAITER","CASHIER","CHEF","WAITER","MANAGER"][i] as typeof staffRoles[number]),
  isActive: true,
}));

export const demoTables = Array.from({ length: 30 }, (_, i) => ({
  id: `table_${i+1}`,
  number: `T-${String(i+1).padStart(2,"0")}`,
  capacity: [2,2,4,4,4,6,6,8][i%8],
  floor: i < 15 ? "Ground" : i < 25 ? "First" : "Rooftop",
  area: ["Indoor","Outdoor","Patio"][i%3],
  status: (["AVAILABLE","OCCUPIED","RESERVED","CLEANING"] as const)[i % 4] as string,
  qrToken: `qr_table_${i+1}_${Math.random().toString(36).slice(2,8)}`,
}));

const categoriesSeed = [
  { name: "Starters", slug: "starters" },
  { name: "Main Course", slug: "main-course" },
  { name: "Biryani & Rice", slug: "biryani-rice" },
  { name: "Breads", slug: "breads" },
  { name: "Desserts", slug: "desserts" },
  { name: "Beverages", slug: "beverages" },
  { name: "South Indian", slug: "south-indian" },
  { name: "Chinese", slug: "chinese" },
];

export const demoCategories = categoriesSeed.map((c,i)=> ({ id:`cat_${i+1}`, ...c, sortOrder:i }));

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
  "Samosa","Kachori","Pav Bhaji","Chole Bhature","Aloo Paratha","Gobi Paratha","Cheese Maggi","Veg Sandwich"
];

function getServingUnitDemo(name:string, slug:string): string {
  const n=name.toLowerCase();
  if (slug==="breads") return "PCS";
  if (slug==="beverages") return "GLASS";
  if (slug==="desserts") return "BOWL";
  if (n.includes("thali")) return "THALI";
  if (["roti","naan","paratha","kulcha","dosa","idli","vada","samosa","kachori","bhature","pav"].some(k=>n.includes(k))) return "PCS";
  if (n.includes("chai")||n.includes("coffee")||n.includes("lassi")||n.includes("mojito")||n.includes("shake")||n.includes("lime")||n.includes("tea")) return "GLASS";
  if (["gulab","rasgulla","kulfi","ice cream","brownie","halwa","phirni","rasmalai"].some(k=>n.includes(k))) return "BOWL";
  return "PLATE";
}
const curatedImagesDemo: Record<string,string> = {
  "Paneer Tikka":"https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80&auto=format&fit=crop",
  "Chicken Tikka":"https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80&auto=format&fit=crop",
  "Veg Manchurian":"https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80&auto=format&fit=crop",
  "Gobi 65":"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format&fit=crop",
  "Dal Tadka":"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80&auto=format&fit=crop",
  "Paneer Butter Masala":"https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600&q=80&auto=format&fit=crop",
  "Veg Biryani":"https://images.unsplash.com/photo-1631515242808-497c3fbd3972?w=600&q=80&auto=format&fit=crop",
  "Chicken Biryani":"https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&q=80&auto=format&fit=crop",
  "Tandoori Roti":"https://images.unsplash.com/photo-1626132647528-4d28822f74ef?w=600&q=80&auto=format&fit=crop",
  "Butter Naan":"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80&auto=format&fit=crop",
  "Gulab Jamun":"https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80&auto=format&fit=crop",
  "Masala Chai":"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&auto=format&fit=crop",
  "Masala Dosa":"https://images.unsplash.com/photo-1610192299482-665286e2120a?w=600&q=80&auto=format&fit=crop",
  "Hakka Noodles":"https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80&auto=format&fit=crop",
  "Veg Thali":"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80&auto=format&fit=crop",
};
const fallbackBySlugDemo: Record<string,string> = {
  "starters":"https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80&auto=format&fit=crop",
  "main-course":"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80&auto=format&fit=crop",
  "biryani-rice":"https://images.unsplash.com/photo-1631515242808-497c3fbd3972?w=600&q=80&auto=format&fit=crop",
  "breads":"https://images.unsplash.com/photo-1626132647528-4d28822f74ef?w=600&q=80&auto=format&fit=crop",
  "desserts":"https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80&auto=format&fit=crop",
  "beverages":"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&auto=format&fit=crop",
  "south-indian":"https://images.unsplash.com/photo-1610192299482-665286e2120a?w=600&q=80&auto=format&fit=crop",
  "chinese":"https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80&auto=format&fit=crop",
};
export const demoMenuItems = menuNames.slice(0,80).map((name,i)=> {
  const catSlug = categoriesSeed[i % 8].slug;
  return {
  id: `mi_${i+1}`,
  categoryId: `cat_${(i % 8)+1}`,
  name,
  description: `Delicious ${name} prepared with authentic spices`,
  price: 120 + (i*13)%350,
  taxPercent: 5,
  isVeg: i % 3 !== 0,
  isAvailable: i % 17 !== 0,
  imageUrl: curatedImagesDemo[name] || fallbackBySlugDemo[catSlug] || null,
  servingUnit: getServingUnitDemo(name, catSlug) as string,
  prepTimeMin: 10 + (i%20),
};
});

export const demoCustomers = Array.from({ length: 500 }, (_, i) => ({
  id: `cust_${i+1}`,
  name: `Customer ${i+1}`,
  phone: `9${String(800000000 + i*1729).slice(0,9)}`,
  email: i % 3 ===0 ? `customer${i+1}@example.com` : null,
  birthday: i % 7 ===0 ? new Date(1990 + (i%25), (i%12), (i%28)+1).toISOString() : null,
  totalVisits: 1 + (i%12),
  totalSpend: 500 + (i*47)%15000,
  loyaltyPoints: (i*13)%500,
  marketingConsent: i%2===0,
  createdAt: new Date(Date.now() - (i*86400000)% (90*86400000)).toISOString(),
}));

export const demoBills = Array.from({ length: 1000 }, (_, i) => {
  const paid = i % 10 !== 9;
  const total = 250 + (i*37)%2500;
  return {
    id: `bill_${String(i+1).padStart(4,"0")}`,
    billNumber: `BILL-2026-${String(i+1).padStart(5,"0")}`,
    orderId: `order_${i+1}`,
    orderNumber: `ORD-2026-${String(i+1).padStart(5,"0")}`,
    customerId: `cust_${(i%500)+1}`,
    status: paid ? "PAID" : (i%3===0?"UNPAID":"PAID"),
    paymentStatus: paid ? "PAID" : "PENDING",
    totalAmount: total,
    subtotal: Math.round(total*0.95),
    taxAmount: Math.round(total*0.05),
    paidAt: paid ? new Date(Date.now() - (i*3600000)% (30*86400000)).toISOString() : null,
    qrToken: `qr_bill_${i+1}_${Math.random().toString(36).slice(2,8)}`,
    createdAt: new Date(Date.now() - (i*3600000)% (30*86400000)).toISOString(),
  };
});

export const demoReviews = Array.from({ length: 500 }, (_, i) => ({
  id: `rev_${i+1}`,
  billId: `bill_${String(i+1).padStart(4,"0")}`,
  rating: (i%5)+1,
  comment: ["Average experience","Good food","Great ambience","Excellent service and taste","Outstanding! Will visit again"][ (i%5) ],
  name: `Customer ${i+1}`,
  phone: demoCustomers[i]?.phone,
  createdAt: new Date().toISOString(),
}));

export const demoLoyaltyTx = Array.from({ length: 700 }, (_, i) => ({
  id: `ltx_${i+1}`,
  customerId: `cust_${(i%500)+1}`,
  billId: `bill_${(i%1000)+1}`,
  type: (i%5===0?"REDEEM":"EARN") as string,
  points: i%5===0 ? -50 : 20 + (i%80),
  balanceAfter: 100 + (i%400),
  createdAt: new Date().toISOString(),
}));

export const demoCoupons = Array.from({ length: 300 }, (_, i) => ({
  id: `coupon_${i+1}`,
  code: `SPICE${String(1000+i).padStart(4,"0")}`,
  rewardType: (["PERCENTAGE","FIXED","FREE_ITEM","LOYALTY_POINTS"] as const)[i%4],
  value: [40, 100, 1, 50][i%4],
  status: (["ACTIVE","REDEEMED","EXPIRED"] as const)[i%3],
  expiryDate: new Date(Date.now() + (i%30)*86400000).toISOString(),
  customerId: `cust_${(i%500)+1}`,
}));

export const demoInventory = Array.from({ length: 500 }, (_, i) => ({
  id: `inv_${i+1}`,
  sku: `SKU-${String(i+1).padStart(5,"0")}`,
  name: ["Basmati Rice","Paneer","Chicken Breast","Tomato","Onion","Cooking Oil","Flour","Sugar","Milk","Butter","Coriander","Garam Masala","Disposable Box","Paper Napkin","Cleaning Spray","Dish Soap","Mineral Water","Cold Drink Can","Tea Leaves","Coffee Powder"][i%20] + ` ${i+1}`,
  category: ["Ingredients","Beverages","Packaging","Cleaning supplies","Other stock"][i%5],
  unit: (["KG","G","LTR","ML","PCS"] as const)[i%5],
  currentStock: 5 + (i*7)%120,
  reorderLevel: 10,
  costPerUnit: 20 + (i*3)%500,
  expiryDate: i%10===0 ? new Date(Date.now()+ 30*86400000).toISOString() : null,
}));

export const demoDeliveryOrders = Array.from({ length: 300 }, (_, i) => ({
  id: `del_${i+1}`,
  orderNumber: `DEL-2026-${String(i+1).padStart(5,"0")}`,
  customerName: `Delivery Customer ${i+1}`,
  customerPhone: `9${String(700000000+i*1234).slice(0,9)}`,
  address: `${100+i} MG Road, Pune`,
  totalAmount: 300 + (i*29)%2000,
  status: (["PENDING","PREPARING","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"] as const)[i%5],
  createdAt: new Date(Date.now() - (i*7200000)% (14*86400000)).toISOString(),
}));

export const demoKOTs: {
  id: string;
  kotNumber: string;
  orderId: string;
  orderNumber: string;
  table: string;
  tableId?: string;
  customer?: string;
  customerPhone?: string;
  status: string;
  priority: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: { id: string; name: string; menuItemId: string; quantity: number; notes: string; status: string }[];
}[] = Array.from({ length: 50 }, (_, i) => {
  const ageMin = i < 5 ? Math.floor(Math.random()*8) : i < 15 ? 10 + Math.floor(Math.random()*25) : Math.floor(Math.random()*120);
  const statusPool = i < 8 ? (["NEW","ACCEPTED","PREPARING"] as const) : (["READY","SERVED","COMPLETED","CANCELLED"] as const);
  const status = (i < 8 ? statusPool[i%3] : statusPool[i%4]) as string;
  const cust = demoCustomers[(i*3)%500];
  return {
    id: `kot_${i+1}`,
    kotNumber: `KOT-2026-${String(i+1).padStart(4,"0")}`,
    orderId: `order_${i+1}`,
    orderNumber: `ORD-2026-${String(i+1).padStart(5,"0")}`,
    table: `T-${String((i%30)+1).padStart(2,"0")}`,
    tableId: `table_${(i%30)+1}`,
    customer: cust ? cust.name : `Customer ${i+1}`,
    customerPhone: cust ? cust.phone : "—",
    status,
    priority: i%10===0?2: i%7===0?1:0,
    notes: i%9===0 ? "VIP — anniversary" : undefined,
    createdAt: new Date(Date.now() - ageMin*60000 - i*60000).toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      { id:`koti_${i+1}_1`, name: demoMenuItems[i%80].name, menuItemId: demoMenuItems[i%80].id, quantity: 1 + (i%3), notes: i%7===0?"Extra spicy, no onion":"", status: status==="CANCELLED"? "CANCELLED": status },
      { id:`koti_${i+1}_2`, name: demoMenuItems[(i+5)%80].name, menuItemId: demoMenuItems[(i+5)%80].id, quantity: 1, notes: "", status: status==="CANCELLED"? "CANCELLED": status },
    ],
  };
});

export const demoCampaigns = [
  { id:"camp_1", name:"4-Star Reward", slug:"4-star", minRating:4, rewardType:"PERCENTAGE", rewardValue:40, couponPrefix:"SPICE40" },
  { id:"camp_2", name:"5-Star Reward", slug:"5-star", minRating:5, rewardType:"PERCENTAGE", rewardValue:50, couponPrefix:"SPICE50" },
];

export function getDashboardStats() {
  return {
    todaySales: demoBills.filter(b=>b.paymentStatus==="PAID").slice(0,50).reduce((a,b)=>a+b.totalAmount,0),
    orders: demoBills.length,
    paidBills: demoBills.filter(b=>b.paymentStatus==="PAID").length,
    pendingBills: demoBills.filter(b=>b.paymentStatus!=="PAID").length,
    tablesOccupied: demoTables.filter(t=>t.status==="OCCUPIED").length,
    kitchenPending: demoKOTs.filter(k=>["NEW","ACCEPTED","PREPARING"].includes(k.status)).length,
    deliveryOrders: demoDeliveryOrders.filter(d=>d.status!=="DELIVERED").length,
    newCustomers: demoCustomers.filter(c=> new Date(c.createdAt) > new Date(Date.now()-7*86400000)).length,
    reviews: demoReviews.length,
    rewardsIssued: 210,
    couponsRedeemed: demoCoupons.filter(c=>c.status==="REDEEMED").length,
    lowStockItems: demoInventory.filter(it=>it.currentStock < it.reorderLevel).length,
  };
}
