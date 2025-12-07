import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log("🌱 Seeding database...");

  const mockContacts = [
    {
      name: "Alice Freeman",
      phone: "+55 11 99999-1111",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      email: "alice@freeman.inc",
      company: "Freeman Inc.",
      stage: "Proposal",
      tags: ["VIP", "Urgent"],
      value: 12500,
      notes: "Needs the proposal by Friday. Interested in the premium plan.",
    },
    {
      name: "Bob Smith",
      phone: "+55 11 98888-2222",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop",
      email: "bob@techsoft.com",
      company: "TechSoft",
      stage: "Qualified",
      tags: ["Tech", "Lead"],
      value: 5000,
      notes: "Met at the conference. Looking for integration features.",
    },
    {
      name: "Charlie Davis",
      phone: "+55 21 97777-3333",
      avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop",
      email: "charlie@logistics.co",
      company: "Global Logistics",
      stage: "Negotiation",
      tags: ["Enterprise"],
      value: 45000,
      notes: "Discussing contract terms. Legal team reviewing.",
    },
    {
      name: "Diana Prince",
      phone: "+55 11 96666-4444",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop",
      email: "diana@themyscira.com",
      company: "Themyscira Ltd",
      stage: "New",
      tags: ["Inbound"],
      value: 2000,
      notes: "New lead from website form.",
    },
  ];

  // Insert contacts and messages
  for (const contactData of mockContacts) {
    const [contact] = await db
      .insert(schema.contacts)
      .values(contactData)
      .returning();

    console.log(`✅ Created contact: ${contact.name}`);

    // Add some messages for each contact
    const messages = getMessagesForContact(contact.id, contact.name);
    for (const message of messages) {
      await db.insert(schema.messages).values(message);
    }
    console.log(`   📨 Added ${messages.length} messages`);
  }

  console.log("✨ Seeding complete!");
  await pool.end();
}

function getMessagesForContact(contactId: number, name: string) {
  if (name === "Alice Freeman") {
    return [
      { contactId, content: "Hi Alice, how are you?", senderId: 0, status: "read", createdAt: new Date(Date.now() - 3600000) },
      { contactId, content: "I'm doing well! Just wanted to follow up on our meeting.", senderId: contactId, status: "read", createdAt: new Date(Date.now() - 3300000) },
      { contactId, content: "Sure, what details do you need?", senderId: 0, status: "read", createdAt: new Date(Date.now() - 3000000) },
      { contactId, content: "Is the proposal ready?", senderId: contactId, status: "sent", createdAt: new Date(Date.now() - 600000) },
      { contactId, content: "I need to show it to my board today.", senderId: contactId, status: "sent", createdAt: new Date(Date.now() - 300000) },
    ];
  } else if (name === "Bob Smith") {
    return [
      { contactId, content: "Here is the brochure you asked for.", senderId: 0, status: "read", createdAt: new Date(Date.now() - 86400000) },
      { contactId, content: "Thanks for the info!", senderId: contactId, status: "read", createdAt: new Date(Date.now() - 82800000) },
    ];
  } else if (name === "Charlie Davis") {
    return [
      { contactId, content: "Can we schedule a call?", senderId: contactId, status: "read", createdAt: new Date(Date.now() - 86400000) },
    ];
  } else {
    return [
      { contactId, content: "Okay, I will check.", senderId: contactId, status: "read", createdAt: new Date(Date.now() - 172800000) },
    ];
  }
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
