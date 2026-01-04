import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, isNull, isNotNull, and } from "drizzle-orm";
import * as schema from "@shared/schema";

const { Pool } = pg;

async function migrateMemberships() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("Starting membership migration...");

  const usersWithCompany = await db
    .select()
    .from(schema.users)
    .where(isNotNull(schema.users.companyId));

  console.log(`Found ${usersWithCompany.length} users with company assignments`);

  for (const user of usersWithCompany) {
    if (!user.companyId) continue;

    const existingMembership = await db
      .select()
      .from(schema.companyMemberships)
      .where(and(
        eq(schema.companyMemberships.userId, user.id),
        eq(schema.companyMemberships.companyId, user.companyId)
      ));

    if (existingMembership.length === 0) {
      await db.insert(schema.companyMemberships).values({
        userId: user.id,
        companyId: user.companyId,
        role: "admin",
        isDefault: 1,
      });
      console.log(`Created membership for user ${user.email} in company ${user.companyId}`);
    } else {
      console.log(`User ${user.email} already has membership in company ${user.companyId}`);
    }
  }

  console.log("Migration complete!");
  await pool.end();
}

migrateMemberships().catch(console.error);
