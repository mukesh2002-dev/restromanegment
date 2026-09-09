// Central helpers for menu — DRY for seed, demo, UI. Reference: Petpooja / Zomato grouping
// Roti/Naan => PCS, Sabzi => PLATE, Sweets => BOWL, Beverages => GLASS

export const UNIT_OPTIONS = ["PCS","PLATE","BOWL","GLASS","THALI","HALF","FULL","BOTTLE"] as const;
export type ServingUnit = typeof UNIT_OPTIONS[number];

export const UNIT_LABEL: Record<string,string> = {
  PCS:"PCS", PLATE:"Plate", BOWL:"Bowl", GLASS:"Glass", THALI:"Thali", HALF:"Half", FULL:"Full", BOTTLE:"Bottle"
};
export const UNIT_HINT: Record<string,string> = {
  PCS:"Roti, Naan, Paratha, Kulcha, Dosa, Samosa → PCS",
  PLATE:"Sabzi, Dal, Paneer, Biryani, Noodles → Plate",
  BOWL:"Gulab Jamun, Ice Cream, Halwa → Bowl",
  GLASS:"Chai, Coffee, Lassi, Mojito, Shake → Glass",
  THALI:"Veg/Non-Veg Thali",
  BOTTLE:"Water, Cold Drink",
  HALF:"Half portion", FULL:"Full portion",
};

export function getServingUnit(name: string, slug: string): ServingUnit {
  const n = name.toLowerCase();
  if (slug === "breads") return "PCS";
  if (slug === "beverages") return n.includes("bottle") || n.includes("water") ? "BOTTLE" : "GLASS";
  if (slug === "desserts") return "BOWL";
  if (n.includes("thali")) return "THALI";
  if (["roti","naan","paratha","kulcha","dosa","idli","vada","samosa","kachori","bhature","pav"].some(k=>n.includes(k))) return "PCS";
  if (["chai","coffee","lassi","mojito","shake","lime","tea"].some(k=>n.includes(k))) return "GLASS";
  if (["gulab","rasgulla","kulfi","ice cream","brownie","halwa","phirni","rasmalai"].some(k=>n.includes(k))) return "BOWL";
  return "PLATE";
}

export function slugForName(name: string): string {
  const n = name.toLowerCase();
  if (["roti","naan","paratha","kulcha"].some(k=>n.includes(k))) return "breads";
  if (["gulab","rasgulla","kulfi","ice cream","brownie","halwa","phirni","rasmalai"].some(k=>n.includes(k))) return "desserts";
  if (["chai","coffee","lassi","mojito","lime","shake","tea"].some(k=>n.includes(k))) return "beverages";
  if (["biryani","jeera rice","steamed rice","fried rice","pulao"].some(k=>n.includes(k))) return "biryani-rice";
  if (["dosa","idli","vada","uttapam","pongal","upma","poha","medu"].some(k=>n.includes(k))) return "south-indian";
  if (["noodles","manchurian","chilli paneer","schezwan","spring roll","honey chilli"].some(k=>n.includes(k))) return "chinese";
  if (n.includes("thali")) return "main-course";
  if (["paneer tikka","chicken tikka","manchurian","gobi 65","chicken 65","hara bhara","fish amritsari","mushroom chilli","samosa","kachori"].some(k=>n.includes(k))) return "starters";
  return "main-course";
}

export const curatedImages: Record<string,string> = {
  "Paneer Tikka":"https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80&auto=format&fit=crop",
  "Chicken Tikka":"https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80&auto=format&fit=crop",
  "Veg Manchurian":"https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80&auto=format&fit=crop",
  "Gobi 65":"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format&fit=crop",
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

export const fallbackBySlug: Record<string,string> = {
  "starters":"https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80&auto=format&fit=crop",
  "main-course":"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80&auto=format&fit=crop",
  "biryani-rice":"https://images.unsplash.com/photo-1631515242808-497c3fbd3972?w=600&q=80&auto=format&fit=crop",
  "breads":"https://images.unsplash.com/photo-1626132647528-4d28822f74ef?w=600&q=80&auto=format&fit=crop",
  "desserts":"https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80&auto=format&fit=crop",
  "beverages":"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&auto=format&fit=crop",
  "south-indian":"https://images.unsplash.com/photo-1610192299482-665286e2120a?w=600&q=80&auto=format&fit=crop",
  "chinese":"https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80&auto=format&fit=crop",
};

export function getImageForItem(baseName: string, slug: string): string {
  return curatedImages[baseName] || fallbackBySlug[slug] || fallbackBySlug["main-course"];
}
