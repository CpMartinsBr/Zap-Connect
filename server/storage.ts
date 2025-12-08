import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, desc, sql, asc } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  User,
  UpsertUser,
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
  ProductRecipeComponent,
  InsertProductRecipeComponent,
  ProductPackagingComponent,
  InsertProductPackagingComponent,
  ProductWithComponents,
} from "@shared/schema";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

export interface IStorage {
  // Users (Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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
  createProductFromRecipe(recipeId: number): Promise<Product>;

  // Product Components
  getProductWithComponents(id: number): Promise<ProductWithComponents | undefined>;
  getAllProductsWithComponents(): Promise<ProductWithComponents[]>;
  setProductComponents(
    productId: number,
    recipeComponents: Omit<InsertProductRecipeComponent, 'productId'>[],
    packagingComponents: Omit<InsertProductPackagingComponent, 'productId'>[]
  ): Promise<void>;
  calculateProductCost(productId: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // ============ USERS (Replit Auth) ============
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(schema.users)
      .values(userData)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

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

    const product = recipe.productId ? await this.getProduct(recipe.productId) : null;
    
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
      product: product,
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

  async createProductFromRecipe(recipeId: number): Promise<Product> {
    const recipe = await this.getRecipe(recipeId);
    if (!recipe) {
      throw new Error("Receita não encontrada");
    }

    if (recipe.productId) {
      throw new Error("Esta receita já está vinculada a um produto");
    }

    const newProduct = await this.createProduct({
      name: recipe.name,
      description: `Produto criado a partir da receita: ${recipe.name}`,
      category: "Produto",
      unit: recipe.yieldUnit || "un",
      price: "0",
      cost: recipe.costPerUnit.toFixed(2),
      stock: 0,
      minStock: 5,
      active: 1,
    });

    await db
      .update(schema.recipes)
      .set({ productId: newProduct.id, updatedAt: new Date() })
      .where(eq(schema.recipes.id, recipeId));

    return newProduct;
  }

  // ============ PRODUCT COMPONENTS ============
  async getProductWithComponents(id: number): Promise<ProductWithComponents | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;

    return this.enrichProductWithComponents(product);
  }

  async getAllProductsWithComponents(): Promise<ProductWithComponents[]> {
    const products = await this.getAllProducts();
    return await Promise.all(
      products.map(async (product) => this.enrichProductWithComponents(product))
    );
  }

  private async enrichProductWithComponents(product: Product): Promise<ProductWithComponents> {
    const recipeComponents = await db
      .select()
      .from(schema.productRecipeComponents)
      .where(eq(schema.productRecipeComponents.productId, product.id));

    const packagingComponents = await db
      .select()
      .from(schema.productPackagingComponents)
      .where(eq(schema.productPackagingComponents.productId, product.id));

    const enrichedRecipeComponents = await Promise.all(
      recipeComponents.map(async (comp) => {
        const recipe = await this.getRecipe(comp.recipeId);
        return { ...comp, recipe: recipe! };
      })
    );

    const enrichedPackagingComponents = await Promise.all(
      packagingComponents.map(async (comp) => {
        const ingredient = await this.getIngredient(comp.ingredientId);
        return { ...comp, ingredient: ingredient! };
      })
    );

    const calculatedCost = await this.calculateProductCost(product.id);

    return {
      ...product,
      recipeComponents: enrichedRecipeComponents,
      packagingComponents: enrichedPackagingComponents,
      calculatedCost,
    };
  }

  async setProductComponents(
    productId: number,
    recipeComponents: Omit<InsertProductRecipeComponent, 'productId'>[],
    packagingComponents: Omit<InsertProductPackagingComponent, 'productId'>[]
  ): Promise<void> {
    await db.delete(schema.productRecipeComponents).where(eq(schema.productRecipeComponents.productId, productId));
    await db.delete(schema.productPackagingComponents).where(eq(schema.productPackagingComponents.productId, productId));

    for (const comp of recipeComponents) {
      await db.insert(schema.productRecipeComponents).values({
        ...comp,
        productId,
      });
    }

    for (const comp of packagingComponents) {
      await db.insert(schema.productPackagingComponents).values({
        ...comp,
        productId,
      });
    }

    const calculatedCost = await this.calculateProductCost(productId);
    await db
      .update(schema.products)
      .set({ cost: calculatedCost.toFixed(2), updatedAt: new Date() })
      .where(eq(schema.products.id, productId));
  }

  async calculateProductCost(productId: number): Promise<number> {
    let totalCost = 0;

    const recipeComponents = await db
      .select()
      .from(schema.productRecipeComponents)
      .where(eq(schema.productRecipeComponents.productId, productId));

    for (const comp of recipeComponents) {
      const recipe = await this.getRecipe(comp.recipeId);
      if (recipe) {
        const quantity = parseFloat(comp.quantity || "1");
        totalCost += recipe.costPerUnit * quantity;
      }
    }

    const packagingComponents = await db
      .select()
      .from(schema.productPackagingComponents)
      .where(eq(schema.productPackagingComponents.productId, productId));

    for (const comp of packagingComponents) {
      const ingredient = await this.getIngredient(comp.ingredientId);
      if (ingredient) {
        const quantity = parseFloat(comp.quantity || "1");
        const costPerUnit = parseFloat(ingredient.costPerUnit || "0");
        totalCost += costPerUnit * quantity;
      }
    }

    return totalCost;
  }
}

export const storage = new DatabaseStorage();
