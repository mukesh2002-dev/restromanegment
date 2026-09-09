// Automation service: campaign, audience, schedule, birthday, delivery log
// Mock scheduler — in prod replace with cron/queue (e.g., vercel cron, bullmq)

import { isDbAvailable, prisma } from "./db";
import { demoCustomers, demoCoupons } from "@/data/demo";
import { sendWhatsApp, renderTemplate, EVENT_TEMPLATES, hasRequiredConsent, type WhatsAppEvent } from "./whatsapp";

// In-memory demo stores for fallback
const g = globalThis as unknown as {
  __waTemplates?: { id:string; name:string; content:string; variables:string[]; isActive:boolean }[];
  __waCampaigns?: { id:string; name:string; event:WhatsAppEvent; templateId:string; audience:Record<string,unknown>; schedule:string; scheduledAt?:string; couponRequired:boolean; couponValue?:number; isActive:boolean; lastRunAt?:string }[];
  __waLogs?: { id:string; toPhone:string; message:string; status:string; event?:WhatsAppEvent; templateId?:string; campaignId?:string; createdAt:string }[];
};

function getTemplates(){
  if(!g.__waTemplates){
    g.__waTemplates = Object.entries(EVENT_TEMPLATES).map(([event, t])=> ({
      id: `tmpl_${event.toLowerCase()}`,
      name: t.name,
      content: t.content,
      variables: t.variables,
      isActive: true,
    }));
  }
  return g.__waTemplates!;
}

function getCampaigns(){
  if(!g.__waCampaigns){
    g.__waCampaigns = [
      { id:"camp_bday", name:"Birthday Offer — ₹200 off", event:"BIRTHDAY_OFFER" as WhatsAppEvent, templateId:"tmpl_birthday_offer", audience:{ hasBirthday:true, consentRequired:true }, schedule:"RECURRING_DAILY", couponRequired:true, couponValue:200, isActive:true },
      { id:"camp_welcome", name:"Welcome New Customer", event:"WELCOME" as WhatsAppEvent, templateId:"tmpl_welcome", audience:{ minVisits:1 }, schedule:"IMMEDIATE", couponRequired:false, isActive:true },
      { id:"camp_feedback", name:"Feedback Request 24h", event:"FEEDBACK_REQUEST" as WhatsAppEvent, templateId:"tmpl_feedback_request", audience:{ minSpend:500 }, schedule:"SCHEDULED", scheduledAt: new Date(Date.now()+ 24*3600000).toISOString(), couponRequired:true, couponValue:100, isActive:true },
    ];
  }
  return g.__waCampaigns!;
}

function getLogs(){
  if(!g.__waLogs) g.__waLogs=[];
  return g.__waLogs!;
}

