import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, desc, sql, asc } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  Contact,
  InsertContact,
  UpdateContact,
  Message,
  InsertMessage,
  ContactWithLastMessage,
  Product,
  InsertProduct,
  UpdateProduct,
  Order,
  InsertOrder,
  UpdateOrder,
  OrderItem,
  InsertOrderItem,
  OrderWithItems,
  Ingredient,
  InsertIngredient,
  UpdateIngredient,
  Recipe,
  InsertRecipe,
  UpdateRecipe,
  RecipeItem,
  InsertRecipeItem,
  RecipeWithItems,
} from "@shared/schema";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

export interface IStorage {
  // Contacts
  getAllContacts(): Promise<ContactWithLastMessage[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, updates: UpdateContact): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<void>;

  // Messages
  getMessagesByContact(contactId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Products
  getAllProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: UpdateProduct): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;
  updateStock(id: number, quantity: number): Promise<Product | undefined>;

  // Orders
  getAllOrders(): Promise<OrderWithItems[]>;
  getOrder(id: number): Promise<OrderWithItems | undefined>;
  getOrdersByContact(contactId: number): Promise<OrderWithItems[]>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrder(id: number, updates: UpdateOrder): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<void>;

  // Ingredients
  getAllIngredients(): Promise<Ingredient[]>;
  getIngredient(id: number): Promise<Ingredient | undefined>;
  createIngredient(ingredient: InsertIngredient): Promise<Ingredient>;
  updateIngredient(id: number, updates: UpdateIngredient): Promise<Ingredient | undefined>;
  deleteIngredient(id: number): Promise<void>;

