import { useState } from "react";
import { Search, Plus, Filter, LogOut, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContactWithLastMessage, DealStage, InsertContact } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useCreateContact } from "@/lib/hooks";
import { useAuth } from "@/hooks/useAuth";

interface ChatListProps {
  contacts: ContactWithLastMessage[];
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertContact>>({
    name: "",
    phone: "",
    email: "",
    company: "",
    stage: "New",
    tags: [],
    notes: "",
  });

  const { user } = useAuth();
  const createContact = useCreateContact();

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  const handleOpenAddDialog = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      company: "",
      stage: "New",
      tags: [],
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleCreateContact = () => {
    if (!formData.name || !formData.phone) return;

    createContact.mutate(formData as InsertContact, {
      onSuccess: (newContact) => {
        setIsAddDialogOpen(false);
        onSelectContact(newContact.id);
      },
    });
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white border-r border-gray-200 w-[350px] min-w-[300px]">
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{user?.firstName?.substring(0, 2) || user?.email?.substring(0, 2) || "ME"}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <div className="px-2 py-1.5 text-sm font-medium text-gray-900">
                {user?.firstName || user?.email || "Minha conta"}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 cursor-pointer"
                onClick={() => window.location.href = "/api/logout"}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex gap-4 text-gray-500">
            <button 
              data-testid="btn-add-contact"
              className="hover:text-gray-700"
              onClick={handleOpenAddDialog}
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-3 border-b border-gray-100 bg-white">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              data-testid="input-search-contact"
              className="pl-10 bg-gray-100 border-none focus-visible:ring-1 focus-visible:ring-primary h-9"
              placeholder="Buscar contato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
              <Filter className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="mb-4">Nenhum contato encontrado</p>
                <Button 
                  onClick={handleOpenAddDialog}
                  variant="outline"
                  className="text-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar contato
                </Button>
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  data-testid={`contact-item-${contact.id}`}
                  onClick={() => onSelectContact(contact.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-gray-50 hover:bg-gray-50",
                    selectedContactId === contact.id && "bg-gray-100"
                  )}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={contact.avatar || undefined} />
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
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide", STAGE_COLORS[contact.stage as DealStage])}>
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
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                data-testid="input-contact-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do contato"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input
                data-testid="input-contact-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+55 11 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                data-testid="input-contact-email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input
                data-testid="input-contact-company"
                value={formData.company || ""}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                data-testid="input-contact-notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações sobre o contato"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              data-testid="btn-save-contact"
              onClick={handleCreateContact} 
              disabled={!formData.name || !formData.phone || createContact.isPending}
              className="bg-[#00A884] hover:bg-[#008f6f]"
            >
              {createContact.isPending ? "Salvando..." : "Criar Contato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
