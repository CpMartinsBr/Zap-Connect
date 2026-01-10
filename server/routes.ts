import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, type ITenantStorage } from "./storage";
import { setupAuth, isAuthenticated, withTenantContext, requireCompany, requireRole, requireFeature, type TenantContext } from "./replitAuth";
import crypto from "crypto";
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
import * as twilioService from "./services/twilio";
import * as planService from "./services/plans";

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

  app.get('/api/auth/user', isAuthenticated, withTenantContext, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user) {
        const allowedEmails = (process.env.ALLOWED_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
        const isAllowed = allowedEmails.length === 0 || allowedEmails.includes(user.email?.toLowerCase() || "");
        const isSuperAdmin = storage.isSuperAdmin(user.email || "");
        
        const memberships = await storage.getUserMemberships(userId);
        const activeMembership = memberships.find(m => m.companyId === req.tenant?.companyId) || memberships[0];
        
        let company = null;
        if (activeMembership?.companyId) {
          company = await storage.getCompany(activeMembership.companyId);
        } else if (user.companyId) {
          company = await storage.getCompany(user.companyId);
        }
        
        res.json({ 
          ...user, 
          isAllowed, 
          isSuperAdmin,
          company,
          memberships,
          activeRole: activeMembership?.role || null,
        });
      } else {
        res.json(user);
      }
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/memberships', isAuthenticated, withTenantContext, async (req: any, res) => {
    try {
      const memberships = await storage.getUserMemberships(req.tenant.userId);
      res.json(memberships);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/switch-company', isAuthenticated, withTenantContext, async (req: any, res) => {
    try {
      const { companyId } = z.object({ companyId: z.number() }).parse(req.body);
      
      const membership = await storage.getMembership(req.tenant.userId, companyId);
      if (!membership && !req.tenant.isSuperAdmin) {
        return res.status(403).json({ error: "Not a member of this company" });
      }
      
      await storage.assignUserToCompany(req.tenant.userId, companyId);
      
      res.json({ success: true, companyId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/company/members', isAuthenticated, withTenantContext, tenantMiddleware, requireRole("admin", "manager"), async (req, res) => {
    try {
      if (!req.tenant?.companyId) {
        return res.status(403).json({ error: "No company context" });
      }
      const members = await storage.getCompanyMembers(req.tenant.companyId);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/company/invitations', isAuthenticated, withTenantContext, tenantMiddleware, requireRole("admin"), async (req, res) => {
    try {
      if (!req.tenant?.companyId) {
        return res.status(403).json({ error: "No company context" });
      }
      
      const { email, role } = z.object({
        email: z.string().email(),
        role: z.enum(["admin", "manager", "member", "viewer"]).default("member"),
      }).parse(req.body);
      
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const invitation = await storage.createInvitation({
        companyId: req.tenant.companyId,
        email: email.toLowerCase(),
        role,
        invitedBy: req.tenant.userId,
        expiresAt,
      }, token);
      
      res.status(201).json(invitation);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/company/invitations', isAuthenticated, withTenantContext, tenantMiddleware, requireRole("admin", "manager"), async (req, res) => {
    try {
      if (!req.tenant?.companyId) {
        return res.status(403).json({ error: "No company context" });
      }
      const invitations = await storage.getCompanyInvitations(req.tenant.companyId);
      res.json(invitations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/invitations/accept', isAuthenticated, withTenantContext, async (req: any, res) => {
    try {
      const { token } = z.object({ token: z.string() }).parse(req.body);
      
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Invitation already used" });
      }
      
      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ error: "Invitation expired" });
      }
      
      const user = await storage.getUser(req.tenant.userId);
      if (user?.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        return res.status(403).json({ error: "This invitation is for a different email" });
      }
      
      const existingMembership = await storage.getMembership(req.tenant.userId, invitation.companyId);
      if (existingMembership) {
        await storage.updateInvitationStatus(invitation.id, "accepted");
        return res.json({ success: true, message: "Already a member" });
      }
      
      await storage.createMembership({
        userId: req.tenant.userId,
        companyId: invitation.companyId,
        role: invitation.role,
        isDefault: 0,
      });
      
      await storage.updateInvitationStatus(invitation.id, "accepted");
      await storage.assignUserToCompany(req.tenant.userId, invitation.companyId);
      
      res.json({ success: true, companyId: invitation.companyId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/invitations/pending', isAuthenticated, withTenantContext, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.tenant.userId);
      if (!user?.email) {
        return res.json([]);
      }
      const invitations = await storage.getInvitationsByEmail(user.email);
      res.json(invitations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/company/members/:id/role', isAuthenticated, withTenantContext, tenantMiddleware, requireRole("admin"), async (req, res) => {
    try {
      if (!req.tenant?.companyId) {
        return res.status(403).json({ error: "No company context" });
      }
      
      const { role } = z.object({ role: z.enum(["admin", "manager", "member", "viewer"]) }).parse(req.body);
      const id = parseInt(req.params.id);
      
      const membership = await storage.getMembershipById(id);
      if (!membership || membership.companyId !== req.tenant.companyId) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      const updated = await storage.updateMembershipRole(id, role);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/company/members/:id', isAuthenticated, withTenantContext, tenantMiddleware, requireRole("admin"), async (req, res) => {
    try {
      if (!req.tenant?.companyId) {
        return res.status(403).json({ error: "No company context" });
      }
      
      const id = parseInt(req.params.id);
      
      const membership = await storage.getMembershipById(id);
      if (!membership || membership.companyId !== req.tenant.companyId) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      await storage.deleteMembership(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  app.post("/webhook/whatsapp", async (req, res) => {
    try {
      const from = req.body.From;
      const body = req.body.Body;
      
      if (!from || !body) {
        return res.status(200).send("OK");
      }
      
      const phone = twilioService.extractPhoneFromWhatsApp(from);
      
      const defaultCompanyId = parseInt(process.env.DEFAULT_COMPANY_ID || "1");
      
      const company = await storage.getCompany(defaultCompanyId);
      if (!company) {
        console.error(`Webhook error: Company ${defaultCompanyId} not found. Set DEFAULT_COMPANY_ID env var.`);
        return res.status(500).send("Configuration error");
      }
      
      const tenantStorage = storage.forTenant(defaultCompanyId);
      
      let contact = await tenantStorage.getContactByPhone(phone);
      
      if (!contact) {
        contact = await tenantStorage.createContact({
          name: `WhatsApp ${phone}`,
          phone: phone,
          addresses: [],
        });
        console.log(`New WhatsApp contact created: ${phone}`);
      }
      
      await tenantStorage.createMessage({
        contactId: contact.id,
        content: body,
        senderId: 1,
        status: "received",
      });
      
      console.log(`WhatsApp message received from ${phone}`);
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(200).send("OK");
    }
  });

  app.post("/whatsapp/send", isAuthenticated, withTenantContext, requireFeature("whatsappEnabled"), tenantMiddleware, async (req, res) => {
    try {
      if (!req.tenantStorage) {
        return res.status(403).json({ error: "No company associated" });
      }
      
      const { phone, message, contactId } = z.object({
        phone: z.string().min(1),
        message: z.string().min(1),
        contactId: z.number().optional(),
      }).parse(req.body);
      
      if (!twilioService.isConfigured()) {
        return res.status(503).json({ error: "WhatsApp integration not configured" });
      }
      
      const result = await twilioService.sendWhatsAppMessage(phone, message);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      if (contactId) {
        await req.tenantStorage.createMessage({
          contactId,
          content: message,
          senderId: 0,
          status: "sent",
        });
      }
      
      res.json({ success: true, sid: result.sid });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/whatsapp/status", (req, res) => {
    res.json({ configured: twilioService.isConfigured() });
  });

  // ============ PLANS & SUBSCRIPTIONS ============
  
  app.get("/api/plans", async (req, res) => {
    try {
      const plans = await planService.getAllPlans();
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/subscription", isAuthenticated, withTenantContext, async (req: any, res) => {
    try {
      const companyId = req.tenant?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "No company associated" });
      }

      const subscription = await planService.getCompanySubscription(companyId);
      const plan = await planService.getCompanyPlan(companyId);
      
      res.json({ 
        subscription, 
        plan,
        status: subscription?.status || "active",
        trialEndsAt: subscription?.trialEndsAt || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/company", isAuthenticated, withTenantContext, requireRole("admin", "manager"), async (req: any, res) => {
    try {
      const companyId = req.tenant?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "No company associated" });
      }

      const { name, logoUrl } = z.object({
        name: z.string().optional(),
        logoUrl: z.string().nullable().optional(),
      }).parse(req.body);

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (logoUrl !== undefined) updateData.logoUrl = logoUrl;

      const company = await storage.updateCompany(companyId, updateData);
      res.json(company);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/subscription/check/:feature", isAuthenticated, withTenantContext, async (req: any, res) => {
    try {
      const companyId = req.tenant?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "No company associated" });
      }

      const feature = req.params.feature as keyof import("@shared/schema").PlanLimits;
      const allowed = await planService.isFeatureAllowed(companyId, feature);
      
      res.json({ allowed, feature });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/subscription/sync", isAuthenticated, withTenantContext, async (req: any, res) => {
    try {
      const companyId = req.tenant?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "No company associated" });
      }

      const { planName } = z.object({
        planName: z.string(),
      }).parse(req.body);

      const existingSubscription = await planService.getCompanySubscription(companyId);
      
      if (!existingSubscription) {
        await planService.createSubscription(companyId, planName, "trial", 14);
      }

      const subscription = await planService.getCompanySubscription(companyId);
      const plan = await planService.getCompanyPlan(companyId);
      
      res.json({ 
        subscription, 
        plan,
        status: subscription?.status || "active",
        trialEndsAt: subscription?.trialEndsAt || null,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/subscription/change", isAuthenticated, withTenantContext, tenantMiddleware, async (req: any, res) => {
    try {
      const companyId = req.tenant?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "No company associated" });
      }

      const { planName } = z.object({
        planName: z.string(),
      }).parse(req.body);

      await planService.createSubscription(companyId, planName, "active");

      const subscription = await planService.getCompanySubscription(companyId);
      const plan = await planService.getCompanyPlan(companyId);
      
      res.json({ 
        subscription, 
        plan,
        status: subscription?.status || "active",
        trialEndsAt: subscription?.trialEndsAt || null,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/subscription", isAuthenticated, withTenantContext, requireRole("admin"), async (req: any, res) => {
    try {
      const isSuperAdmin = storage.isSuperAdmin(req.user.claims.email || "");
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "Only super admin can change subscriptions" });
      }

      const { companyId, planName, status, trialDays, notes } = z.object({
        companyId: z.number(),
        planName: z.string().optional(),
        status: z.enum(["active", "trial", "suspended", "canceled"]).optional(),
        trialDays: z.number().optional(),
        notes: z.string().optional(),
      }).parse(req.body);

      if (planName) {
        await planService.createSubscription(companyId, planName, status || "active", trialDays);
      }
      
      if (status && !planName) {
        await planService.updateSubscriptionStatus(companyId, status, notes);
      }

      const subscription = await planService.getCompanySubscription(companyId);
      res.json({ success: true, subscription });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // ============ STRIPE BILLING ============
  
  // Create Stripe checkout session for subscription
  app.post("/api/billing/checkout", isAuthenticated, withTenantContext, requireRole("admin"), async (req: any, res) => {
    try {
      const companyId = req.tenant?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "No company associated" });
      }

      const { priceId } = z.object({
        priceId: z.string(),
      }).parse(req.body);

      // Get or create Stripe customer
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      let customerId = company.stripeCustomerId;
      
      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const user = req.user.claims;
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { 
            companyId: String(companyId),
            companyName: company.name,
          },
        });
        customerId = customer.id;
        
        // Save customer ID to company
        await storage.updateCompany(companyId, { stripeCustomerId: customerId });
      }

      // Create checkout session
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}/plano?success=true`,
        cancel_url: `${baseUrl}/plano?canceled=true`,
        metadata: {
          companyId: String(companyId),
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Get Stripe products with prices (for plan selection)
  app.get("/api/billing/products", async (req, res) => {
    try {
      const { sql } = await import("drizzle-orm");
      const { db } = await import("./db");
      
      // Query products from stripe schema (synced by stripe-replit-sync)
      const result = await db.execute(sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC
      `);

      res.json({ products: result.rows });
    } catch (error: any) {
      console.error("Products error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create customer portal session (for managing subscription)
  app.post("/api/billing/portal", isAuthenticated, withTenantContext, async (req: any, res) => {
    try {
      const companyId = req.tenant?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "No company associated" });
      }

      const company = await storage.getCompany(companyId);
      if (!company?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: company.stripeCustomerId,
        return_url: `${baseUrl}/plano`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Portal error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Stripe publishable key for frontend
  app.get("/api/billing/config", async (req, res) => {
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
