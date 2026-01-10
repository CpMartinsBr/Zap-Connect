import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { seedPlans, createSubscription, getCompanySubscription } from "./services/plans";

const { Pool } = pg;

async function migrateSubscriptions() {
  console.log("[migrate] Starting subscription migration...");
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    await seedPlans();
    console.log("[migrate] Plans seeded successfully");

    const companies = await db.select().from(schema.companies);
    console.log(`[migrate] Found ${companies.length} companies`);

    for (const company of companies) {
      const existingSubscription = await getCompanySubscription(company.id);
      
      if (!existingSubscription) {
        const planName = company.plan === "professional" || company.plan === "enterprise" 
          ? "pro" 
          : company.plan === "starter" 
            ? "pro" 
            : "free";
        
        await createSubscription(company.id, planName, "active");
        console.log(`[migrate] Created subscription for company ${company.id} (${company.name}) with plan: ${planName}`);
      } else {
        console.log(`[migrate] Company ${company.id} (${company.name}) already has subscription`);
      }
    }

    console.log("[migrate] Migration completed successfully!");
  } catch (error) {
    console.error("[migrate] Error during migration:", error);
  } finally {
    await pool.end();
  }
}

migrateSubscriptions();