export const automationService = {
  // Templates
  listTemplates: async ()=>{
    const dbOk=await isDbAvailable();
    if(dbOk) return prisma.whatsAppTemplate.findMany({ orderBy:{ name:"asc"}});
    return getTemplates();
  },
  createTemplate: async (data:{ name:string; content:string; variables?:string[] })=>{
    const dbOk=await isDbAvailable();
    if(dbOk) return prisma.whatsAppTemplate.create({ data:{ name: data.name, content: data.content, variables: data.variables||[] }});
    const t={ id:`tmpl_${Date.now()}`, name: data.name, content: data.content, variables: data.variables||[], isActive:true };
    getTemplates().push(t);
    return t;
  },
  // Campaigns
  listCampaigns: async ()=>{
    const dbOk=await isDbAvailable();
    if(dbOk) return prisma.whatsAppCampaign.findMany({ include:{ template:true }, orderBy:{ createdAt:"desc"}});
    return getCampaigns().map(c=> ({ ...c, template: getTemplates().find(t=> t.id===c.templateId) }));
  },
  createCampaign: async (data:{ name:string; event:WhatsAppEvent; templateId:string; audience?:Record<string,unknown>; schedule?:string; scheduledAt?:string; couponRequired?:boolean; couponValue?:number; couponPrefix?:string })=>{
    const dbOk=await isDbAvailable();
    if(dbOk) return prisma.whatsAppCampaign.create({ data:{
      name: data.name, event: data.event as never, templateId: data.templateId, audience: data.audience||{}, schedule: (data.schedule as never)||"IMMEDIATE", scheduledAt: data.scheduledAt? new Date(data.scheduledAt): null, couponRequired: !!data.couponRequired, couponValue: data.couponValue, couponPrefix: data.couponPrefix||"WA",
    } as never });
    const c={ id:`camp_${Date.now()}`, name: data.name, event: data.event, templateId: data.templateId, audience: data.audience||{}, schedule: data.schedule||"IMMEDIATE", scheduledAt: data.scheduledAt, couponRequired: !!data.couponRequired, couponValue: data.couponValue, isActive:true };
    getCampaigns().push(c as never);
    return c;
  },
  // Consent update
  updateConsent: async (customerId:string, data:{ whatsappOptIn?:boolean; smsOptIn?:boolean; emailOptIn?:boolean; source?:string })=>{
    const dbOk=await isDbAvailable();
    if(dbOk) return prisma.customer.update({ where:{ id: customerId }, data:{ whatsappOptIn: data.whatsappOptIn, smsOptIn: data.smsOptIn, emailOptIn: data.emailOptIn, consentTimestamp: new Date(), consentSource: data.source||"manual" }});
    // demo fallback: mutate demoCustomers array (not persisted but ok for demo)
    const c=demoCustomers.find(x=> x.id===customerId) as unknown as Record<string,unknown>;
    if(c){ Object.assign(c, { whatsappOptIn: data.whatsappOptIn, smsOptIn: data.smsOptIn, emailOptIn: data.emailOptIn }); }
    return { id: customerId, ...data, consentTimestamp: new Date().toISOString() };
  },
  // Birthday automation — finds eligible customers today, generates coupon if needed, sends
  runBirthdayCampaign: async (campaignId?:string)=>{
    const dbOk=await isDbAvailable();
    const campaigns = dbOk? await prisma.whatsAppCampaign.findMany({ where:{ event:"BIRTHDAY_OFFER", isActive:true }, include:{ template:true }}) : getCampaigns().filter(c=> c.event==="BIRTHDAY_OFFER" && c.isActive).map(c=> ({ ...c, template: getTemplates().find(t=> t.id===c.templateId) } as never));
    const targetCampaigns = campaignId? (campaigns as unknown as {id:string}[]).filter(c=> c.id===campaignId) : campaigns as unknown as {id:string; template:{content:string}; couponRequired:boolean; couponValue?:number; couponPrefix?:string; audience:Record<string,unknown>}[];
    if(targetCampaigns.length===0) return { sent:0, skipped:0, reason:"No active birthday campaign" };

    let sent=0, skipped=0;
    const logs:{ toPhone:string; message:string; status:string }[]=[];

    for(const camp of targetCampaigns){
      const templateContent=(camp as unknown as {template:{content:string}}).template?.content || EVENT_TEMPLATES.BIRTHDAY_OFFER.content;
      // audience: consentRequired, hasBirthday
      const customers = dbOk? await prisma.customer.findMany({ where:{ birthday:{ not:null } }}) : (demoCustomers as unknown as {id:string; name:string; phone:string; birthday:string; whatsappOptIn?:boolean}[]).filter(c=> c.birthday);
      for(const cust of customers as unknown as {id:string; name:string; phone:string; birthday:string; whatsappOptIn?:boolean; marketingConsent?:boolean}[]){
        // check birthday today (month/day)
        const bd=new Date(cust.birthday);
        const now=new Date();
        if(bd.getMonth()!==now.getMonth() || bd.getDate()!==now.getDate()) { skipped++; continue; }
        // consent check
        const hasConsent = (cust as unknown as {whatsappOptIn?:boolean}).whatsappOptIn ?? (cust as unknown as {marketingConsent?:boolean}).marketingConsent;
        if(!hasConsent){ skipped++; continue; }

        // generate coupon if required
        let couponCode="";
        if((camp as unknown as {couponRequired:boolean}).couponRequired){
          const prefix=(camp as unknown as {couponPrefix?:string}).couponPrefix||"BDAY";
          couponCode=`${prefix}-${Date.now().toString(36).toUpperCase().slice(0,4)}-${Math.random().toString(36).slice(2,4).toUpperCase()}`;
          if(dbOk){
            await prisma.coupon.create({ data:{
              code: couponCode, customerId: cust.id, rewardType:"FIXED" as never, value: (camp as unknown as {couponValue?:number}).couponValue||200, status:"ACTIVE" as never, expiryDate: new Date(Date.now()+7*86400000),
            }}).catch(()=>null);
          } else {
            (demoCoupons as unknown as {code:string; value:number; status:string; expiryDate:string; customerId:string}[]).push({ code: couponCode, value: (camp as unknown as {couponValue?:number}).couponValue||200, status:"ACTIVE", expiryDate: new Date(Date.now()+7*86400000).toISOString(), customerId: cust.id } as never);
          }
        }

        const message=renderTemplate(templateContent, {
          name: cust.name,
          coupon: couponCode || "BDAY200",
          value: `₹${(camp as unknown as {couponValue?:number}).couponValue||200}`,
          expiry: new Date(Date.now()+7*86400000).toLocaleDateString(),
          restaurant: "Spice Garden",
        });

        // consent already checked, send via provider
        if(!hasRequiredConsent({ whatsappOptIn: !!hasConsent } as never, "BIRTHDAY_OFFER")){
          skipped++; continue;
        }
        const result=await sendWhatsApp({ to: cust.phone, event:"BIRTHDAY_OFFER", message, variables:{ name: cust.name, coupon: couponCode } });
        const logData={ toPhone: cust.phone, message, status: result.success? "SENT":"FAILED", event:"BIRTHDAY_OFFER" as WhatsAppEvent, templateId: (camp as unknown as {template:{id:string}}).template?.id, campaignId: camp.id, providerId: result.providerId, error: result.error };
        if(dbOk){
          await prisma.whatsAppLog.create({ data: logData as never }).catch(()=>null);
        } else {
          getLogs().unshift({ id:`log_${Date.now()}_${Math.random().toString(36).slice(2,4)}`, ...logData, createdAt: new Date().toISOString() } as never);
        }
        logs.push({ toPhone: cust.phone, message, status: result.success? "SENT":"FAILED" });
        sent++;
        // update lastRunAt
        if(dbOk) await prisma.whatsAppCampaign.update({ where:{ id: camp.id }, data:{ lastRunAt: new Date() } }).catch(()=>null);
      }
    }
    return { sent, skipped, logs };
  },
  // Generic event sender (bill, coupon, order etc.)
  sendEvent: async (event:WhatsAppEvent, toPhone:string, variables:Record<string,string>, customer?:{ whatsappOptIn?:boolean; smsOptIn?:boolean })=>{
    const template=EVENT_TEMPLATES[event];
    const message=renderTemplate(template.content, variables);
    // consent gate for marketing
    if(customer && !hasRequiredConsent(customer as never, event)){
      return { success:false, error:"Consent required — marketing opt-in missing", status:"FAILED" as const };
    }
    const result=await sendWhatsApp({ to: toPhone, event, message, variables });
    const dbOk=await isDbAvailable();
    const logData={ toPhone, message, status: result.success? "SENT":"FAILED", event, providerId: result.providerId, error: result.error };
    if(dbOk) await prisma.whatsAppLog.create({ data: logData as never }).catch(()=>null);
    else getLogs().unshift({ id:`log_${Date.now()}`, ...logData, createdAt: new Date().toISOString() } as never);
    return result;
  },
  listLogs: async (take=50)=>{
    const dbOk=await isDbAvailable();
    if(dbOk) return prisma.whatsAppLog.findMany({ orderBy:{ createdAt:"desc"}, take, include:{ template:true, campaign:true } });
    return getLogs().slice(0,take);
  }
};
