import { useState } from "react";
import { useOrders, useProducts, useContacts, useCreateOrder, useUpdateOrder, useDeleteOrder } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  ShoppingCart, 
  Trash2, 
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ChefHat,
  Search,
  User,
  Calendar,
} from "lucide-react";
import type { OrderWithItems, InsertOrder, InsertOrderItem, Product, Contact } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: <Clock size={14} /> },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800", icon: <CheckCircle size={14} /> },
  preparing: { label: "Preparando", color: "bg-purple-100 text-purple-800", icon: <ChefHat size={14} /> },
  ready: { label: "Pronto", color: "bg-green-100 text-green-800", icon: <CheckCircle size={14} /> },
  delivered: { label: "Entregue", color: "bg-gray-100 text-gray-800", icon: <Truck size={14} /> },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: <XCircle size={14} /> },
};

interface OrderItemForm {
  productId: number;
  quantity: number;
  unitPrice: string;
  notes?: string;
}

const paymentMethods = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "transferencia", label: "Transferência" },
];

export default function Orders() {
  const { data: orders = [], isLoading } = useOrders();
  const { data: products = [] } = useProducts();
  const { data: contacts = [] } = useContacts();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  const [formData, setFormData] = useState<Partial<InsertOrder>>({
    contactId: 0,
    status: "pending",
    deliveryAddress: "__pickup__",
    deliveryDate: null,
    deliveryTime: "",
    deliveryFee: "0",
    paymentMethod: "dinheiro",
    isPaid: 0,
    notes: "",
  });
  
  const [deliveryDateStr, setDeliveryDateStr] = useState("");

  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([]);

  const selectedContact = contacts.find(c => c.id === formData.contactId);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const ordersByStatus = {
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
  };

  const handleOpenForm = () => {
    setFormData({
      contactId: 0,
      status: "pending",
      deliveryAddress: "__pickup__",
      deliveryDate: null,
      deliveryTime: "",
      deliveryFee: "0",
      paymentMethod: "dinheiro",
      isPaid: 0,
      notes: "",
    });
    setDeliveryDateStr("");
    setOrderItems([]);
    setIsFormOpen(true);
  };

  const handleContactChange = (contactIdStr: string) => {
    const contactId = parseInt(contactIdStr);
    const contact = contacts.find(c => c.id === contactId);
    setFormData({ 
      ...formData, 
      contactId,
      deliveryAddress: contact?.addresses?.[0] || "__pickup__"
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
    return calculateSubtotal() + Number(formData.deliveryFee || 0);
  };

  const handleSubmit = () => {
    if (!formData.contactId || orderItems.length === 0) return;

    const items = orderItems.filter((item) => item.productId > 0).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes,
    }));

    createOrder.mutate({
      order: {
        contactId: formData.contactId!,
        status: formData.status || "pending",
        notes: formData.notes,
        total: calculateTotal().toFixed(2),
        deliveryFee: formData.deliveryFee || "0",
        deliveryAddress: formData.deliveryAddress === "__pickup__" ? null : (formData.deliveryAddress || null),
        deliveryDate: deliveryDateStr ? new Date(deliveryDateStr) : null,
        deliveryTime: formData.deliveryTime || null,
        paymentMethod: formData.paymentMethod || "dinheiro",
        isPaid: formData.isPaid || 0,
      } as InsertOrder,
      items,
    });
    setIsFormOpen(false);
  };

  const handleStatusChange = (orderId: number, status: string) => {
    updateOrder.mutate({ id: orderId, updates: { status } });
  };

  const handleDelete = (id: number, contactId?: number) => {
    if (confirm("Tem certeza que deseja excluir este pedido? O estoque será restaurado.")) {
      deleteOrder.mutate({ id, contactId });
      setSelectedOrder(null);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Carregando pedidos...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white">
      <div className="flex-1 flex flex-col">
        <header className="bg-[#00A884] text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart size={28} />
              <h1 className="text-xl font-semibold">Gestão de Pedidos</h1>
            </div>
            <Button 
              data-testid="btn-add-order"
              onClick={handleOpenForm} 
              className="bg-white text-[#00A884] hover:bg-gray-100"
            >
              <Plus size={18} className="mr-2" />
              Novo Pedido
            </Button>
          </div>
        </header>

        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex gap-4 mb-4">
            <Card className="flex-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Clock size={20} className="text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{ordersByStatus.pending}</div>
                  <div className="text-sm text-gray-500">Pendentes</div>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <ChefHat size={20} className="text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{ordersByStatus.preparing}</div>
                  <div className="text-sm text-gray-500">Preparando</div>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{ordersByStatus.ready}</div>
                  <div className="text-sm text-gray-500">Prontos</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                data-testid="input-search-order"
                placeholder="Buscar por cliente ou número do pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter" className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhum pedido encontrado
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredOrders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                return (
                  <Card 
                    key={order.id} 
                    data-testid={`card-order-${order.id}`}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedOrder?.id === order.id ? "ring-2 ring-[#00A884]" : ""
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <User size={20} className="text-gray-500" />
                          </div>
                          <div>
                            <div className="font-medium">
                              Pedido #{order.id} - {order.contact?.name || "Cliente"}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              <Calendar size={14} />
                              {formatDate(order.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              R$ {Number(order.total).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.items.length} item(s)
                            </div>
                          </div>
                          <Badge className={`${status.color} flex items-center gap-1`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="w-96 border-l bg-gray-50 flex flex-col">
          <div className="p-4 border-b bg-white">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Pedido #{selectedOrder.id}</h2>
              <Button
                data-testid="btn-delete-order"
                variant="ghost"
                size="icon"
                className="text-red-500"
                onClick={() => handleDelete(selectedOrder.id, selectedOrder.contactId)}
              >
                <Trash2 size={18} />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-medium">{selectedOrder.contact?.name}</div>
                <div className="text-sm text-gray-500">{selectedOrder.contact?.phone}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select 
                  value={selectedOrder.status} 
                  onValueChange={(v) => handleStatusChange(selectedOrder.id, v)}
                >
                  <SelectTrigger data-testid="select-order-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Itens do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="flex justify-between py-2 border-b last:border-0">
                    <div>
                      <div className="font-medium">{item.product?.name}</div>
                      <div className="text-sm text-gray-500">
                        {item.quantity}x R$ {Number(item.unitPrice).toFixed(2)}
                      </div>
                    </div>
                    <div className="font-medium">
                      R$ {(item.quantity * Number(item.unitPrice)).toFixed(2)}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold">
                  <span>Total</span>
                  <span>R$ {Number(selectedOrder.total).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {selectedOrder.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo Pedido</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select 
                value={formData.contactId?.toString() || ""} 
                onValueChange={handleContactChange}
              >
                <SelectTrigger data-testid="select-order-contact">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id.toString()}>
                      {contact.name} - {contact.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens do Pedido *</Label>
                <Button 
                  data-testid="btn-add-item"
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addOrderItem}
                >
                  <Plus size={16} className="mr-1" />
                  Adicionar
                </Button>
              </div>

              {orderItems.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  Adicione itens ao pedido
                </div>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-xs">Produto</Label>
                        <Select 
                          value={item.productId?.toString() || ""} 
                          onValueChange={(v) => updateOrderItem(index, { productId: parseInt(v) })}
                        >
                          <SelectTrigger data-testid={`select-item-product-${index}`} className="mt-1">
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
                      <div className="w-20">
                        <Label className="text-xs">Qtd</Label>
                        <Input
                          data-testid={`input-item-quantity-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, { quantity: parseInt(e.target.value) || 1 })}
                          className="mt-1"
                        />
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Preço</Label>
                        <Input
                          data-testid={`input-item-price-${index}`}
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateOrderItem(index, { unitPrice: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        data-testid={`btn-remove-item-${index}`}
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => removeOrderItem(index)}
                      >
                        <Trash2 size={16} />
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
                <Label>Data de Entrega</Label>
                <Input
                  data-testid="input-order-delivery-date"
                  type="date"
                  value={deliveryDateStr}
                  onChange={(e) => setDeliveryDateStr(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Horário de Entrega</Label>
                <Input
                  data-testid="input-order-delivery-time"
                  type="time"
                  value={formData.deliveryTime || ""}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Endereço de Entrega</Label>
                <Select 
                  value={formData.deliveryAddress || "__pickup__"} 
                  onValueChange={(v) => setFormData({ ...formData, deliveryAddress: v })}
                  disabled={!selectedContact}
                >
                  <SelectTrigger data-testid="select-order-address">
                    <SelectValue placeholder="Selecione o endereço" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__pickup__">Retirar no local</SelectItem>
                    {selectedContact?.addresses?.map((addr, i) => (
                      <SelectItem key={i} value={addr}>{addr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Taxa de Entrega</Label>
                <Input
                  data-testid="input-order-delivery-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.deliveryFee || "0"}
                  onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select 
                  value={formData.paymentMethod || "dinheiro"} 
                  onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
                >
                  <SelectTrigger data-testid="select-order-payment">
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
                <Label>Status do Pagamento</Label>
                <div className="flex items-center gap-2 h-10">
                  <Checkbox 
                    id="isPaidOrder"
                    data-testid="checkbox-order-is-paid"
                    checked={formData.isPaid === 1}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked ? 1 : 0 })}
                  />
                  <label htmlFor="isPaidOrder" className="text-sm cursor-pointer">
                    Pago
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                data-testid="input-order-notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações sobre o pedido"
                rows={3}
              />
            </div>

            <div className="flex justify-end pt-2 text-lg font-bold border-t">
              Total: R$ {calculateTotal().toFixed(2)}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button 
              data-testid="btn-save-order"
              onClick={handleSubmit} 
              disabled={!formData.contactId || orderItems.length === 0}
              className="bg-[#00A884] hover:bg-[#008f6f]"
            >
              Criar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
