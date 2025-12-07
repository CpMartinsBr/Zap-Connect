import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { 
  InsertContact, 
  UpdateContact, 
  InsertMessage,
  InsertProduct,
  UpdateProduct,
  InsertOrder,
  UpdateOrder,
  InsertOrderItem,
} from "@shared/schema";

// ============ CONTACTS ============
export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: api.getContacts,
  });
}

export function useMessages(contactId: number | null) {
  return useQuery({
    queryKey: ["messages", contactId],
    queryFn: () => contactId ? api.getMessages(contactId) : Promise.resolve([]),
    enabled: !!contactId,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contact: InsertContact) => api.createContact(contact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdateContact }) =>
      api.updateContact(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: InsertMessage) => api.sendMessage(message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

// ============ PRODUCTS ============
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: api.getProducts,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (product: InsertProduct) => api.createProduct(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdateProduct }) =>
      api.updateProduct(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      api.updateStock(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ============ ORDERS ============
export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: api.getOrders,
  });
}

export function useOrdersByContact(contactId: number | null) {
  return useQuery({
    queryKey: ["orders", "contact", contactId],
    queryFn: () => contactId ? api.getOrdersByContact(contactId) : Promise.resolve([]),
    enabled: !!contactId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ order, items }: { order: InsertOrder; items: Omit<InsertOrderItem, "orderId">[] }) =>
      api.createOrder(order, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "contact", variables.order.contactId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates, contactId }: { id: number; updates: UpdateOrder; contactId?: number }) =>
      api.updateOrder(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (variables.contactId) {
        queryClient.invalidateQueries({ queryKey: ["orders", "contact", variables.contactId] });
      }
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, contactId }: { id: number; contactId?: number }) => api.deleteOrder(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (variables.contactId) {
        queryClient.invalidateQueries({ queryKey: ["orders", "contact", variables.contactId] });
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
