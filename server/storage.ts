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
}

export const storage = new DatabaseStorage();
