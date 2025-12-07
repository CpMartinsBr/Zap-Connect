import { useState } from "react";
import { Edit2, Tag, Calendar, DollarSign, Mail, Building, X, Save, ShoppingCart, Plus, Clock, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { ContactWithLastMessage, UpdateContact, DealStage, Product, InsertOrderItem } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import { useOrdersByContact, useProducts, useCreateOrder } from "@/lib/hooks";
import { Trash2 } from "lucide-react";

interface CrmPanelProps {
  contact: ContactWithLastMessage;
  onUpdateContact: (id: number, updates: UpdateContact) => void;
  onClose: () => void;
  isUpdating?: boolean;
}

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

export function CrmPanel({ contact, onUpdateContact, onClose, isUpdating }: CrmPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [formData, setFormData] = useState<UpdateContact>({
    name: contact.name,
    phone: contact.phone,
    avatar: contact.avatar,
    email: contact.email,
    company: contact.company,
    stage: contact.stage,
    tags: contact.tags,
    notes: contact.notes,
    value: contact.value,
  });

  const { data: orders = [] } = useOrdersByContact(contact.id);
  const { data: products = [] } = useProducts();
  const createOrder = useCreateOrder();

  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([]);
  const [orderNotes, setOrderNotes] = useState("");

  const handleSave = () => {
    onUpdateContact(contact.id, formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(contact);
    setIsEditing(false);
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

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => {
      return sum + (Number(item.unitPrice) * item.quantity);
    }, 0);
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
      },
      items,
    });
    setIsOrderDialogOpen(false);
    setOrderItems([]);
    setOrderNotes("");
  };

  const openOrderDialog = () => {
    setOrderItems([{ productId: 0, quantity: 1, unitPrice: "0" }]);
    setOrderNotes("");
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
      <div className="w-[300px] bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-20 transition-all duration-300">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-800">Informações</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col items-center mb-6">
            {contact.avatar ? (
              <img src={contact.avatar} alt={contact.name} className="w-24 h-24 rounded-full object-cover mb-3 shadow-sm" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-3 shadow-sm">
                <span className="text-3xl font-bold text-gray-400">{contact.name.substring(0, 2)}</span>
              </div>
            )}
            <h3 className="text-xl font-semibold text-gray-900 text-center">{contact.name}</h3>
            <p className="text-sm text-gray-500">{contact.phone}</p>
          </div>

          <div className="space-y-6">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full flex gap-2" disabled={isUpdating}>
                <Edit2 className="w-4 h-4" /> Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 bg-primary hover:bg-primary/90" disabled={isUpdating}>
                  <Save className="w-4 h-4 mr-2" /> {isUpdating ? "Salvando..." : "Salvar"}
                </Button>
                <Button onClick={handleCancel} variant="ghost" className="flex-1" disabled={isUpdating}>
                  Cancelar
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Estágio
                </Label>
                {isEditing ? (
                  <Select 
                    value={formData.stage as string} 
                    onValueChange={(val) => setFormData({...formData, stage: val as DealStage})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecionar estágio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">Novo</SelectItem>
                      <SelectItem value="Qualified">Qualificado</SelectItem>
                      <SelectItem value="Proposal">Proposta</SelectItem>
                      <SelectItem value="Negotiation">Negociação</SelectItem>
                      <SelectItem value="Closed Won">Fechado (Ganho)</SelectItem>
                      <SelectItem value="Closed Lost">Fechado (Perdido)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-100 text-sm font-medium text-gray-700">
                    {contact.stage}
                  </div>
                )}
              </div>
              
              <Separator />

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </Label>
                {isEditing ? (
                  <Input 
                    value={formData.email || ""} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="h-8"
                  />
                ) : (
                  <p className="text-sm text-gray-800 break-all">{contact.email || "—"}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Building className="w-3 h-3" /> Empresa
                </Label>
                {isEditing ? (
                  <Input 
                    value={formData.company || ""} 
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="h-8"
                  />
                ) : (
                  <p className="text-sm text-gray-800">{contact.company || "—"}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Valor
                </Label>
                {isEditing ? (
                  <Input 
                    type="number"
                    value={formData.value || ""} 
                    onChange={(e) => setFormData({...formData, value: Number(e.target.value)})}
                    className="h-8"
                  />
                ) : (
                  <p className="text-sm text-gray-800 font-medium">
                    {contact.value ? `R$ ${contact.value.toLocaleString()}` : "—"}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notas</Label>
                {isEditing ? (
                  <Textarea 
                    value={formData.notes || ""} 
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="min-h-[100px] text-sm"
                  />
                ) : (
                  <div className="p-3 bg-yellow-50/50 border border-yellow-100 rounded-md text-sm text-gray-700 italic min-h-[60px]">
                    {contact.notes || "Sem notas."}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Tags
                </Label>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                      {tag}
                    </span>
                  ))}
                  {isEditing && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-primary">+ Adicionar</Button>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" /> Pedidos
                  </Label>
                  <Button 
                    data-testid="btn-new-order-chat"
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={openOrderDialog}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Novo
                  </Button>
                </div>

                {orders.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    Nenhum pedido
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orders.slice(0, 5).map((order) => {
                      const status = statusConfig[order.status] || statusConfig.pending;
                      return (
                        <div 
                          key={order.id} 
                          data-testid={`order-card-${order.id}`}
                          className="p-2 bg-gray-50 rounded-lg border border-gray-100"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">#{order.id}</span>
                            <Badge className={`${status.color} text-[10px] px-1.5 py-0`}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{formatDate(order.createdAt)}</span>
                            <span className="font-medium text-gray-700">
                              R$ {Number(order.total).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {orders.length > 5 && (
                      <Button variant="ghost" size="sm" className="w-full text-xs text-gray-500">
                        Ver todos ({orders.length} pedidos)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Pedido - {contact.name}</DialogTitle>
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

                  <div className="flex justify-end pt-2 text-base font-bold border-t">
                    Total: R$ {calculateTotal().toFixed(2)}
                  </div>
                </div>
              )}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              data-testid="btn-create-order-dialog"
              onClick={handleCreateOrder} 
              disabled={orderItems.length === 0 || orderItems.every(i => i.productId === 0)}
              className="bg-[#00A884] hover:bg-[#008f6f]"
            >
              Criar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
