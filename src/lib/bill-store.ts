import { demoBills } from "@/data/demo";

type Bill = (typeof demoBills)[number] & { qrToken?:string; restaurantId?:string; orderNumber?:string };

const g = globalThis as unknown as {
  __billStore?: Map<string, Bill>;
  __orderStore?: Map<string, { id:string; orderNumber:string; status:string; type:string; tableId?:string|null; customerId?:string|null; subtotal:number; taxAmount:number; totalAmount:number; createdAt:string }>;
};

function getBillStore(){
  if(!g.__billStore){
    const m=new Map<string, Bill>();
    for(const b of demoBills) m.set(b.id, { ...b } as Bill);
    // also index by billNumber and qrToken for lookup
    g.__billStore=m;
  }
  return g.__billStore!;
}
function getOrderStore(){
  if(!g.__orderStore){
    const m=new Map<string, { id:string; orderNumber:string; status:string; type:string; tableId?:string|null; customerId?:string|null; subtotal:number; taxAmount:number; totalAmount:number; createdAt:string }>();
    for(const b of demoBills) m.set(b.orderId, { id:b.orderId, orderNumber:b.orderNumber, status:"COMPLETED", type:"DINE_IN", subtotal:b.subtotal, taxAmount:b.taxAmount, totalAmount:b.totalAmount, createdAt:b.createdAt });
    g.__orderStore=m;
  }
  return g.__orderStore!;
}

export const billStore={
  get: (idOrNumberOrToken:string)=>{
    const store=getBillStore();
    // direct id
    if(store.has(idOrNumberOrToken)) return store.get(idOrNumberOrToken)!;
    // by billNumber
    for(const b of store.values()) if(b.billNumber===idOrNumberOrToken) return b;
    // by qrToken
    for(const b of store.values()) if(b.qrToken===idOrNumberOrToken) return b;
    // by orderId
    for(const b of store.values()) if(b.orderId===idOrNumberOrToken) return b;
    return null;
  },
  add: (bill: Bill)=>{
    getBillStore().set(bill.id, bill);
    // also index by qrToken if needed via get loop
    return bill;
  },
  list: (limit=100)=>{
    return Array.from(getBillStore().values()).slice(0,limit);
  },
  orderStore: getOrderStore,
  addOrder: (order:{ id:string; orderNumber:string; status:string; type:string; tableId?:string|null; customerId?:string|null; subtotal:number; taxAmount:number; totalAmount:number; createdAt:string })=>{
    getOrderStore().set(order.id, order);
    return order;
  },
  getOrder: (id:string)=> getOrderStore().get(id) || null,
};
