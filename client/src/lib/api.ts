import type { ContactWithLastMessage, Contact, InsertContact, UpdateContact, Message, InsertMessage } from "@shared/schema";

async function fetchAPI(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getContacts(): Promise<ContactWithLastMessage[]> {
  return fetchAPI("/api/contacts");
}

export async function getContact(id: number): Promise<Contact> {
  return fetchAPI(`/api/contacts/${id}`);
}

export async function createContact(contact: InsertContact): Promise<Contact> {
  return fetchAPI("/api/contacts", {
    method: "POST",
    body: JSON.stringify(contact),
  });
}

export async function updateContact(id: number, updates: UpdateContact): Promise<Contact> {
  return fetchAPI(`/api/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteContact(id: number): Promise<void> {
  return fetchAPI(`/api/contacts/${id}`, {
    method: "DELETE",
  });
}

export async function getMessages(contactId: number): Promise<Message[]> {
  return fetchAPI(`/api/contacts/${contactId}/messages`);
}

export async function sendMessage(message: InsertMessage): Promise<Message> {
  return fetchAPI("/api/messages", {
    method: "POST",
    body: JSON.stringify(message),
  });
}
