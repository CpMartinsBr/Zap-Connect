import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Plan, PlanLimits, Subscription, SubscriptionWithPlan, SubscriptionStatus } from "@shared/schema";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const DEFAULT_PLANS: Array<{
  name: string;
  displayName: string;
  description: string;
  price: string;
  limits: PlanLimits;
  features: string[];
  sortOrder: number;
}> = [
  {
    name: "free",
    displayName: "Gratuito",
    description: "Para começar a usar o sistema",
    price: "0",
    limits: {
      maxContacts: 50,
      maxProducts: 20,
      maxOrders: 100,
      maxTeamMembers: 1,
      whatsappEnabled: false,
      reportsEnabled: false,
      apiAccess: false,
    },
    features: ["Cadastro de clientes", "Cadastro de produtos", "Pedidos básicos"],
    sortOrder: 0,
  },
  {
    name: "pro",
    displayName: "Profissional",
    description: "Para confeitarias em crescimento",
    price: "49.90",
    limits: {
      maxContacts: 500,
      maxProducts: 200,
      maxOrders: 1000,
      maxTeamMembers: 5,
      whatsappEnabled: true,
      reportsEnabled: true,
      apiAccess: false,
    },
    features: [
      "Tudo do plano Gratuito",
      "WhatsApp integrado",
      "Relatórios",
      "Até 5 membros na equipe",
    ],
    sortOrder: 1,
  },
  {
    name: "premium",
    displayName: "Premium",
    description: "Para confeitarias profissionais",
    price: "99.90",
    limits: {
      maxContacts: -1,
      maxProducts: -1,
      maxOrders: -1,
      maxTeamMembers: -1,
      whatsappEnabled: true,
      reportsEnabled: true,
      apiAccess: true,
    },
    features: [
      "Tudo do plano Profissional",
      "Clientes ilimitados",
      "Produtos ilimitados",
      "Membros ilimitados",
      "Acesso à API",
      "Suporte prioritário",
    ],
    sortOrder: 2,
  },
];

export async function seedPlans(): Promise<void> {
  for (const planData of DEFAULT_PLANS) {
    const existing = await db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.name, planData.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.plans).values({
        name: planData.name,
        displayName: planData.displayName,
        description: planData.description,
        price: planData.price,
        limits: planData.limits,
        features: planData.features,
        sortOrder: planData.sortOrder,
      });
      console.log(`[plans] Created plan: ${planData.name}`);
    }
  }
}

export async function getAllPlans(): Promise<Plan[]> {
  return db
    .select()
    .from(schema.plans)
    .where(eq(schema.plans.isActive, 1))
    .orderBy(schema.plans.sortOrder);
}

export async function getPlanByName(name: string): Promise<Plan | null> {
  const [plan] = await db
    .select()
    .from(schema.plans)
    .where(eq(schema.plans.name, name))
    .limit(1);
  return plan || null;
}

export async function getPlanById(id: number): Promise<Plan | null> {
  const [plan] = await db
    .select()
    .from(schema.plans)
    .where(eq(schema.plans.id, id))
    .limit(1);
  return plan || null;
}

export async function getCompanySubscription(companyId: number): Promise<SubscriptionWithPlan | null> {
  const [subscription] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.companyId, companyId))
    .limit(1);

  if (!subscription) return null;

  const plan = await getPlanById(subscription.planId);
  if (!plan) return null;

  return { ...subscription, plan };
}

export async function getCompanyPlan(companyId: number): Promise<Plan> {
  const subscription = await getCompanySubscription(companyId);
  
  if (subscription) {
    return subscription.plan;
  }

  const freePlan = await getPlanByName("free");
  if (!freePlan) {
    throw new Error("Free plan not found. Run seedPlans first.");
  }
  return freePlan;
}

export async function isFeatureAllowed(companyId: number, feature: keyof PlanLimits): Promise<boolean> {
  const subscription = await getCompanySubscription(companyId);
  
  if (!subscription) {
    const freePlan = await getPlanByName("free");
    if (!freePlan) return false;
    const limits = freePlan.limits as PlanLimits;
    return !!limits[feature];
  }

  if (subscription.status === "suspended" || subscription.status === "canceled") {
    return false;
  }

  if (subscription.status === "trial" && subscription.trialEndsAt) {
    if (new Date() > subscription.trialEndsAt) {
      return false;
    }
  }

  const limits = subscription.plan.limits as PlanLimits;
  return !!limits[feature];
}

export async function checkLimit(
  companyId: number, 
  limitKey: keyof PlanLimits, 
  currentCount: number
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const plan = await getCompanyPlan(companyId);
  const limits = plan.limits as PlanLimits;
  const limit = limits[limitKey] as number | undefined;

  if (limit === undefined || limit === -1) {
    return { allowed: true, limit: -1, current: currentCount };
  }

  return {
    allowed: currentCount < limit,
    limit,
    current: currentCount,
  };
}

export async function createSubscription(
  companyId: number,
  planName: string,
  status: SubscriptionStatus = "active",
  trialDays?: number
): Promise<Subscription> {
  const plan = await getPlanByName(planName);
  if (!plan) {
    throw new Error(`Plan ${planName} not found`);
  }

  const existing = await getCompanySubscription(companyId);
  if (existing) {
    await db
      .update(schema.subscriptions)
      .set({
        planId: plan.id,
        status,
        trialEndsAt: trialDays ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.companyId, companyId));

    const [updated] = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.companyId, companyId));
    return updated;
  }

  const [subscription] = await db
    .insert(schema.subscriptions)
    .values({
      companyId,
      planId: plan.id,
      status,
      startedAt: new Date(),
      trialEndsAt: trialDays ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null,
    })
    .returning();

  return subscription;
}

export async function updateSubscriptionStatus(
  companyId: number,
  status: SubscriptionStatus,
  notes?: string
): Promise<Subscription | null> {
  const [updated] = await db
    .update(schema.subscriptions)
    .set({
      status,
      notes,
      canceledAt: status === "canceled" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.subscriptions.companyId, companyId))
    .returning();

  return updated || null;
}

export async function ensureCompanyHasSubscription(companyId: number): Promise<void> {
  const existing = await getCompanySubscription(companyId);
  if (!existing) {
    await createSubscription(companyId, "free", "active");
  }
}
