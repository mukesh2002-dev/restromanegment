import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export const reviewSchema = z.object({
  billId: z.string().min(1),
  qrToken: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  name: z.string().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile"),
  email: z.string().email().optional().or(z.literal("")),
  birthday: z.string().optional(),
  consent: z.boolean().optional(),
});

export const rewardClaimSchema = z.object({
  billId: z.string().min(1),
  qrToken: z.string().optional(),
  customer: z.object({
    name: z.string().min(2),
    phone: z.string().regex(/^[6-9]\d{9}$/),
    email: z.string().email().optional().or(z.literal("")),
    birthday: z.string().optional(),
  }),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const couponRedeemSchema = z.object({
  code: z.string().min(4),
  orderTotal: z.number().min(0),
  customerPhone: z.string().optional(),
});

export const posOrderSchema = z.object({
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  type: z.enum(["DINE_IN","TAKEAWAY","DELIVERY","ONLINE"]),
  items: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().int().min(1),
    notes: z.string().optional(),
    variantId: z.string().optional(),
    addOnIds: z.array(z.string()).optional(),
  })).min(1),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const kotUpdateSchema = z.object({
  status: z.enum(["NEW","ACCEPTED","PREPARING","READY","SERVED","COMPLETED","CANCELLED"]),
});

export const kotItemCancelSchema = z.object({
  reason: z.string().min(3).max(200),
});

export const kotCreateSchema = z.object({
  orderId: z.string().min(1),
  priority: z.number().int().min(0).max(2).optional(),
  notes: z.string().max(300).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(40),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const menuItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  price: z.number().min(0).max(100000),
  taxPercent: z.number().min(0).max(50).optional(),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  servingUnit: z.enum(["PCS","PLATE","BOWL","GLASS","HALF","FULL","THALI","BOTTLE"]).optional(),
  sku: z.string().max(40).optional().or(z.literal("")),
  prepTimeMin: z.number().int().min(1).max(240).optional(),
  variants: z.array(z.object({ name: z.string().min(1), priceDelta: z.number() })).optional(),
  addOns: z.array(z.object({ name: z.string().min(1), price: z.number().min(0) })).optional(),
});

export const tableSchema = z.object({
  number: z.string().min(1).max(20),
  capacity: z.number().int().min(1).max(20),
  floor: z.string().min(1).max(30),
  area: z.string().max(30).optional(),
  status: z.enum(["AVAILABLE","OCCUPIED","RESERVED","BILLING","CLEANING"]).optional(),
});

export const tableStatusSchema = z.object({
  status: z.enum(["AVAILABLE","OCCUPIED","RESERVED","BILLING","CLEANING"]),
});

export const orderCreateSchema = z.object({
  tableId: z.string().optional().or(z.literal("")),
  customerId: z.string().optional().or(z.literal("")),
  type: z.enum(["DINE_IN","TAKEAWAY","DELIVERY","ONLINE"]),
  items: z.array(z.object({
    menuItemId: z.string().min(1),
    quantity: z.number().int().min(1).max(99),
    notes: z.string().max(200).optional(),
    variantId: z.string().optional(),
    addOnIds: z.array(z.string()).optional(),
  })).min(1),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const billCreateSchema = z.object({
  orderId: z.string().min(1),
  discountAmount: z.number().min(0).optional(),
  couponCode: z.string().min(3).max(30).optional().or(z.literal("")),
  loyaltyPointsToRedeem: z.number().int().min(0).max(100000).optional(),
  payments: z.array(z.object({
    method: z.enum(["CASH","CARD","UPI","WALLET","ONLINE","SPLIT"]),
    amount: z.number().min(0.01),
    reference: z.string().optional(),
  })).min(1),
});

export const billPaymentSchema = z.object({
  method: z.enum(["CASH","CARD","UPI","WALLET","ONLINE","SPLIT"]),
  amount: z.number().min(0.01),
  reference: z.string().optional(),
});

export const inventoryItemSchema = z.object({
  sku: z.string().min(1).max(30).optional(),
  name: z.string().min(2).max(80),
  category: z.enum(["Ingredients","Beverages","Packaging","Cleaning supplies","Other stock"]),
  unit: z.enum(["KG","G","LTR","ML","PCS","BOX","PACK"]),
  currentStock: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  costPerUnit: z.number().min(0).optional(),
  supplierId: z.string().optional().or(z.literal("")),
  batchNumber: z.string().max(40).optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
});

export const stockTransactionSchema = z.object({
  inventoryItemId: z.string().min(1),
  type: z.enum(["PURCHASE","CONSUMPTION","ADJUSTMENT","WASTE","RETURN","TRANSFER"]),
  quantity: z.number().refine(v=> v!==0, "Quantity cannot be 0"),
  unitCost: z.number().min(0).optional(),
  reference: z.string().max(200).optional(),
});

export const supplierSchema = z.object({
  name: z.string().min(2).max(80),
  contactName: z.string().max(80).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  gstin: z.string().max(20).optional().or(z.literal("")),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  notes: z.string().max(300).optional(),
  items: z.array(z.object({
    inventoryItemId: z.string().min(1),
    quantity: z.number().min(0.01),
    unitCost: z.number().min(0),
  })).min(1),
});

export const purchaseOrderStatusSchema = z.object({
  status: z.enum(["DRAFT","ORDERED","RECEIVED","INVOICED","CANCELLED"]),
});

export const deliveryOrderSchema = z.object({
  customerName: z.string().min(2).max(80),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().min(5).max(300),
  area: z.string().max(50).optional().or(z.literal("")),
  instructions: z.string().max(300).optional().or(z.literal("")),
  items: z.array(z.object({
    menuItemId: z.string().min(1),
    quantity: z.number().int().min(1).max(99),
    notes: z.string().max(200).optional(),
    variantId: z.string().optional(),
    addOnIds: z.array(z.string()).optional(),
  })).min(1),
  couponCode: z.string().max(20).optional().or(z.literal("")),
  paymentMethod: z.enum(["CASH","CARD","UPI","WALLET","ONLINE"]).optional(),
});

export const deliveryStatusSchema = z.object({
  status: z.enum(["PLACED","PENDING","CONFIRMED","ACCEPTED","PREPARING","READY","OUT_FOR_DELIVERY","DELIVERED","CANCELLED","FAILED"]),
  assignedTo: z.string().optional().or(z.literal("")),
  estimatedDeliveryTime: z.string().optional().or(z.literal("")),
});
