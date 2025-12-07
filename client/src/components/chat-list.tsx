import { useState } from "react";
import { Search, Plus, Filter, MoreVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Contact, DealStage } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ChatListProps {
  contacts: Contact[];
  selectedContactId: number | null;
  onSelectContact: (id: number) => void;
}

const STAGE_COLORS: Record<DealStage, string> = {
  "New": "bg-blue-100 text-blue-700",
  "Qualified": "bg-purple-100 text-purple-700",
  "Proposal": "bg-yellow-100 text-yellow-700",
  "Negotiation": "bg-orange-100 text-orange-700",
  "Closed Won": "bg-green-100 text-green-700",
  "Closed Lost": "bg-red-100 text-red-700",
};

export function ChatList({ contacts, selectedContactId, onSelectContact }: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-[350px] min-w-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity">
          <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" />
          <AvatarFallback>ME</AvatarFallback>
        </Avatar>
        <div className="flex gap-4 text-gray-500">
          <button className="hover:text-gray-700"><Plus className="w-6 h-6" /></button>
          <button className="hover:text-gray-700"><MoreVertical className="w-6 h-6" /></button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-100 bg-white">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            className="pl-10 bg-gray-100 border-none focus-visible:ring-1 focus-visible:ring-primary h-9"
            placeholder="Search or start new chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
            <Filter className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </div>
        </div>
      </div>

      {/* Contact List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => onSelectContact(contact.id)}
              className={cn(
                "flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-gray-50 hover:bg-gray-50",
                selectedContactId === contact.id && "bg-gray-100"
              )}
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={contact.avatar} />
                <AvatarFallback>{contact.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-medium text-gray-900 truncate">{contact.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{contact.lastMessageTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500 truncate max-w-[180px]">
                    {contact.lastMessage}
                  </p>
                  <div className="flex gap-1">
                     <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide", STAGE_COLORS[contact.stage])}>
                        {contact.stage}
                     </span>
                    {contact.unreadCount && contact.unreadCount > 0 && (
                      <span className="flex items-center justify-center w-5 h-5 bg-green-500 text-white text-xs rounded-full font-bold">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
