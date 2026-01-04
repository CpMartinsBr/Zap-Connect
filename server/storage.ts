import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, desc, sql, asc, and } from "drizzle-orm";
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
  Company,
  InsertCompany,
  CompanyMembership,
  InsertMembership,
  MembershipWithCompany,
  MembershipWithUser,
  CompanyInvitation,
  InsertInvitation,
} from "@shared/schema";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

export interface IRootStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyBySlug(slug: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  assignUserToCompany(userId: string, companyId: number): Promise<User | undefined>;
  
  getUserMemberships(userId: string): Promise<MembershipWithCompany[]>;
  getMembership(userId: string, companyId: number): Promise<CompanyMembership | undefined>;
  getMembershipById(id: number): Promise<CompanyMembership | undefined>;
  createMembership(membership: InsertMembership): Promise<CompanyMembership>;
  updateMembershipRole(id: number, role: string): Promise<CompanyMembership | undefined>;
  deleteMembership(id: number): Promise<void>;
  getCompanyMembers(companyId: number): Promise<MembershipWithUser[]>;
  
  createInvitation(invitation: InsertInvitation, token: string): Promise<CompanyInvitation>;
  getInvitationByToken(token: string): Promise<CompanyInvitation | undefined>;
  getInvitationsByEmail(email: string): Promise<CompanyInvitation[]>;
  getCompanyInvitations(companyId: number): Promise<CompanyInvitation[]>;
  updateInvitationStatus(id: number, status: string): Promise<CompanyInvitation | undefined>;
  
  isSuperAdmin(email: string): boolean;
  
  forTenant(companyId: number): ITenantStorage;
}

export interface ITenantStorage {
  readonly companyId: number;

  getAllContacts(): Promise<ContactWithLastMessage[]>;
  getContact(id: number): Promise<Contact | undefined>;
  getContactByPhone(phone: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, updates: UpdateContact): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<void>;

  getMessagesByContact(contactId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  getAllProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: UpdateProduct): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;
  updateStock(id: number, quantity: number): Promise<Product | undefined>;

  getAllOrders(): Promise<OrderWithItems[]>;
  getOrder(id: number): Promise<OrderWithItems | undefined>;
  getOrdersByContact(contactId: number): Promise<OrderWithItems[]>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrder(id: number, updates: UpdateOrder): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<void>;

  getAllIngredients(): Promise<Ingredient[]>;
  getIngredient(id: number): Promise<Ingredient | undefined>;
  createIngredient(ingredient: InsertIngredient): Promise<Ingredient>;
  updateIngredient(id: number, updates: UpdateIngredient): Promise<Ingredient | undefined>;
  deleteIngredient(id: number): Promise<void>;

  getAllRecipes(): Promise<RecipeWithItems[]>;
  getRecipe(id: number): Promise<RecipeWithItems | undefined>;
  getRecipeByProduct(productId: number): Promise<RecipeWithItems | undefined>;
  createRecipe(recipe: InsertRecipe, items: InsertRecipeItem[]): Promise<Recipe>;
  updateRecipe(id: number, updates: UpdateRecipe, items?: InsertRecipeItem[]): Promise<Recipe | undefined>;
  deleteRecipe(id: number): Promise<void>;
  createProductFromRecipe(recipeId: number): Promise<Product>;

  getProductWithComponents(id: number): Promise<ProductWithComponents | undefined>;
  getAllProductsWithComponents(): Promise<ProductWithComponents[]>;
  setProductComponents(
    productId: number,
    recipeComponents: Omit<InsertProductRecipeComponent, 'productId'>[],
    packagingComponents: Omit<InsertProductPackagingComponent, 'productId'>[]
  ): Promise<void>;
  calculateProductCost(productId: number): Promise<number>;
}

class TenantStorage implements ITenantStorage {
  constructor(public readonly companyId: number) {}

