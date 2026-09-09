// Inventory service — separate from POS so consumption can be automated later via recipes
// Used by both API routes and future POS hooks

import { isDbAvailable } from "./db";
import { demoInventory } from "@/data/demo";

// In-memory stores for fallback (persist per server process)
type InvItem = (typeof demoInventory)[number] & { supplierId?: string | null; batchNumber?: string | null };
type Supplier = { id:string; name:string; contactName?:string; phone?:string; email?:string; address?:string; gstin?:string; isActive:boolean; createdAt:string };
type StockTx = { id:string; inventoryItemId:string; type:string; quantity:number; unitCost?:number; reference?:string; createdAt:string; createdById?:string };
type POItem = { inventoryItemId:string; quantity:number; unitCost:number; totalCost:number };
type PurchaseOrder = { id:string; poNumber:string; supplierId:string; status:string; totalAmount:number; notes?:string; items: POItem[]; createdAt:string; updatedAt:string; orderedAt?:string; receivedAt?:string };

const g = globalThis as unknown as {
  __invStore?: Map<string, InvItem>;
  __supStore?: Map<string, Supplier>;
  __txStore?: StockTx[];
  __poStore?: Map<string, PurchaseOrder>;
};

function getInvStore(){
  if(!g.__invStore){
    const m=new Map<string, InvItem>();
    for(const it of demoInventory) m.set(it.id, { ...it, supplierId: null, batchNumber: null });
    g.__invStore=m;
  }
  return g.__invStore!;
}
function getSupStore(){
  if(!g.__supStore){
    const m=new Map<string, Supplier>();
    const seeds=[
      { id:"sup_1", name:"Fresh Farms Pvt Ltd", contactName:"Ramesh Patel", phone:"9876500001", email:"fresh@farms.in", address:"Pune APMC", gstin:"27AAAAA0000A1Z5" },
      { id:"sup_2", name:"Beverage Distributors Co", contactName:"Anita Desai", phone:"9876500002", email:"bev@dist.in", address:"Mumbai" },
      { id:"sup_3", name:"Packaging World", contactName:"Suresh Kumar", phone:"9876500003", email:"pack@world.in", address:"Delhi" },
      { id:"sup_4", name:"Cleaning Solutions Ltd", contactName:"Priya Nair", phone:"9876500004", email:"clean@sol.in", address:"Pune" },
    ] as Supplier[];
    for(const s of seeds) m.set(s.id, { ...s, isActive:true, createdAt: new Date().toISOString() });
    g.__supStore=m;
  }
  return g.__supStore!;
}
function getTxStore(){
  if(!g.__txStore){
    const arr: StockTx[]=[];
    for(let i=0;i<200;i++){
      const item=demoInventory[i%500];
      const types=["PURCHASE","CONSUMPTION","ADJUSTMENT","WASTE","RETURN","TRANSFER"] as const;
      const type=types[i%6];
      const qty = type==="CONSUMPTION"||type==="WASTE" ? -(1+ Math.floor(Math.random()*10)) : (5+ Math.floor(Math.random()*20));
      arr.push({ id:`stx_${i+1}`, inventoryItemId:item.id, type, quantity: qty, unitCost: item.costPerUnit, reference:`Demo ${type} #${i+1}`, createdAt: new Date(Date.now()- i*3600000).toISOString() });
    }
    g.__txStore=arr;
  }
  return g.__txStore!;
}
function getPOStore(){
  if(!g.__poStore) g.__poStore=new Map();
  return g.__poStore!;
}

