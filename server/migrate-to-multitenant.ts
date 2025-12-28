import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, isNull } from "drizzle-orm";
import * as schema from "../shared/schema";

const { Pool } = pg;

async function migrateToMultitenant() {
  console.log("Starting multi-tenant migration...");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const db = drizzle(pool, { schema });

  try {
    const existingCompany = await db.select().from(schema.companies).limit(1);
    
    let company;
    if (existingCompany.length > 0) {
      company = existingCompany[0];
      console.log(`Using existing company: ${company.name} (ID: ${company.id})`);
    } else {
      const [newCompany] = await db.insert(schema.companies).values({
        name: "Minha Confeitaria",
        slug: "minha-confeitaria",
        plan: "free",
      }).returning();
      company = newCompany;
      console.log(`Created default company: ${company.name} (ID: ${company.id})`);
    }

    const usersWithoutCompany = await db.select().from(schema.users).where(isNull(schema.users.companyId));
    if (usersWithoutCompany.length > 0) {
      for (const user of usersWithoutCompany) {
        await db.update(schema.users)
          .set({ companyId: company.id })
          .where(eq(schema.users.id, user.id));
        console.log(`Assigned user ${user.email} to company ${company.name}`);
      }
    }

    const contactsToUpdate = await db.select().from(schema.contacts).where(isNull(schema.contacts.companyId));
    if (contactsToUpdate.length > 0) {
      for (const contact of contactsToUpdate) {
        await db.update(schema.contacts)
          .set({ companyId: company.id })
          .where(eq(schema.contacts.id, contact.id));
      }
      console.log(`Updated ${contactsToUpdate.length} contacts`);
    }

    const messagesToUpdate = await db.select().from(schema.messages).where(isNull(schema.messages.companyId));
    if (messagesToUpdate.length > 0) {
      for (const message of messagesToUpdate) {
        await db.update(schema.messages)
          .set({ companyId: company.id })
          .where(eq(schema.messages.id, message.id));
      }
      console.log(`Updated ${messagesToUpdate.length} messages`);
    }

    const productsToUpdate = await db.select().from(schema.products).where(isNull(schema.products.companyId));
    if (productsToUpdate.length > 0) {
      for (const product of productsToUpdate) {
        await db.update(schema.products)
          .set({ companyId: company.id })
          .where(eq(schema.products.id, product.id));
      }
      console.log(`Updated ${productsToUpdate.length} products`);
    }

    const ordersToUpdate = await db.select().from(schema.orders).where(isNull(schema.orders.companyId));
    if (ordersToUpdate.length > 0) {
      for (const order of ordersToUpdate) {
        await db.update(schema.orders)
          .set({ companyId: company.id })
          .where(eq(schema.orders.id, order.id));
      }
      console.log(`Updated ${ordersToUpdate.length} orders`);
    }

    const ingredientsToUpdate = await db.select().from(schema.ingredients).where(isNull(schema.ingredients.companyId));
    if (ingredientsToUpdate.length > 0) {
      for (const ingredient of ingredientsToUpdate) {
        await db.update(schema.ingredients)
          .set({ companyId: company.id })
          .where(eq(schema.ingredients.id, ingredient.id));
      }
      console.log(`Updated ${ingredientsToUpdate.length} ingredients`);
    }

    const recipesToUpdate = await db.select().from(schema.recipes).where(isNull(schema.recipes.companyId));
    if (recipesToUpdate.length > 0) {
      for (const recipe of recipesToUpdate) {
        await db.update(schema.recipes)
          .set({ companyId: company.id })
          .where(eq(schema.recipes.id, recipe.id));
      }
      console.log(`Updated ${recipesToUpdate.length} recipes`);
    }

    const orderItemsToUpdate = await db.select().from(schema.orderItems).where(isNull(schema.orderItems.companyId));
    if (orderItemsToUpdate.length > 0) {
      for (const item of orderItemsToUpdate) {
        await db.update(schema.orderItems)
          .set({ companyId: company.id })
          .where(eq(schema.orderItems.id, item.id));
      }
      console.log(`Updated ${orderItemsToUpdate.length} order items`);
    }

    const recipeItemsToUpdate = await db.select().from(schema.recipeItems).where(isNull(schema.recipeItems.companyId));
    if (recipeItemsToUpdate.length > 0) {
      for (const item of recipeItemsToUpdate) {
        await db.update(schema.recipeItems)
          .set({ companyId: company.id })
          .where(eq(schema.recipeItems.id, item.id));
      }
      console.log(`Updated ${recipeItemsToUpdate.length} recipe items`);
    }

    const recipeComponentsToUpdate = await db.select().from(schema.productRecipeComponents).where(isNull(schema.productRecipeComponents.companyId));
    if (recipeComponentsToUpdate.length > 0) {
      for (const comp of recipeComponentsToUpdate) {
        await db.update(schema.productRecipeComponents)
          .set({ companyId: company.id })
          .where(eq(schema.productRecipeComponents.id, comp.id));
      }
      console.log(`Updated ${recipeComponentsToUpdate.length} product recipe components`);
    }

    const packagingComponentsToUpdate = await db.select().from(schema.productPackagingComponents).where(isNull(schema.productPackagingComponents.companyId));
    if (packagingComponentsToUpdate.length > 0) {
      for (const comp of packagingComponentsToUpdate) {
        await db.update(schema.productPackagingComponents)
          .set({ companyId: company.id })
          .where(eq(schema.productPackagingComponents.id, comp.id));
      }
      console.log(`Updated ${packagingComponentsToUpdate.length} product packaging components`);
    }

    console.log("\nMigration completed successfully!");
    console.log(`All data has been assigned to company: ${company.name} (ID: ${company.id})`);
    
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateToMultitenant().catch(console.error);
