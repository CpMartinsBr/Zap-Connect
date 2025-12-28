import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, type ITenantStorage } from "./storage";
import { setupAuth, isAuthenticated, withTenantContext, requireCompany, type TenantContext } from "./replitAuth";
import { 
  insertContactSchema, 
  updateContactSchema, 
  insertMessageSchema,
  insertProductSchema,
  updateProductSchema,
  insertOrderSchema,
  updateOrderSchema,
  insertOrderItemSchema,
  insertIngredientSchema,
  updateIngredientSchema,
  insertRecipeSchema,
  updateRecipeSchema,
  insertRecipeItemSchema,
  insertProductRecipeComponentSchema,
  insertProductPackagingComponentSchema,
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";

declare global {
  namespace Express {
    interface Request {
      tenantStorage?: ITenantStorage;
    }
  }
}

const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.tenant?.companyId) {
    req.tenantStorage = storage.forTenant(req.tenant.companyId);
  }
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user) {
        const allowedEmails = (process.env.ALLOWED_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
        const isAllowed = allowedEmails.length === 0 || allowedEmails.includes(user.email?.toLowerCase() || "");
        
        let company = null;
        if (user.companyId) {
          company = await storage.getCompany(user.companyId);
        }
        
        res.json({ ...user, isAllowed, company });
      } else {
        res.json(user);
      }
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/contacts", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated. Please contact admin." });
      }
      const contacts = await req.tenantStorage.getAllContacts();
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/contacts/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const contact = await req.tenantStorage.getContact(id);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/contacts", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await req.tenantStorage.createContact(validatedData);
      res.status(201).json(contact);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/contacts/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const validatedData = updateContactSchema.parse(req.body);
      const contact = await req.tenantStorage.updateContact(id, validatedData);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/contacts/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      await req.tenantStorage.deleteContact(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/contacts/:id/messages", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const contactId = parseInt(req.params.id);
      const messages = await req.tenantStorage.getMessagesByContact(contactId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/messages", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const validatedData = insertMessageSchema.parse(req.body);
      const message = await req.tenantStorage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const products = await req.tenantStorage.getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const product = await req.tenantStorage.getProduct(id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/products", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const validatedData = insertProductSchema.parse(req.body);
      const product = await req.tenantStorage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const validatedData = updateProductSchema.parse(req.body);
      const product = await req.tenantStorage.updateProduct(id, validatedData);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/products/:id/stock", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const { quantity } = z.object({ quantity: z.number() }).parse(req.body);
      const product = await req.tenantStorage.updateStock(id, quantity);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      await req.tenantStorage.deleteProduct(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products-with-components", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const products = await req.tenantStorage.getAllProductsWithComponents();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:id/components", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const product = await req.tenantStorage.getProductWithComponents(id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const setComponentsSchema = z.object({
    recipeComponents: z.array(z.object({
      recipeId: z.number(),
      quantity: z.string().or(z.number()).transform(v => String(v)),
    })),
    packagingComponents: z.array(z.object({
      ingredientId: z.number(),
      quantity: z.string().or(z.number()).transform(v => String(v)),
    })),
  });

  app.put("/api/products/:id/components", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const { recipeComponents, packagingComponents } = setComponentsSchema.parse(req.body);
      
      await req.tenantStorage.setProductComponents(id, recipeComponents, packagingComponents);
      const product = await req.tenantStorage.getProductWithComponents(id);
      res.json(product);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/orders", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const orders = await req.tenantStorage.getAllOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const order = await req.tenantStorage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/contacts/:id/orders", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const contactId = parseInt(req.params.id);
      const orders = await req.tenantStorage.getOrdersByContact(contactId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const createOrderSchema = z.object({
    order: insertOrderSchema.extend({
      deliveryDate: z.union([z.string(), z.date(), z.null()]).optional().transform(val => 
        val ? (typeof val === 'string' ? new Date(val) : val) : null
      ),
    }),
    items: z.array(insertOrderItemSchema.omit({ orderId: true })),
  });

  app.post("/api/orders", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const { order, items } = createOrderSchema.parse(req.body);
      const newOrder = await req.tenantStorage.createOrder(order as any, items.map(item => ({ ...item, orderId: 0 })));
      res.status(201).json(newOrder);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  const updateOrderSchemaWithDateTransform = updateOrderSchema.extend({
    deliveryDate: z.union([z.string(), z.date(), z.null()]).optional().transform(val => 
      val ? (typeof val === 'string' ? new Date(val) : val) : null
    ),
  });

  app.patch("/api/orders/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const validatedData = updateOrderSchemaWithDateTransform.parse(req.body);
      const order = await req.tenantStorage.updateOrder(id, validatedData as any);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/orders/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      await req.tenantStorage.deleteOrder(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ingredients", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const ingredients = await req.tenantStorage.getAllIngredients();
      res.json(ingredients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ingredients/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const ingredient = await req.tenantStorage.getIngredient(id);
      if (!ingredient) {
        return res.status(404).json({ error: "Ingredient not found" });
      }
      res.json(ingredient);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ingredients", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const validatedData = insertIngredientSchema.parse(req.body);
      const ingredient = await req.tenantStorage.createIngredient(validatedData);
      res.status(201).json(ingredient);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/ingredients/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const validatedData = updateIngredientSchema.parse(req.body);
      const ingredient = await req.tenantStorage.updateIngredient(id, validatedData);
      if (!ingredient) {
        return res.status(404).json({ error: "Ingredient not found" });
      }
      res.json(ingredient);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/ingredients/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      await req.tenantStorage.deleteIngredient(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recipes", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const recipes = await req.tenantStorage.getAllRecipes();
      res.json(recipes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recipes/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const recipe = await req.tenantStorage.getRecipe(id);
      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:id/recipe", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const productId = parseInt(req.params.id);
      const recipe = await req.tenantStorage.getRecipeByProduct(productId);
      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found for this product" });
      }
      res.json(recipe);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const createRecipeSchema = z.object({
    recipe: insertRecipeSchema,
    items: z.array(insertRecipeItemSchema.omit({ recipeId: true })),
  });

  app.post("/api/recipes", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const { recipe, items } = createRecipeSchema.parse(req.body);
      const newRecipe = await req.tenantStorage.createRecipe(recipe, items.map(item => ({ ...item, recipeId: 0 })));
      res.status(201).json(newRecipe);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  const updateRecipeWithItemsSchema = z.object({
    recipe: updateRecipeSchema,
    items: z.array(insertRecipeItemSchema.omit({ recipeId: true })).optional(),
  });

  app.patch("/api/recipes/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const { recipe: updates, items } = updateRecipeWithItemsSchema.parse(req.body);
      const recipe = await req.tenantStorage.updateRecipe(
        id, 
        updates, 
        items ? items.map(item => ({ ...item, recipeId: id })) : undefined
      );
      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/recipes/:id", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      await req.tenantStorage.deleteRecipe(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/recipes/:id/create-product", isAuthenticated, withTenantContext, tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      const id = parseInt(req.params.id);
      const product = await req.tenantStorage.createProductFromRecipe(id);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/setup-company", isAuthenticated, async (req: any, res) => {
    try {
      const { name, slug } = z.object({
        name: z.string().min(1),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
      }).parse(req.body);

      const existingCompany = await storage.getCompanyBySlug(slug);
      if (existingCompany) {
        return res.status(400).json({ error: "Company with this slug already exists" });
      }

      const company = await storage.createCompany({ name, slug, plan: "free" });

      const userId = req.user.claims.sub;
      await storage.assignUserToCompany(userId, company.id);

      res.status(201).json(company);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
