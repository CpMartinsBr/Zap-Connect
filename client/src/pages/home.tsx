import { useState } from "react";
import { Search, Plus, Phone, Mail, Building, Edit2, Save, ShoppingCart, X, User, Trash2, MapPin, Image } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useContacts, useUpdateContact, useCreateContact, useOrdersByContact, useProducts, useCreateOrder } from "@/lib/hooks";
import type { ContactWithLastMessage, UpdateContact, InsertContact } from "@shared/schema";
import { cn } from "@/lib/utils";

const paymentMethods = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "transferencia", label: "Transferência" },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800" },
  preparing: { label: "Preparando", color: "bg-purple-100 text-purple-800" },
  ready: { label: "Pronto", color: "bg-green-100 text-green-800" },
  delivered: { label: "Entregue", color: "bg-gray-100 text-gray-800" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

interface OrderItemForm {
  productId: number;
  quantity: number;
  unitPrice: string;
}

function ClientDetails({ 
  contact, 
  onUpdateContact, 
  isUpdating,
  onClose
}: { 
  contact: ContactWithLastMessage; 
  onUpdateContact: (id: number, updates: UpdateContact) => void;
  isUpdating: boolean;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [formData, setFormData] = useState<UpdateContact>({
    name: contact.name,
    phone: contact.phone,
    avatar: contact.avatar,
    email: contact.email,
    company: contact.company,
    addresses: contact.addresses || [],
    notes: contact.notes,
  });
  const [newAddress, setNewAddress] = useState("");

  const { data: orders = [] } = useOrdersByContact(contact.id);
  const { data: products = [] } = useProducts();
  const createOrder = useCreateOrder();

  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [orderPaymentMethod, setOrderPaymentMethod] = useState("dinheiro");
  const [orderIsPaid, setOrderIsPaid] = useState(false);
  const [orderDeliveryFee, setOrderDeliveryFee] = useState("0");
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState("");

  const handleSave = () => {
    onUpdateContact(contact.id, formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: contact.name,
      phone: contact.phone,
      avatar: contact.avatar,
      email: contact.email,
      company: contact.company,
      addresses: contact.addresses || [],
      notes: contact.notes,
    });
    setNewAddress("");
    setIsEditing(false);
  };

  const addAddress = () => {
    if (newAddress.trim()) {
      setFormData({
        ...formData,
        addresses: [...(formData.addresses || []), newAddress.trim()],
      });
      setNewAddress("");
    }
  };

  const removeAddress = (index: number) => {
    setFormData({
      ...formData,
      addresses: (formData.addresses || []).filter((_, i) => i !== index),
    });
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { productId: 0, quantity: 1, unitPrice: "0" }]);
  };

  const updateOrderItem = (index: number, updates: Partial<OrderItemForm>) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], ...updates };
    
    if (updates.productId) {
      const product = products.find((p) => p.id === updates.productId);
      if (product) {
        newItems[index].unitPrice = product.price;
      }
    }
    
    setOrderItems(newItems);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => {
      return sum + (Number(item.unitPrice) * item.quantity);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + Number(orderDeliveryFee || 0);
  };

  const handleCreateOrder = () => {
    if (orderItems.length === 0) return;

    const items = orderItems.filter((item) => item.productId > 0).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    createOrder.mutate({
      order: {
        contactId: contact.id,
        status: "pending",
        notes: orderNotes,
        total: calculateTotal().toFixed(2),
        deliveryFee: orderDeliveryFee,
        deliveryAddress: orderDeliveryAddress || null,
        paymentMethod: orderPaymentMethod,
        isPaid: orderIsPaid ? 1 : 0,
      },
      items,
    });
    setIsOrderDialogOpen(false);
    setOrderItems([]);
    setOrderNotes("");
    setOrderPaymentMethod("dinheiro");
    setOrderIsPaid(false);
    setOrderDeliveryFee("0");
    setOrderDeliveryAddress("");
  };

  const openOrderDialog = () => {
    setOrderItems([{ productId: 0, quantity: 1, unitPrice: "0" }]);
    setOrderNotes("");
    setOrderPaymentMethod("dinheiro");
    setOrderIsPaid(false);
    setOrderDeliveryFee("0");
    setOrderDeliveryAddress(contact.addresses?.[0] || "");
    setIsOrderDialogOpen(true);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="flex-1 bg-white flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <Avatar data-testid="avatar-contact" className="w-14 h-14">
              <AvatarImage src={contact.avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {contact.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 data-testid="text-contact-name" className="text-xl font-semibold text-gray-900">{contact.name}</h2>
              <p data-testid="text-contact-phone-header" className="text-sm text-gray-500">{contact.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button data-testid="btn-edit-contact" onClick={() => setIsEditing(true)} variant="outline" className="gap-2" disabled={isUpdating}>
                <Edit2 className="w-4 h-4" /> Editar
              </Button>
            ) : (
              <>
                <Button data-testid="btn-save-contact-edit" onClick={handleSave} className="gap-2 bg-primary hover:bg-primary/90" disabled={isUpdating}>
                  <Save className="w-4 h-4" /> {isUpdating ? "Salvando..." : "Salvar"}
                </Button>
                <Button data-testid="btn-cancel-contact-edit" onClick={handleCancel} variant="outline" disabled={isUpdating}>
                  Cancelar
                </Button>
              </>
            )}
            <Button data-testid="btn-close-contact-details" variant="ghost" size="icon" onClick={onClose} className="text-gray-500">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informações de Contato */}
            <div className="bg-gray-50 rounded-lg p-5 space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <User className="w-4 h-4" /> Informações de Contato
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Telefone
                  </Label>
                  {isEditing ? (
                    <Input 
                      data-testid="input-edit-phone"
                      value={formData.phone || ""} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  ) : (
                    <p data-testid="text-contact-phone" className="text-sm font-medium text-gray-900">{contact.phone}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </Label>
                  {isEditing ? (
                    <Input 
                      data-testid="input-edit-email"
                      value={formData.email || ""} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  ) : (
                    <p data-testid="text-contact-email" className="text-sm font-medium text-gray-900">{contact.email || "—"}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Building className="w-3 h-3" /> Empresa
                  </Label>
                  {isEditing ? (
                    <Input 
                      data-testid="input-edit-company"
                      value={formData.company || ""} 
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                    />
                  ) : (
                    <p data-testid="text-contact-company" className="text-sm font-medium text-gray-900">{contact.company || "—"}</p>
                  )}
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Image className="w-3 h-3" /> Foto (URL)
                  </Label>
                  {isEditing ? (
                    <Input 
                      data-testid="input-edit-avatar"
                      value={formData.avatar || ""} 
                      onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                      placeholder="https://exemplo.com/foto.jpg"
                    />
                  ) : (
                    <p data-testid="text-contact-avatar" className="text-sm font-medium text-gray-900">
                      {contact.avatar || "—"}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Endereços de Entrega
                </Label>
                <div className="space-y-2">
                  {(isEditing ? formData.addresses : contact.addresses)?.map((address, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div data-testid={`text-address-${index}`} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded text-sm">
                        {address}
                      </div>
                      {isEditing && (
                        <Button
                          data-testid={`btn-remove-address-${index}`}
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 h-8 w-8"
                          onClick={() => removeAddress(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {(!contact.addresses || contact.addresses.length === 0) && !isEditing && (
                    <span className="text-sm text-gray-400">Sem endereços cadastrados</span>
                  )}
                  {isEditing && (
                    <div className="flex gap-2">
                      <Input
                        data-testid="input-new-address"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="Novo endereço..."
                        onKeyDown={(e) => e.key === "Enter" && addAddress()}
                      />
                      <Button
                        data-testid="btn-add-address"
                        variant="outline"
                        size="sm"
                        onClick={addAddress}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notas */}
            <div className="bg-gray-50 rounded-lg p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Notas</h3>
              {isEditing ? (
                <Textarea 
                  data-testid="input-edit-notes"
                  value={formData.notes || ""} 
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="min-h-[150px] bg-white"
                  placeholder="Adicione observações sobre o cliente..."
                />
              ) : (
                <div data-testid="text-contact-notes" className="bg-white p-4 rounded-md border border-gray-100 min-h-[150px] text-sm text-gray-700">
                  {contact.notes || <span className="text-gray-400 italic">Sem notas.</span>}
                </div>
              )}
            </div>

            {/* Pedidos */}
            <div className="bg-gray-50 rounded-lg p-5 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Pedidos do Cliente
                </h3>
                <Button 
                  data-testid="btn-new-order"
                  size="sm" 
                  onClick={openOrderDialog}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-1" /> Novo Pedido
                </Button>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhum pedido registrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {orders.map((order) => {
                    const status = statusConfig[order.status] || statusConfig.pending;
                    return (
                      <div 
                        key={order.id} 
                        data-testid={`order-card-${order.id}`}
                        className="bg-white p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">Pedido #{order.id}</span>
                          <Badge className={`${status.color} text-xs`}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500 mb-2">
                          {formatDate(order.createdAt)}
                        </div>
                        <div className="text-lg font-semibold text-primary">
                          R$ {Number(order.total).toFixed(2)}
                        </div>
                        {order.notes && (
                          <p className="text-xs text-gray-400 mt-2 truncate">{order.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Dialog de Novo Pedido */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Pedido - {contact.name}</DialogTitle>
            <DialogDescription>Adicione itens, forma de pagamento e informações de entrega.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[50vh] overflow-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Itens do Pedido</Label>
                <Button 
                  data-testid="btn-add-item-dialog"
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addOrderItem}
                >
                  <Plus size={14} className="mr-1" />
                  Item
                </Button>
              </div>

              {orderItems.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-lg">
                  Adicione itens ao pedido
                </div>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <Select 
                          value={item.productId?.toString() || ""} 
                          onValueChange={(v) => updateOrderItem(index, { productId: parseInt(v) })}
                        >
                          <SelectTrigger data-testid={`select-dialog-product-${index}`} className="h-9">
                            <SelectValue placeholder="Produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.filter((p) => p.active === 1).map((product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - R$ {Number(product.price).toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-16">
                        <Input
                          data-testid={`input-dialog-qty-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, { quantity: parseInt(e.target.value) || 1 })}
                          className="h-9"
                        />
                      </div>
                      <Button
                        data-testid={`btn-remove-dialog-item-${index}`}
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-500"
                        onClick={() => removeOrderItem(index)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}

                  <div className="flex justify-between pt-2 text-sm border-t">
                    <span>Subtotal:</span>
                    <span>R$ {calculateSubtotal().toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Endereço de Entrega</Label>
                <Select 
                  value={orderDeliveryAddress} 
                  onValueChange={setOrderDeliveryAddress}
                >
                  <SelectTrigger data-testid="select-dialog-delivery-address">
                    <SelectValue placeholder="Selecione ou digite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Retirar no local</SelectItem>
                    {contact.addresses?.map((addr, i) => (
                      <SelectItem key={i} value={addr}>{addr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Taxa de Entrega</Label>
                <Input
                  data-testid="input-dialog-delivery-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderDeliveryFee}
                  onChange={(e) => setOrderDeliveryFee(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Forma de Pagamento</Label>
                <Select value={orderPaymentMethod} onValueChange={setOrderPaymentMethod}>
                  <SelectTrigger data-testid="select-dialog-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Status do Pagamento</Label>
                <div className="flex items-center gap-2 h-10">
                  <Checkbox 
                    id="isPaid"
                    data-testid="checkbox-dialog-is-paid"
                    checked={orderIsPaid}
                    onCheckedChange={(checked) => setOrderIsPaid(checked === true)}
                  />
                  <label htmlFor="isPaid" className="text-sm cursor-pointer">
                    Pago
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Observações</Label>
              <Textarea
                data-testid="input-dialog-notes"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Observações sobre o pedido"
                rows={2}
              />
            </div>

            <div className="flex justify-end pt-2 text-lg font-bold border-t">
              Total: R$ {calculateTotal().toFixed(2)}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              data-testid="btn-create-order-dialog"
              onClick={handleCreateOrder} 
              disabled={orderItems.length === 0 || orderItems.every(i => i.productId === 0)}
              className="bg-primary hover:bg-primary/90"
            >
              Criar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Home() {
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertContact>>({
    name: "",
    phone: "",
    email: "",
    company: "",
    addresses: [],
    notes: "",
  });

  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const updateContactMutation = useUpdateContact();
  const createContact = useCreateContact();

  const selectedContact = selectedContactId ? contacts.find(c => c.id === selectedContactId) : null;

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm) ||
    (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleUpdateContact = (id: number, updates: UpdateContact) => {
    updateContactMutation.mutate({ id, updates });
  };

  const handleOpenAddDialog = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      company: "",
      addresses: [],
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleCreateContact = () => {
    if (!formData.name || !formData.phone) return;

    createContact.mutate(formData as InsertContact, {
      onSuccess: (newContact) => {
        setIsAddDialogOpen(false);
        setSelectedContactId(newContact.id);
      },
    });
  };

  if (contactsLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-gray-500">Carregando clientes...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-100 overflow-hidden">
      {/* Lista de Clientes */}
      <div className={cn(
        "bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300",
        selectedContact ? "w-[350px]" : "w-full max-w-4xl mx-auto"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
          <Button 
            data-testid="btn-add-contact"
            onClick={handleOpenAddDialog}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </Button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              data-testid="input-search-contact"
              className="pl-10 bg-gray-50 border-gray-200"
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <User className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="mb-4">Nenhum cliente encontrado</p>
              <Button 
                onClick={handleOpenAddDialog}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar cliente
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  data-testid={`contact-item-${contact.id}`}
                  onClick={() => setSelectedContactId(contact.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 cursor-pointer transition-colors hover:bg-gray-50",
                    selectedContactId === contact.id && "bg-primary/5 border-l-4 border-primary"
                  )}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={contact.avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {contact.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 truncate">{contact.name}</span>
                      {contact.company && (
                        <span className="text-xs text-gray-500">• {contact.company}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {contact.phone}
                      </span>
                      {contact.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" /> {contact.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Detalhes do Cliente */}
      {selectedContact && (
        <ClientDetails
          contact={selectedContact}
          onUpdateContact={handleUpdateContact}
          isUpdating={updateContactMutation.isPending}
          onClose={() => setSelectedContactId(null)}
        />
      )}

      {/* Dialog de Novo Cliente */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                data-testid="input-contact-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do cliente"
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
              <Textarea
                data-testid="input-contact-notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações sobre o cliente"
                rows={3}
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
              className="bg-primary hover:bg-primary/90"
            >
              {createContact.isPending ? "Salvando..." : "Criar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