  // Recipes
  getAllRecipes(): Promise<RecipeWithItems[]>;
  getRecipe(id: number): Promise<RecipeWithItems | undefined>;
  getRecipeByProduct(productId: number): Promise<RecipeWithItems | undefined>;
  createRecipe(recipe: InsertRecipe, items: InsertRecipeItem[]): Promise<Recipe>;
  updateRecipe(id: number, updates: UpdateRecipe, items?: InsertRecipeItem[]): Promise<Recipe | undefined>;
  deleteRecipe(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ============ CONTACTS ============
  async getAllContacts(): Promise<ContactWithLastMessage[]> {
    const allContacts = await db
      .select()
      .from(schema.contacts)
      .orderBy(desc(schema.contacts.updatedAt));

    const contactsWithMessages = await Promise.all(
      allContacts.map(async (contact) => {
        const lastMessages = await db
          .select()
          .from(schema.messages)
          .where(eq(schema.messages.contactId, contact.id))
          .orderBy(desc(schema.messages.createdAt))
          .limit(1);

        const lastMessage = lastMessages[0];
        
        const unreadMessages = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.messages)
          .where(
            sql`${schema.messages.contactId} = ${contact.id} AND ${schema.messages.senderId} != 0 AND ${schema.messages.status} != 'read'`
          );

        return {
          ...contact,
          lastMessage: lastMessage?.content,
          lastMessageTime: lastMessage
            ? new Date(lastMessage.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : undefined,
          unreadCount: unreadMessages[0]?.count || 0,
        };
      })
    );

    return contactsWithMessages;
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const results = await db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.id, id))
      .limit(1);
    return results[0];
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const results = await db
      .insert(schema.contacts)
      .values(contact)
      .returning();
    return results[0];
  }

  async updateContact(
    id: number,
    updates: UpdateContact
  ): Promise<Contact | undefined> {
    const results = await db
      .update(schema.contacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.contacts.id, id))
      .returning();
    return results[0];
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(schema.contacts).where(eq(schema.contacts.id, id));
  }

  // ============ MESSAGES ============
  async getMessagesByContact(contactId: number): Promise<Message[]> {
    return await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.contactId, contactId))
      .orderBy(schema.messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const results = await db
      .insert(schema.messages)
      .values(message)
      .returning();
    
    await db
      .update(schema.contacts)
      .set({ updatedAt: new Date() })
      .where(eq(schema.contacts.id, message.contactId));

    return results[0];
  }

  // ============ PRODUCTS ============
  async getAllProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(schema.products)
      .orderBy(asc(schema.products.name));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const results = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, id))
      .limit(1);
    return results[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const results = await db
      .insert(schema.products)
      .values(product)
      .returning();
    return results[0];
  }

  async updateProduct(
    id: number,
    updates: UpdateProduct
  ): Promise<Product | undefined> {
    const results = await db
      .update(schema.products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.products.id, id))
      .returning();
    return results[0];
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(schema.products).where(eq(schema.products.id, id));
  }

  async updateStock(id: number, quantity: number): Promise<Product | undefined> {
    const results = await db
      .update(schema.products)
      .set({ 
        stock: sql`${schema.products.stock} + ${quantity}`,
        updatedAt: new Date() 
      })
      .where(eq(schema.products.id, id))
      .returning();
    return results[0];
  }

  // ============ ORDERS ============
  async getAllOrders(): Promise<OrderWithItems[]> {
    const allOrders = await db
      .select()
      .from(schema.orders)
      .orderBy(desc(schema.orders.createdAt));

    return await Promise.all(
      allOrders.map(async (order) => this.enrichOrder(order))
    );
  }

  async getOrder(id: number): Promise<OrderWithItems | undefined> {
    const results = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id))
      .limit(1);
    
    if (!results[0]) return undefined;
    return this.enrichOrder(results[0]);
  }

  async getOrdersByContact(contactId: number): Promise<OrderWithItems[]> {
    const orders = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.contactId, contactId))
      .orderBy(desc(schema.orders.createdAt));

    return await Promise.all(
      orders.map(async (order) => this.enrichOrder(order))
    );
  }

  private async enrichOrder(order: Order): Promise<OrderWithItems> {
    const items = await db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id));

    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        const product = await this.getProduct(item.productId);
        return { ...item, product: product! };
      })
    );

    const contact = await this.getContact(order.contactId);

    return {
      ...order,
      items: itemsWithProducts,
      contact: contact!,
    };
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const [newOrder] = await db
      .insert(schema.orders)
      .values(order)
      .returning();

    for (const item of items) {
      await db.insert(schema.orderItems).values({
        ...item,
        orderId: newOrder.id,
      });
      
      // Decrease stock
      await this.updateStock(item.productId, -(item.quantity || 1));
    }

    return newOrder;
  }

  async updateOrder(
    id: number,
    updates: UpdateOrder
  ): Promise<Order | undefined> {
    const results = await db
      .update(schema.orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.orders.id, id))
      .returning();
    return results[0];
  }

  async deleteOrder(id: number): Promise<void> {
    // Get items to restore stock
    const items = await db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, id));

    for (const item of items) {
      await this.updateStock(item.productId, item.quantity);
    }

    await db.delete(schema.orders).where(eq(schema.orders.id, id));
  }

  // ============ INGREDIENTS ============
  async getAllIngredients(): Promise<Ingredient[]> {
    return await db
      .select()
      .from(schema.ingredients)
      .orderBy(asc(schema.ingredients.name));
  }

  async getIngredient(id: number): Promise<Ingredient | undefined> {
    const results = await db
      .select()
      .from(schema.ingredients)
      .where(eq(schema.ingredients.id, id))
      .limit(1);
    return results[0];
  }

  async createIngredient(ingredient: InsertIngredient): Promise<Ingredient> {
    const results = await db
      .insert(schema.ingredients)
      .values(ingredient)
      .returning();
    return results[0];
  }

  async updateIngredient(
    id: number,
    updates: UpdateIngredient
  ): Promise<Ingredient | undefined> {
    const results = await db
      .update(schema.ingredients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.ingredients.id, id))
      .returning();
    return results[0];
  }

  async deleteIngredient(id: number): Promise<void> {
    await db.delete(schema.ingredients).where(eq(schema.ingredients.id, id));
  }

  // ============ RECIPES ============
  async getAllRecipes(): Promise<RecipeWithItems[]> {
    const allRecipes = await db
      .select()
      .from(schema.recipes)
      .orderBy(asc(schema.recipes.name));

    return await Promise.all(
      allRecipes.map(async (recipe) => this.enrichRecipe(recipe))
    );
  }

  async getRecipe(id: number): Promise<RecipeWithItems | undefined> {
    const results = await db
      .select()
      .from(schema.recipes)
      .where(eq(schema.recipes.id, id))
      .limit(1);
    
    if (!results[0]) return undefined;
    return this.enrichRecipe(results[0]);
  }

  async getRecipeByProduct(productId: number): Promise<RecipeWithItems | undefined> {
    const results = await db
      .select()
      .from(schema.recipes)
      .where(eq(schema.recipes.productId, productId))
      .limit(1);
    
    if (!results[0]) return undefined;
    return this.enrichRecipe(results[0]);
  }

  private async enrichRecipe(recipe: Recipe): Promise<RecipeWithItems> {
    const items = await db
      .select()
      .from(schema.recipeItems)
      .where(eq(schema.recipeItems.recipeId, recipe.id));

    const itemsWithIngredients = await Promise.all(
      items.map(async (item) => {
        const ingredient = await this.getIngredient(item.ingredientId);
        return { ...item, ingredient: ingredient! };
      })
    );

    const product = await this.getProduct(recipe.productId);
    
    // Calculate total cost
    let totalCost = 0;
    for (const item of itemsWithIngredients) {
      if (item.ingredient) {
        const ingredientCost = parseFloat(item.ingredient.costPerUnit || "0");
        const quantity = parseFloat(item.quantity || "0");
        totalCost += ingredientCost * quantity;
      }
    }
    
    const yieldQty = recipe.yield || 1;
    const costPerUnit = totalCost / yieldQty;

    return {
      ...recipe,
      items: itemsWithIngredients,
      product: product!,
      totalCost,
      costPerUnit,
    };
  }

  async createRecipe(recipe: InsertRecipe, items: InsertRecipeItem[]): Promise<Recipe> {
    const [newRecipe] = await db
      .insert(schema.recipes)
      .values(recipe)
      .returning();

    for (const item of items) {
      await db.insert(schema.recipeItems).values({
        ...item,
        recipeId: newRecipe.id,
      });
    }

    return newRecipe;
  }

  async updateRecipe(
    id: number,
    updates: UpdateRecipe,
    items?: InsertRecipeItem[]
  ): Promise<Recipe | undefined> {
    const results = await db
      .update(schema.recipes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.recipes.id, id))
      .returning();

    if (results[0] && items) {
      // Delete existing items and insert new ones
      await db.delete(schema.recipeItems).where(eq(schema.recipeItems.recipeId, id));
      
      for (const item of items) {
        await db.insert(schema.recipeItems).values({
          ...item,
          recipeId: id,
        });
      }
    }

    return results[0];
  }

  async deleteRecipe(id: number): Promise<void> {
    await db.delete(schema.recipes).where(eq(schema.recipes.id, id));
  }
}

export const storage = new DatabaseStorage();
