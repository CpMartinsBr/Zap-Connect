import type { 
  ContactWithLastMessage, 
  Contact, 
  InsertContact, 
  UpdateContact, 
  Message, 
  InsertMessage,
  Product,
  InsertProduct,
  UpdateProduct,
  Order,
  InsertOrder,
  UpdateOrder,
  OrderWithItems,
  InsertOrderItem,
  Ingredient,
  InsertIngredient,
  UpdateIngredient,
  Recipe,
  InsertRecipe,
  UpdateRecipe,
  RecipeWithItems,
  InsertRecipeItem,
} from "@shared/schema";

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

// ============ CONTACTS ============
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

// ============ MESSAGES ============
export async function getMessages(contactId: number): Promise<Message[]> {
  return fetchAPI(`/api/contacts/${contactId}/messages`);
}

export async function sendMessage(message: InsertMessage): Promise<Message> {
  return fetchAPI("/api/messages", {
    method: "POST",
    body: JSON.stringify(message),
  });
}

// ============ PRODUCTS ============
export async function getProducts(): Promise<Product[]> {
  return fetchAPI("/api/products");
}

export async function getProduct(id: number): Promise<Product> {
  return fetchAPI(`/api/products/${id}`);
}

export async function createProduct(product: InsertProduct): Promise<Product> {
  return fetchAPI("/api/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export async function updateProduct(id: number, updates: UpdateProduct): Promise<Product> {
  return fetchAPI(`/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function updateStock(id: number, quantity: number): Promise<Product> {
  return fetchAPI(`/api/products/${id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  return fetchAPI(`/api/products/${id}`, {
    method: "DELETE",
  });
}

// ============ ORDERS ============
export async function getOrders(): Promise<OrderWithItems[]> {
  return fetchAPI("/api/orders");
}

export async function getOrder(id: number): Promise<OrderWithItems> {
  return fetchAPI(`/api/orders/${id}`);
}

export async function getOrdersByContact(contactId: number): Promise<OrderWithItems[]> {
  return fetchAPI(`/api/contacts/${contactId}/orders`);
}

export async function createOrder(
  order: InsertOrder, 
  items: Omit<InsertOrderItem, "orderId">[]
): Promise<Order> {
  return fetchAPI("/api/orders", {
    method: "POST",
    body: JSON.stringify({ order, items }),
  });
}

export async function updateOrder(id: number, updates: UpdateOrder): Promise<Order> {
  return fetchAPI(`/api/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteOrder(id: number): Promise<void> {
  return fetchAPI(`/api/orders/${id}`, {
    method: "DELETE",
  });
}

// ============ INGREDIENTS ============
export async function getIngredients(): Promise<Ingredient[]> {
  return fetchAPI("/api/ingredients");
}

export async function getIngredient(id: number): Promise<Ingredient> {
  return fetchAPI(`/api/ingredients/${id}`);
}

export async function createIngredient(ingredient: InsertIngredient): Promise<Ingredient> {
  return fetchAPI("/api/ingredients", {
    method: "POST",
    body: JSON.stringify(ingredient),
  });
}

export async function updateIngredient(id: number, updates: UpdateIngredient): Promise<Ingredient> {
  return fetchAPI(`/api/ingredients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteIngredient(id: number): Promise<void> {
  return fetchAPI(`/api/ingredients/${id}`, {
    method: "DELETE",
  });
}

// ============ RECIPES ============
export async function getRecipes(): Promise<RecipeWithItems[]> {
  return fetchAPI("/api/recipes");
}

export async function getRecipe(id: number): Promise<RecipeWithItems> {
  return fetchAPI(`/api/recipes/${id}`);
}

export async function getRecipeByProduct(productId: number): Promise<RecipeWithItems | null> {
  try {
    return await fetchAPI(`/api/products/${productId}/recipe`);
  } catch {
    return null;
  }
}

export async function createRecipe(
  recipe: InsertRecipe, 
  items: Omit<InsertRecipeItem, "recipeId">[]
): Promise<Recipe> {
  return fetchAPI("/api/recipes", {
    method: "POST",
    body: JSON.stringify({ recipe, items }),
  });
}

export async function updateRecipe(
  id: number, 
  updates: UpdateRecipe, 
  items?: Omit<InsertRecipeItem, "recipeId">[]
): Promise<Recipe> {
  return fetchAPI(`/api/recipes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ recipe: updates, items }),
  });
}

export async function deleteRecipe(id: number): Promise<void> {
  return fetchAPI(`/api/recipes/${id}`, {
    method: "DELETE",
  });
}
