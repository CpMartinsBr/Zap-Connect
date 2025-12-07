import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, desc, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  Contact,
  InsertContact,
  UpdateContact,
  Message,
  InsertMessage,
  ContactWithLastMessage,
} from "@shared/schema";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

export interface IStorage {
  getAllContacts(): Promise<ContactWithLastMessage[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, updates: UpdateContact): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<void>;

  getMessagesByContact(contactId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
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
}

export const storage = new DatabaseStorage();
