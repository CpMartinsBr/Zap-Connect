import { sql } from "drizzle-orm";
import { pgTable, text, integer, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  avatar: text("avatar"),
  email: text("email"),
  company: text("company"),
  stage: text("stage").notNull().default("New"),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  notes: text("notes"),
  value: integer("value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  senderId: integer("sender_id").notNull(),
  status: text("status").notNull().default("sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateContactSchema = insertContactSchema.partial();

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type UpdateContact = z.infer<typeof updateContactSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type DealStage = "New" | "Qualified" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";

// Helper type for frontend
export type ContactWithLastMessage = Contact & {
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
};
