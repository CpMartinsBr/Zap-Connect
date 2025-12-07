// Simulating Xano Database Structure
export type User = {
  id: number;
  name: string;
  avatar?: string;
};

export type Message = {
  id: number;
  content: string;
  timestamp: string;
  senderId: number; // 0 for current user (me)
  status: 'sent' | 'delivered' | 'read';
};

export type DealStage = 'New' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';

export type Contact = {
  id: number;
  name: string;
  phone: string;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  
  // CRM Fields
  email?: string;
  company?: string;
  stage: DealStage;
  tags: string[];
  notes?: string;
  value?: number;
};

export const CURRENT_USER: User = {
  id: 0,
  name: "Sales Agent",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
};

export const MOCK_CONTACTS: Contact[] = [
  {
    id: 1,
    name: "Alice Freeman",
    phone: "+55 11 99999-1111",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    lastMessage: "Is the proposal ready?",
    lastMessageTime: "10:30 AM",
    unreadCount: 2,
    email: "alice@freeman.inc",
    company: "Freeman Inc.",
    stage: "Proposal",
    tags: ["VIP", "Urgent"],
    value: 12500,
    notes: "Needs the proposal by Friday. Interested in the premium plan."
  },
  {
    id: 2,
    name: "Bob Smith",
    phone: "+55 11 98888-2222",
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop",
    lastMessage: "Thanks for the info!",
    lastMessageTime: "Yesterday",
    email: "bob@techsoft.com",
    company: "TechSoft",
    stage: "Qualified",
    tags: ["Tech", "Lead"],
    value: 5000,
    notes: "Met at the conference. Looking for integration features."
  },
  {
    id: 3,
    name: "Charlie Davis",
    phone: "+55 21 97777-3333",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop",
    lastMessage: "Can we schedule a call?",
    lastMessageTime: "Yesterday",
    email: "charlie@logistics.co",
    company: "Global Logistics",
    stage: "Negotiation",
    tags: ["Enterprise"],
    value: 45000,
    notes: "Discussing contract terms. Legal team reviewing."
  },
  {
    id: 4,
    name: "Diana Prince",
    phone: "+55 11 96666-4444",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop",
    lastMessage: "Okay, I will check.",
    lastMessageTime: "Mon",
    email: "diana@themyscira.com",
    company: "Themyscira Ltd",
    stage: "New",
    tags: ["Inbound"],
    value: 2000,
    notes: "New lead from website form."
  }
];

export const MOCK_MESSAGES: Record<number, Message[]> = {
  1: [
    { id: 1, content: "Hi Alice, how are you?", timestamp: "10:00 AM", senderId: 0, status: "read" },
    { id: 2, content: "I'm doing well! Just wanted to follow up on our meeting.", timestamp: "10:05 AM", senderId: 1, status: "read" },
    { id: 3, content: "Sure, what details do you need?", timestamp: "10:10 AM", senderId: 0, status: "read" },
    { id: 4, content: "Is the proposal ready?", timestamp: "10:30 AM", senderId: 1, status: "sent" },
    { id: 5, content: "I need to show it to my board today.", timestamp: "10:31 AM", senderId: 1, status: "sent" }
  ],
  2: [
    { id: 1, content: "Here is the brochure you asked for.", timestamp: "Yesterday", senderId: 0, status: "read" },
    { id: 2, content: "Thanks for the info!", timestamp: "Yesterday", senderId: 2, status: "read" }
  ],
  3: [
    { id: 1, content: "Can we schedule a call?", timestamp: "Yesterday", senderId: 3, status: "read" }
  ],
  4: [
    { id: 1, content: "Okay, I will check.", timestamp: "Mon", senderId: 4, status: "read" }
  ]
};
