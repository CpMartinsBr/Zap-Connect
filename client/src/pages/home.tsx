import { useState } from "react";
import { ChatList } from "@/components/chat-list";
import { ChatWindow } from "@/components/chat-window";
import { CrmPanel } from "@/components/crm-panel";
import { MOCK_CONTACTS, MOCK_MESSAGES, Contact, Message } from "@/lib/mock-data";

export default function Home() {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [messages, setMessages] = useState<Record<number, Message[]>>(MOCK_MESSAGES);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [showCrmPanel, setShowCrmPanel] = useState(true);

  const selectedContact = selectedContactId ? contacts.find(c => c.id === selectedContactId) : null;
  const currentMessages = selectedContactId ? (messages[selectedContactId] || []) : [];

  const handleSendMessage = (text: string) => {
    if (!selectedContactId) return;

    const newMessage: Message = {
      id: Date.now(),
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderId: 0, // Me
      status: 'sent'
    };

    setMessages(prev => ({
      ...prev,
      [selectedContactId]: [...(prev[selectedContactId] || []), newMessage]
    }));

    // Update last message in contact list
    setContacts(prev => prev.map(c => 
      c.id === selectedContactId 
        ? { ...c, lastMessage: text, lastMessageTime: "Just now" }
        : c
    ));
  };

  const handleUpdateContact = (id: number, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden relative">
      {/* Background decoration (green strip at top like WhatsApp Web) */}
      <div className="absolute top-0 left-0 w-full h-32 bg-primary z-0"></div>

      {/* Main App Container */}
      <div className="z-10 flex w-full h-full max-w-[1600px] mx-auto xl:py-5 xl:h-[calc(100vh-40px)] shadow-2xl overflow-hidden rounded-lg bg-white">
        
        {/* Left: Chat List */}
        <ChatList 
          contacts={contacts} 
          selectedContactId={selectedContactId} 
          onSelectContact={setSelectedContactId} 
        />

        {/* Middle: Chat Window */}
        {selectedContact ? (
          <ChatWindow 
            contact={selectedContact} 
            messages={currentMessages} 
            onSendMessage={handleSendMessage} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] border-b-[6px] border-[#25D366]">
             <div className="text-center space-y-4 p-8">
                <div className="w-64 h-64 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    {/* Placeholder illustration */}
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

        {/* Right: CRM Panel (Collapsible) */}
        {selectedContact && showCrmPanel && (
          <CrmPanel 
            contact={selectedContact} 
            onUpdateContact={handleUpdateContact} 
            onClose={() => setShowCrmPanel(false)}
          />
        )}
      </div>
    </div>
  );
}
