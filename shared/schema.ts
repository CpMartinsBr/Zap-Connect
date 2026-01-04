import { sql } from "drizzle-orm";
import { pgTable, text, integer, serial, timestamp, numeric, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============ COMPANIES (Multi-tenant) ============
export type PlanType = "free" | "starter" | "professional" | "enterprise";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

// ============ AUTH (Replit Auth) ============
// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  companyId: integer("company_id").references(() => companies.id),
  role: text("role").default("member"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type UserWithCompany = User & {
  company?: Company | null;
};

// ============ COMPANY MEMBERSHIPS (Multi-tenant roles) ============
export type MemberRole = "admin" | "manager" | "member" | "viewer";

export const companyMemberships = pgTable("company_memberships", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  isDefault: integer("is_default").notNull().default(0),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertMembershipSchema = createInsertSchema(companyMemberships).omit({
  id: true,
  joinedAt: true,
});

export type CompanyMembership = typeof companyMemberships.$inferSelect;
export type InsertMembership = z.infer<typeof insertMembershipSchema>;

export type MembershipWithCompany = CompanyMembership & {
  company: Company;
};

export type MembershipWithUser = CompanyMembership & {
  user: User;
};

// ============ COMPANY INVITATIONS ============
export const companyInvitations = pgTable("company_invitations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  invitedBy: varchar("invited_by").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvitationSchema = createInsertSchema(companyInvitations).omit({
  id: true,
  createdAt: true,
  token: true,
  status: true,
});

export type CompanyInvitation = typeof companyInvitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

// ============ CONTACTS ============
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  avatar: text("avatar"),
  email: text("email"),
  company: text("company"),
  addresses: text("addresses").array().notNull().default(sql`ARRAY[]::text[]`),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateContactSchema = insertContactSchema.partial();

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type UpdateContact = z.infer<typeof updateContactSchema>;

export type ContactWithLastMessage = Contact & {
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
};

// ============ MESSAGES ============
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  senderId: integer("sender_id").notNull(),
  status: text("status").notNull().default("sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// ============ PRODUCTS (Inventory) ============
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("Produto"),
  unit: text("unit").notNull().default("un"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  cost: numeric("cost", { precision: 10, scale: 2 }).default("0"),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").default(5),
  image: text("image"),
  active: integer("active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateProductSchema = insertProductSchema.partial();

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;

// ============ ORDERS ============
export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  status: text("status").notNull().default("pending"),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  deliveryDate: timestamp("delivery_date"),
  deliveryTime: text("delivery_time"),
  deliveryAddress: text("delivery_address"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  paymentMethod: text("payment_method").default("dinheiro"),
  isPaid: integer("is_paid").notNull().default(0),
  notes: text("notes"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderDate: true,
  createdAt: true,
  updatedAt: true,
});
export const updateOrderSchema = insertOrderSchema.partial();

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type UpdateOrder = z.infer<typeof updateOrderSchema>;

// ============ ORDER ITEMS ============
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

// ============ EXTENDED TYPES ============
export type OrderWithItems = Order & {
  items: (OrderItem & { product: Product })[];
  contact: Contact;
};

export type ProductCategory = "Bolo" | "Doce" | "Salgado" | "Bebida" | "Ingrediente" | "Produto";

// ============ INGREDIENTS ============
export type IngredientKind = "ingredient" | "packaging";

export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("ingredient"),
  unit: text("unit").notNull().default("g"),
  costPerUnit: numeric("cost_per_unit", { precision: 10, scale: 4 }).notNull().default("0"),
  stock: numeric("stock", { precision: 10, scale: 2 }).default("0"),
  minStock: numeric("min_stock", { precision: 10, scale: 2 }).default("100"),
  supplier: text("supplier"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIngredientSchema = createInsertSchema(ingredients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateIngredientSchema = insertIngredientSchema.partial();

export type Ingredient = typeof ingredients.$inferSelect;
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type UpdateIngredient = z.infer<typeof updateIngredientSchema>;

// ============ RECIPES ============
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  yield: integer("yield").default(1),
  yieldUnit: text("yield_unit").default("un"),
  instructions: text("instructions"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateRecipeSchema = insertRecipeSchema.partial();

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type UpdateRecipe = z.infer<typeof updateRecipeSchema>;

// ============ RECIPE ITEMS (Ingredients in Recipes) ============
export const recipeItems = pgTable("recipe_items", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 10, scale: 4 }).notNull(),
});

export const insertRecipeItemSchema = createInsertSchema(recipeItems).omit({
  id: true,
});

export type RecipeItem = typeof recipeItems.$inferSelect;
export type InsertRecipeItem = z.infer<typeof insertRecipeItemSchema>;

// ============ EXTENDED RECIPE TYPES ============
export type RecipeWithItems = Recipe & {
  items: (RecipeItem & { ingredient: Ingredient })[];
  product?: Product | null;
  totalCost: number;
  costPerUnit: number;
};

// ============ PRODUCT RECIPE COMPONENTS ============
export const productRecipeComponents = pgTable("product_recipe_components", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
});

export const insertProductRecipeComponentSchema = createInsertSchema(productRecipeComponents).omit({
  id: true,
});

export type ProductRecipeComponent = typeof productRecipeComponents.$inferSelect;
export type InsertProductRecipeComponent = z.infer<typeof insertProductRecipeComponentSchema>;

// ============ PRODUCT PACKAGING COMPONENTS ============
export const productPackagingComponents = pgTable("product_packaging_components", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
});

export const insertProductPackagingComponentSchema = createInsertSchema(productPackagingComponents).omit({
  id: true,
});

export type ProductPackagingComponent = typeof productPackagingComponents.$inferSelect;
export type InsertProductPackagingComponent = z.infer<typeof insertProductPackagingComponentSchema>;

// ============ EXTENDED PRODUCT TYPES ============
export type ProductWithComponents = Product & {
  recipeComponents: (ProductRecipeComponent & { recipe: RecipeWithItems })[];
  packagingComponents: (ProductPackagingComponent & { ingredient: Ingredient })[];
  calculatedCost: number;
};