  async getAllContacts(): Promise<ContactWithLastMessage[]> {
    const allContacts = await db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.companyId, this.companyId))
      .orderBy(desc(schema.contacts.updatedAt));

    const contactsWithMessages = await Promise.all(
      allContacts.map(async (contact) => {
        const lastMessages = await db
          .select()
          .from(schema.messages)
          .where(and(
            eq(schema.messages.contactId, contact.id),
            eq(schema.messages.companyId, this.companyId)
          ))
          .orderBy(desc(schema.messages.createdAt))
          .limit(1);

        const lastMessage = lastMessages[0];
        
        const unreadMessages = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.messages)
          .where(
            sql`${schema.messages.contactId} = ${contact.id} AND ${schema.messages.companyId} = ${this.companyId} AND ${schema.messages.senderId} != 0 AND ${schema.messages.status} != 'read'`
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
      .where(and(
        eq(schema.contacts.id, id),
        eq(schema.contacts.companyId, this.companyId)
      ))
      .limit(1);
    return results[0];
  }

  async getContactByPhone(phone: string): Promise<Contact | undefined> {
    const normalizedPhone = phone.replace(/\D/g, "");
    const results = await db
      .select()
      .from(schema.contacts)
      .where(and(
        sql`REGEXP_REPLACE(${schema.contacts.phone}, '[^0-9]', '', 'g') = ${normalizedPhone}`,
        eq(schema.contacts.companyId, this.companyId)
      ))
      .limit(1);
    return results[0];
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const results = await db
      .insert(schema.contacts)
      .values({ ...contact, companyId: this.companyId })
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
      .where(and(
        eq(schema.contacts.id, id),
        eq(schema.contacts.companyId, this.companyId)
      ))
      .returning();
    return results[0];
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(schema.contacts).where(and(
      eq(schema.contacts.id, id),
      eq(schema.contacts.companyId, this.companyId)
    ));
  }

  async getMessagesByContact(contactId: number): Promise<Message[]> {
    const contact = await this.getContact(contactId);
    if (!contact) return [];
    
    return await db
      .select()
      .from(schema.messages)
      .where(and(
        eq(schema.messages.contactId, contactId),
        eq(schema.messages.companyId, this.companyId)
      ))
      .orderBy(schema.messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const contact = await this.getContact(message.contactId);
    if (!contact) {
      throw new Error("Contact not found or access denied");
    }
    
    const results = await db
      .insert(schema.messages)
      .values({ ...message, companyId: this.companyId })
      .returning();
    
    await db
      .update(schema.contacts)
      .set({ updatedAt: new Date() })
      .where(and(
        eq(schema.contacts.id, message.contactId),
        eq(schema.contacts.companyId, this.companyId)
      ));

    return results[0];
  }

  async getAllProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.companyId, this.companyId))
      .orderBy(asc(schema.products.name));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const results = await db
      .select()
      .from(schema.products)
      .where(and(
        eq(schema.products.id, id),
        eq(schema.products.companyId, this.companyId)
      ))
      .limit(1);
    return results[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const results = await db
      .insert(schema.products)
      .values({ ...product, companyId: this.companyId })
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
      .where(and(
        eq(schema.products.id, id),
        eq(schema.products.companyId, this.companyId)
      ))
      .returning();
    return results[0];
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(schema.products).where(and(
      eq(schema.products.id, id),
      eq(schema.products.companyId, this.companyId)
    ));
  }

  async updateStock(id: number, quantity: number): Promise<Product | undefined> {
    const results = await db
      .update(schema.products)
      .set({ 
        stock: sql`${schema.products.stock} + ${quantity}`,
        updatedAt: new Date() 
      })
      .where(and(
        eq(schema.products.id, id),
        eq(schema.products.companyId, this.companyId)
      ))
      .returning();
    return results[0];
  }

  async getAllOrders(): Promise<OrderWithItems[]> {
    const allOrders = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.companyId, this.companyId))
      .orderBy(desc(schema.orders.createdAt));

    return await Promise.all(
      allOrders.map(async (order) => this.enrichOrder(order))
    );
  }

  async getOrder(id: number): Promise<OrderWithItems | undefined> {
    const results = await db
      .select()
      .from(schema.orders)
      .where(and(
        eq(schema.orders.id, id),
        eq(schema.orders.companyId, this.companyId)
      ))
      .limit(1);
    
    if (!results[0]) return undefined;
    return this.enrichOrder(results[0]);
  }

  async getOrdersByContact(contactId: number): Promise<OrderWithItems[]> {
    const contact = await this.getContact(contactId);
    if (!contact) return [];
    
    const orders = await db
      .select()
      .from(schema.orders)
      .where(and(
        eq(schema.orders.contactId, contactId),
        eq(schema.orders.companyId, this.companyId)
      ))
      .orderBy(desc(schema.orders.createdAt));

    return await Promise.all(
      orders.map(async (order) => this.enrichOrder(order))
    );
  }

  private async enrichOrder(order: Order): Promise<OrderWithItems> {
    const items = await db
      .select()
      .from(schema.orderItems)
      .where(and(
        eq(schema.orderItems.orderId, order.id),
        eq(schema.orderItems.companyId, this.companyId)
      ));

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
    const contact = await this.getContact(order.contactId);
    if (!contact) {
      throw new Error("Contact not found or access denied");
    }
    
    const [newOrder] = await db
      .insert(schema.orders)
      .values({ ...order, companyId: this.companyId })
      .returning();

    for (const item of items) {
      const product = await this.getProduct(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found or access denied`);
      }
      
      await db.insert(schema.orderItems).values({
        ...item,
        orderId: newOrder.id,
        companyId: this.companyId,
      });
      
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
      .where(and(
        eq(schema.orders.id, id),
        eq(schema.orders.companyId, this.companyId)
      ))
      .returning();
    return results[0];
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.getOrder(id);
    if (!order) return;

    const items = await db
      .select()
      .from(schema.orderItems)
      .where(and(
        eq(schema.orderItems.orderId, id),
        eq(schema.orderItems.companyId, this.companyId)
      ));

    for (const item of items) {
      await this.updateStock(item.productId, item.quantity);
    }

    await db.delete(schema.orders).where(and(
      eq(schema.orders.id, id),
      eq(schema.orders.companyId, this.companyId)
    ));
  }

  async getAllIngredients(): Promise<Ingredient[]> {
    return await db
      .select()
      .from(schema.ingredients)
      .where(eq(schema.ingredients.companyId, this.companyId))
      .orderBy(asc(schema.ingredients.name));
  }

  async getIngredient(id: number): Promise<Ingredient | undefined> {
    const results = await db
      .select()
      .from(schema.ingredients)
      .where(and(
        eq(schema.ingredients.id, id),
        eq(schema.ingredients.companyId, this.companyId)
      ))
      .limit(1);
    return results[0];
  }

  async createIngredient(ingredient: InsertIngredient): Promise<Ingredient> {
    const results = await db
      .insert(schema.ingredients)
      .values({ ...ingredient, companyId: this.companyId })
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
      .where(and(
        eq(schema.ingredients.id, id),
        eq(schema.ingredients.companyId, this.companyId)
      ))
      .returning();
    return results[0];
  }

  async deleteIngredient(id: number): Promise<void> {
    await db.delete(schema.ingredients).where(and(
      eq(schema.ingredients.id, id),
      eq(schema.ingredients.companyId, this.companyId)
    ));
  }

  async getAllRecipes(): Promise<RecipeWithItems[]> {
    const allRecipes = await db
      .select()
      .from(schema.recipes)
      .where(eq(schema.recipes.companyId, this.companyId))
      .orderBy(asc(schema.recipes.name));

    return await Promise.all(
      allRecipes.map(async (recipe) => this.enrichRecipe(recipe))
    );
  }

  async getRecipe(id: number): Promise<RecipeWithItems | undefined> {
    const results = await db
      .select()
      .from(schema.recipes)
      .where(and(
        eq(schema.recipes.id, id),
        eq(schema.recipes.companyId, this.companyId)
      ))
      .limit(1);
    
    if (!results[0]) return undefined;
    return this.enrichRecipe(results[0]);
  }

  async getRecipeByProduct(productId: number): Promise<RecipeWithItems | undefined> {
    const product = await this.getProduct(productId);
    if (!product) return undefined;
    
    const results = await db
      .select()
      .from(schema.recipes)
      .where(and(
        eq(schema.recipes.productId, productId),
        eq(schema.recipes.companyId, this.companyId)
      ))
      .limit(1);
    
    if (!results[0]) return undefined;
    return this.enrichRecipe(results[0]);
  }

  private async enrichRecipe(recipe: Recipe): Promise<RecipeWithItems> {
    const items = await db
      .select()
      .from(schema.recipeItems)
      .where(and(
        eq(schema.recipeItems.recipeId, recipe.id),
        eq(schema.recipeItems.companyId, this.companyId)
      ));

    const itemsWithIngredients = await Promise.all(
      items.map(async (item) => {
        const ingredient = await this.getIngredient(item.ingredientId);
        return { ...item, ingredient: ingredient! };
      })
    );

    const product = recipe.productId ? await this.getProduct(recipe.productId) : null;
    
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
    for (const item of items) {
      const ingredient = await this.getIngredient(item.ingredientId);
      if (!ingredient) {
        throw new Error(`Ingredient ${item.ingredientId} not found or access denied`);
      }
    }
    
    const [newRecipe] = await db
      .insert(schema.recipes)
      .values({ ...recipe, companyId: this.companyId })
      .returning();

    for (const item of items) {
      await db.insert(schema.recipeItems).values({
        ...item,
        recipeId: newRecipe.id,
        companyId: this.companyId,
      });
    }

    return newRecipe;
  }

  async updateRecipe(
    id: number,
    updates: UpdateRecipe,
    items?: InsertRecipeItem[]
  ): Promise<Recipe | undefined> {
    const existing = await this.getRecipe(id);
    if (!existing) return undefined;
    
    const results = await db
      .update(schema.recipes)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(schema.recipes.id, id),
        eq(schema.recipes.companyId, this.companyId)
      ))
      .returning();

    if (results[0] && items) {
      for (const item of items) {
        const ingredient = await this.getIngredient(item.ingredientId);
        if (!ingredient) {
          throw new Error(`Ingredient ${item.ingredientId} not found or access denied`);
        }
      }
      
      await db.delete(schema.recipeItems).where(and(
        eq(schema.recipeItems.recipeId, id),
        eq(schema.recipeItems.companyId, this.companyId)
      ));
      
      for (const item of items) {
        await db.insert(schema.recipeItems).values({
          ...item,
          recipeId: id,
          companyId: this.companyId,
        });
      }
    }

    return results[0];
  }

  async deleteRecipe(id: number): Promise<void> {
    await db.delete(schema.recipes).where(and(
      eq(schema.recipes.id, id),
      eq(schema.recipes.companyId, this.companyId)
    ));
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
      .where(and(
        eq(schema.recipes.id, recipeId),
        eq(schema.recipes.companyId, this.companyId)
      ));

    return newProduct;
  }

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
      .where(and(
        eq(schema.productRecipeComponents.productId, product.id),
        eq(schema.productRecipeComponents.companyId, this.companyId)
      ));

    const packagingComponents = await db
      .select()
      .from(schema.productPackagingComponents)
      .where(and(
        eq(schema.productPackagingComponents.productId, product.id),
        eq(schema.productPackagingComponents.companyId, this.companyId)
      ));

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
    const product = await this.getProduct(productId);
    if (!product) {
      throw new Error("Product not found or access denied");
    }
    
    for (const comp of recipeComponents) {
      const recipe = await this.getRecipe(comp.recipeId);
      if (!recipe) {
        throw new Error(`Recipe ${comp.recipeId} not found or access denied`);
      }
    }
    
    for (const comp of packagingComponents) {
      const ingredient = await this.getIngredient(comp.ingredientId);
      if (!ingredient) {
        throw new Error(`Ingredient ${comp.ingredientId} not found or access denied`);
      }
    }
    
    await db.delete(schema.productRecipeComponents).where(and(
      eq(schema.productRecipeComponents.productId, productId),
      eq(schema.productRecipeComponents.companyId, this.companyId)
    ));
    await db.delete(schema.productPackagingComponents).where(and(
      eq(schema.productPackagingComponents.productId, productId),
      eq(schema.productPackagingComponents.companyId, this.companyId)
    ));

    for (const comp of recipeComponents) {
      await db.insert(schema.productRecipeComponents).values({
        ...comp,
        productId,
        companyId: this.companyId,
      });
    }

    for (const comp of packagingComponents) {
      await db.insert(schema.productPackagingComponents).values({
        ...comp,
        productId,
        companyId: this.companyId,
      });
    }

    const calculatedCost = await this.calculateProductCost(productId);
    await db
      .update(schema.products)
      .set({ cost: calculatedCost.toFixed(2), updatedAt: new Date() })
      .where(and(
        eq(schema.products.id, productId),
        eq(schema.products.companyId, this.companyId)
      ));
  }

  async calculateProductCost(productId: number): Promise<number> {
    let totalCost = 0;

    const recipeComponents = await db
      .select()
      .from(schema.productRecipeComponents)
      .where(and(
        eq(schema.productRecipeComponents.productId, productId),
        eq(schema.productRecipeComponents.companyId, this.companyId)
      ));

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
      .where(and(
        eq(schema.productPackagingComponents.productId, productId),
        eq(schema.productPackagingComponents.companyId, this.companyId)
      ));

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

class RootStorage implements IRootStorage {
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

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(schema.companies)
      .where(eq(schema.companies.id, id));
    return company;
  }

  async getCompanyBySlug(slug: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(schema.companies)
      .where(eq(schema.companies.slug, slug));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db
      .insert(schema.companies)
      .values(company)
      .returning();
    return newCompany;
  }

  async assignUserToCompany(userId: string, companyId: number): Promise<User | undefined> {
    const [user] = await db
      .update(schema.users)
      .set({ companyId, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async getUserMemberships(userId: string): Promise<MembershipWithCompany[]> {
    const memberships = await db
      .select()
      .from(schema.companyMemberships)
      .innerJoin(schema.companies, eq(schema.companyMemberships.companyId, schema.companies.id))
      .where(eq(schema.companyMemberships.userId, userId));
    
    return memberships.map(m => ({
      ...m.company_memberships,
      company: m.companies,
    }));
  }

  async getMembership(userId: string, companyId: number): Promise<CompanyMembership | undefined> {
    const [membership] = await db
      .select()
      .from(schema.companyMemberships)
      .where(and(
        eq(schema.companyMemberships.userId, userId),
        eq(schema.companyMemberships.companyId, companyId)
      ));
    return membership;
  }

  async getMembershipById(id: number): Promise<CompanyMembership | undefined> {
    const [membership] = await db
      .select()
      .from(schema.companyMemberships)
      .where(eq(schema.companyMemberships.id, id));
    return membership;
  }

  async createMembership(membership: InsertMembership): Promise<CompanyMembership> {
    const [newMembership] = await db
      .insert(schema.companyMemberships)
      .values(membership)
      .returning();
    return newMembership;
  }

  async updateMembershipRole(id: number, role: string): Promise<CompanyMembership | undefined> {
    const [membership] = await db
      .update(schema.companyMemberships)
      .set({ role })
      .where(eq(schema.companyMemberships.id, id))
      .returning();
    return membership;
  }

  async deleteMembership(id: number): Promise<void> {
    await db.delete(schema.companyMemberships).where(eq(schema.companyMemberships.id, id));
  }

  async getCompanyMembers(companyId: number): Promise<MembershipWithUser[]> {
    const memberships = await db
      .select()
      .from(schema.companyMemberships)
      .innerJoin(schema.users, eq(schema.companyMemberships.userId, schema.users.id))
      .where(eq(schema.companyMemberships.companyId, companyId));
    
    return memberships.map(m => ({
      ...m.company_memberships,
      user: m.users,
    }));
  }

  async createInvitation(invitation: InsertInvitation, token: string): Promise<CompanyInvitation> {
    const [newInvitation] = await db
      .insert(schema.companyInvitations)
      .values({ ...invitation, token, status: "pending" })
      .returning();
    return newInvitation;
  }

  async getInvitationByToken(token: string): Promise<CompanyInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(schema.companyInvitations)
      .where(eq(schema.companyInvitations.token, token));
    return invitation;
  }

  async getInvitationsByEmail(email: string): Promise<CompanyInvitation[]> {
    return db
      .select()
      .from(schema.companyInvitations)
      .where(and(
        eq(schema.companyInvitations.email, email.toLowerCase()),
        eq(schema.companyInvitations.status, "pending")
      ));
  }

  async getCompanyInvitations(companyId: number): Promise<CompanyInvitation[]> {
    return db
      .select()
      .from(schema.companyInvitations)
      .where(eq(schema.companyInvitations.companyId, companyId));
  }

  async updateInvitationStatus(id: number, status: string): Promise<CompanyInvitation | undefined> {
    const [invitation] = await db
      .update(schema.companyInvitations)
      .set({ status })
      .where(eq(schema.companyInvitations.id, id))
      .returning();
    return invitation;
  }

  isSuperAdmin(email: string): boolean {
    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "cpmartins2012@gmail.com").split(",").map(e => e.trim().toLowerCase());
    return superAdminEmails.includes(email.toLowerCase());
  }

  forTenant(companyId: number): ITenantStorage {
    return new TenantStorage(companyId);
  }
}

export const storage = new RootStorage();