export const inventoryService = {
  // Items
  listItems: async (filter?:{ category?:string; q?:string; lowStock?:boolean; nearExpiry?:boolean })=>{
    const dbOk=await isDbAvailable();
    if(dbOk) return null; // caller should use Prisma
    let list=[...getInvStore().values()];
    if(filter?.category && filter.category!=="ALL") list=list.filter(i=> i.category===filter.category);
    if(filter?.q) {
      const q=filter.q.toLowerCase();
      list=list.filter(i=> i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    }
    if(filter?.lowStock) list=list.filter(i=> i.currentStock < i.reorderLevel);
    if(filter?.nearExpiry) {
      const threshold= Date.now()+ 14*86400000;
      list=list.filter(i=> i.expiryDate && new Date(i.expiryDate).getTime() < threshold && new Date(i.expiryDate).getTime() > Date.now());
    }
    return list;
  },
  getItem: (id:string)=> getInvStore().get(id) || null,
  createItem: (data: Omit<InvItem,"id"> & {id?:string})=>{
    const id=data.id || `inv_${Date.now()}`;
    const sku=data.sku || `SKU-${String(Date.now()).slice(-5)}`;
    const item={ ...data, id, sku, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as unknown as InvItem;
    getInvStore().set(id, item);
    return item;
  },
  updateItem: (id:string, patch: Partial<InvItem>)=>{
    const cur=getInvStore().get(id);
    if(!cur) return null;
    const next={ ...cur, ...patch, updatedAt: new Date().toISOString() } as InvItem;
    getInvStore().set(id, next);
    return next;
  },
  deleteItem: (id:string)=> getInvStore().delete(id),
  // Suppliers
  listSuppliers: ()=> [...getSupStore().values()],
  getSupplier: (id:string)=> getSupStore().get(id)||null,
  createSupplier: (data: Omit<Supplier,"id"|"createdAt">)=>{
    const id=`sup_${Date.now()}`;
    const s={ ...data, id, createdAt: new Date().toISOString(), isActive:true } as Supplier;
    getSupStore().set(id, s);
    return s;
  },
  // Transactions
  listTransactions: (itemId?:string)=>{
    let list=[...getTxStore()];
    if(itemId) list=list.filter(t=> t.inventoryItemId===itemId);
    return list.sort((a,b)=> new Date(b.createdAt).getTime()- new Date(a.createdAt).getTime());
  },
  createTransaction: (data: Omit<StockTx,"id"|"createdAt">)=>{
    const id=`stx_${Date.now()}_${Math.random().toString(36).slice(2,5)}`;
    const tx={ ...data, id, createdAt: new Date().toISOString() } as StockTx;
    getTxStore().unshift(tx);
    // auto-apply to stock
    const item=getInvStore().get(data.inventoryItemId);
    if(item){
      item.currentStock = Math.max(0, item.currentStock + data.quantity);
      getInvStore().set(item.id, item);
    }
    return tx;
  },
  // Purchase Orders
  listPOs: ()=> [...getPOStore().values()].sort((a,b)=> new Date(b.createdAt).getTime()- new Date(a.createdAt).getTime()),
  getPO: (id:string)=> getPOStore().get(id)||null,
  createPO: (data:{ supplierId:string; notes?:string; items: POItem[] })=>{
    const id=`po_${Date.now()}`;
    const poNumber=`PO-2026-${String(Date.now()).slice(-6)}`;
    const totalAmount=data.items.reduce((a,i)=>a+i.totalCost,0);
    const po: PurchaseOrder={ id, poNumber, supplierId: data.supplierId, status:"DRAFT", totalAmount, notes: data.notes, items: data.items, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    getPOStore().set(id, po);
    return po;
  },
  updatePOStatus: (id:string, status:string)=>{
    const po=getPOStore().get(id);
    if(!po) return null;
    const next={ ...po, status, updatedAt: new Date().toISOString(), ...(status==="ORDERED"?{orderedAt:new Date().toISOString()}:{}), ...(status==="RECEIVED"?{receivedAt:new Date().toISOString()}:{}) } as PurchaseOrder;
    // if RECEIVED, apply purchase transactions
    if(status==="RECEIVED"){
      for(const it of po.items){
        inventoryService.createTransaction({ inventoryItemId: it.inventoryItemId, type:"PURCHASE", quantity: it.quantity, unitCost: it.unitCost, reference: po.poNumber });
      }
    }
    getPOStore().set(id, next);
    return next;
  },
  // Alerts
  getAlerts: ()=>{
    const items=[...getInvStore().values()];
    const low=items.filter(i=> i.currentStock < i.reorderLevel && i.currentStock>0);
    const out=items.filter(i=> i.currentStock===0);
    const nearExpiry=items.filter(i=> i.expiryDate && new Date(i.expiryDate).getTime() < Date.now()+14*86400000 && new Date(i.expiryDate).getTime() > Date.now());
    return { low, out, nearExpiry, counts:{ low:low.length, out:out.length, nearExpiry:nearExpiry.length, total: items.length } };
  },
  // For POS consumption (separate)
  consumeForOrder: async ()=>{
    // Future: lookup RecipeItem and create CONSUMPTION transactions
    return { consumed:0, note:"Recipe mapping pending — manual consumption via API" };
  }
};
