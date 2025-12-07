import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { InsertContact, UpdateContact, InsertMessage } from "@shared/schema";

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
