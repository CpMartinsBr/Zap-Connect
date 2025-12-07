import { useState } from "react";
import { useProducts, useCreateProduct, useUpdateProduct, useUpdateStock, useDeleteProduct } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Package, 
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Search,
} from "lucide-react";
import type { Product, InsertProduct } from "@shared/schema";

const categories = ["Bolo", "Doce", "Salgado", "Bebida", "Ingrediente", "Produto"];
const units = ["un", "kg", "g", "L", "ml", "dz"];

export default function Inventory() {
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const updateStock = useUpdateStock();
  const deleteProduct = useDeleteProduct();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [formData, setFormData] = useState<Partial<InsertProduct>>({
    name: "",
    description: "",
    category: "Produto",
    unit: "un",
    price: "0",
    cost: "0",
    stock: 0,
    minStock: 5,
  });

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = products.filter(
    (p) => p.stock <= (p.minStock || 5) && p.active === 1
  );

  const handleOpenForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        category: product.category,
        unit: product.unit,
        price: product.price,
        cost: product.cost || "0",
        stock: product.stock,
        minStock: product.minStock || 5,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        category: "Produto",
        unit: "un",
        price: "0",
        cost: "0",
        stock: 0,
        minStock: 5,
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) return;

    if (editingProduct) {
      updateProduct.mutate({
        id: editingProduct.id,
        updates: formData,
      });
    } else {
      createProduct.mutate(formData as InsertProduct);
    }
    setIsFormOpen(false);
  };

  const handleOpenStock = (product: Product) => {
    setStockProduct(product);
    setStockQuantity(0);
    setIsStockOpen(true);
  };

  const handleStockUpdate = (add: boolean) => {
    if (!stockProduct || stockQuantity === 0) return;
    updateStock.mutate({
      id: stockProduct.id,
      quantity: add ? stockQuantity : -stockQuantity,
    });
    setIsStockOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      deleteProduct.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Carregando produtos...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <header className="bg-[#00A884] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package size={28} />
            <h1 className="text-xl font-semibold">Controle de Estoque</h1>
          </div>
          <Button 
            data-testid="btn-add-product"
            onClick={() => handleOpenForm()} 
            className="bg-white text-[#00A884] hover:bg-gray-100"
          >
            <Plus size={18} className="mr-2" />
            Novo Produto
          </Button>
        </div>
      </header>

      {lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle size={18} />
            <span className="font-medium">
              {lowStockProducts.length} produto(s) com estoque baixo
            </span>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-b bg-gray-50 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            data-testid="input-search-product"
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger data-testid="select-category-filter" className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-center">Estoque</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-gray-500">{product.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {Number(product.price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-gray-500">
                    R$ {Number(product.cost || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      data-testid={`btn-stock-${product.id}`}
                      onClick={() => handleOpenStock(product)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors
                        ${product.stock <= (product.minStock || 5)
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                    >
                      {product.stock} {product.unit}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        data-testid={`btn-edit-${product.id}`}
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenForm(product)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        data-testid={`btn-delete-${product.id}`}
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                data-testid="input-product-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do produto"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                data-testid="input-product-description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger data-testid="select-product-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select 
                  value={formData.unit} 
                  onValueChange={(v) => setFormData({ ...formData, unit: v })}
                >
                  <SelectTrigger data-testid="select-product-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço de Venda</Label>
                <Input
                  data-testid="input-product-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Custo</Label>
                <Input
                  data-testid="input-product-cost"
                  type="number"
                  step="0.01"
                  value={formData.cost || ""}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estoque Atual</Label>
                <Input
                  data-testid="input-product-stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Estoque Mínimo</Label>
                <Input
                  data-testid="input-product-minstock"
                  type="number"
                  value={formData.minStock ?? 5}
                  onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button 
              data-testid="btn-save-product"
              onClick={handleSubmit} 
              disabled={!formData.name}
              className="bg-[#00A884] hover:bg-[#008f6f]"
            >
              {editingProduct ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStockOpen} onOpenChange={setIsStockOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
          </DialogHeader>
          
          {stockProduct && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="font-medium">{stockProduct.name}</div>
                <div className="text-2xl font-bold text-gray-700 mt-2">
                  {stockProduct.stock} {stockProduct.unit}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  data-testid="input-stock-quantity"
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                  className="text-center text-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  data-testid="btn-stock-add"
                  onClick={() => handleStockUpdate(true)}
                  disabled={stockQuantity === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ArrowUp size={16} className="mr-2" />
                  Entrada
                </Button>
                <Button
                  data-testid="btn-stock-remove"
                  onClick={() => handleStockUpdate(false)}
                  disabled={stockQuantity === 0}
                  variant="destructive"
                >
                  <ArrowDown size={16} className="mr-2" />
                  Saída
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
