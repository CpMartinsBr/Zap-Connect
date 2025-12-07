import { useState } from "react";
import { ChatList } from "@/components/chat-list";
import { ChatWindow } from "@/components/chat-window";
import { CrmPanel } from "@/components/crm-panel";
import { useContacts, useMessages, useSendMessage, useUpdateContact } from "@/lib/hooks";
import type { UpdateContact } from "@shared/schema";

export default function Home() {
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [showCrmPanel, setShowCrmPanel] = useState(true);

  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: messages = [], isLoading: messagesLoading } = useMessages(selectedContactId);
  const sendMessageMutation = useSendMessage();
  const updateContactMutation = useUpdateContact();

  const selectedContact = selectedContactId ? contacts.find(c => c.id === selectedContactId) : null;

  const handleSendMessage = (text: string) => {
    if (!selectedContactId) return;

    sendMessageMutation.mutate({
      contactId: selectedContactId,
      content: text,
      senderId: 0,
      status: "sent",
    });
  };

  const handleUpdateContact = (id: number, updates: UpdateContact) => {
    updateContactMutation.mutate({ id, updates });
  };

  if (contactsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Carregando contatos...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white overflow-hidden">
        
        <ChatList 
          contacts={contacts} 
          selectedContactId={selectedContactId} 
          onSelectContact={setSelectedContactId} 
        />

        {selectedContact ? (
          <ChatWindow 
            contact={selectedContact} 
            messages={messages} 
            onSendMessage={handleSendMessage}
            isLoading={messagesLoading || sendMessageMutation.isPending}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] border-b-[6px] border-[#25D366]">
             <div className="text-center space-y-4 p-8">
                <div className="w-64 h-64 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-32 h-32 opacity-20" />
                </div>
                <h1 className="text-3xl font-light text-gray-700">WhatsApp CRM</h1>
                <p className="text-gray-500 max-w-md">
                    Send and receive messages without keeping your phone online.
                    <br />
                    Use WhatsApp on up to 4 linked devices and 1 phone.
                </p>
                <div className="pt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <span className="w-3 h-3 bg-gray-300 rounded-full"></span>
                    End-to-end encrypted
                </div>
             </div>
          </div>
        )}

      {selectedContact && showCrmPanel && (
        <CrmPanel 
          contact={selectedContact} 
          onUpdateContact={handleUpdateContact}
          isUpdating={updateContactMutation.isPending}
          onClose={() => setShowCrmPanel(false)}
        />
      )}
    </div>
  );
}
