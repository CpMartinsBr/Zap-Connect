import { useState, useEffect } from "react";
import { 
  useProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useUpdateStock, 
  useDeleteProduct,
  useProductWithComponents,
  useSetProductComponents,
  useRecipes,
  useIngredients,
} from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Package, 
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Search,
  Settings2,
  Box,
  ChefHat,
  X,
} from "lucide-react";
import type { Product, InsertProduct } from "@shared/schema";

const categories = ["Bombons", "Macarons", "Fudge", "Drágeas", "Pão de Mel", "Torrone"];
const units = ["un", "kg", "g", "L", "ml", "dz"];

type RecipeComponentInput = { recipeId: number; quantity: string };
type PackagingComponentInput = { ingredientId: number; quantity: string };

export default function Inventory() {
  const { data: products = [], isLoading } = useProducts();
  const { data: recipes = [] } = useRecipes();
  const { data: ingredients = [] } = useIngredients();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const updateStock = useUpdateStock();
  const deleteProduct = useDeleteProduct();
  const setProductComponents = useSetProductComponents();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isCompositionOpen, setIsCompositionOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [compositionProduct, setCompositionProduct] = useState<Product | null>(null);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [recipeComponents, setRecipeComponents] = useState<RecipeComponentInput[]>([]);
  const [packagingComponents, setPackagingComponents] = useState<PackagingComponentInput[]>([]);

  const { data: productWithComponents } = useProductWithComponents(compositionProduct?.id || null);
  
  const packagingIngredients = ingredients.filter(ing => ing.kind === "packaging");

  const [formData, setFormData] = useState<Partial<InsertProduct>>({
    name: "",
    description: "",
    category: "Bombons",
    unit: "un",
    price: "0",
    cost: "0",
    stock: 0,
    minStock: 5,
  });

  useEffect(() => {
    if (productWithComponents) {
      setRecipeComponents(
        productWithComponents.recipeComponents.map(c => ({
          recipeId: c.recipeId,
          quantity: c.quantity,
        }))
      );
      setPackagingComponents(
        productWithComponents.packagingComponents.map(c => ({
          ingredientId: c.ingredientId,
          quantity: c.quantity,
        }))
      );
    }
  }, [productWithComponents]);

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
        category: "Bombons",
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

  const handleOpenComposition = (product: Product) => {
    setCompositionProduct(product);
    setRecipeComponents([]);
    setPackagingComponents([]);
    setIsCompositionOpen(true);
  };

  const handleAddRecipeComponent = () => {
    if (recipes.length === 0) return;
    const firstUnused = recipes.find(r => !recipeComponents.some(c => c.recipeId === r.id));
    if (firstUnused) {
      setRecipeComponents([...recipeComponents, { recipeId: firstUnused.id, quantity: "1" }]);
    }
  };

  const handleAddPackagingComponent = () => {
    if (packagingIngredients.length === 0) return;
    const firstUnused = packagingIngredients.find(p => !packagingComponents.some(c => c.ingredientId === p.id));
    if (firstUnused) {
      setPackagingComponents([...packagingComponents, { ingredientId: firstUnused.id, quantity: "1" }]);
    }
  };

  const handleRemoveRecipeComponent = (index: number) => {
    setRecipeComponents(recipeComponents.filter((_, i) => i !== index));
  };

  const handleRemovePackagingComponent = (index: number) => {
    setPackagingComponents(packagingComponents.filter((_, i) => i !== index));
  };

  const handleSaveComposition = () => {
    if (!compositionProduct) return;
    setProductComponents.mutate({
      productId: compositionProduct.id,
      recipeComponents,
      packagingComponents,
    }, {
      onSuccess: () => setIsCompositionOpen(false),
    });
  };

  const calculateCompositionCost = () => {
    let total = 0;
    recipeComponents.forEach(comp => {
      const recipe = recipes.find(r => r.id === comp.recipeId);
      if (recipe) {
        total += recipe.costPerUnit * parseFloat(comp.quantity || "0");
      }
    });
    packagingComponents.forEach(comp => {
      const ingredient = packagingIngredients.find(p => p.id === comp.ingredientId);
      if (ingredient) {
        total += parseFloat(ingredient.costPerUnit || "0") * parseFloat(comp.quantity || "0");
      }
    });
    return total;
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
                        data-testid={`btn-composition-${product.id}`}
                        variant="ghost"
                        size="icon"
                        title="Composição do produto"
                        onClick={() => handleOpenComposition(product)}
                      >
                        <Settings2 size={16} />
                      </Button>
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

      <Dialog open={isCompositionOpen} onOpenChange={setIsCompositionOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Composição do Produto</DialogTitle>
            <DialogDescription>
              Configure os itens que compõem o produto "{compositionProduct?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ChefHat size={18} className="text-amber-600" />
                  <Label className="font-semibold">Receitas</Label>
                </div>
                <Button
                  data-testid="btn-add-recipe-component"
                  size="sm"
                  variant="outline"
                  onClick={handleAddRecipeComponent}
                  disabled={recipes.length === 0 || recipeComponents.length >= recipes.length}
                >
                  <Plus size={14} className="mr-1" />
                  Adicionar
                </Button>
              </div>
              
              {recipeComponents.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4 border rounded-lg">
                  Nenhuma receita adicionada
                </div>
              ) : (
                <div className="space-y-2">
                  {recipeComponents.map((comp, index) => {
                    const recipe = recipes.find(r => r.id === comp.recipeId);
                    return (
                      <Card key={index}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <Select
                            value={String(comp.recipeId)}
                            onValueChange={(v) => {
                              const updated = [...recipeComponents];
                              updated[index].recipeId = parseInt(v);
                              setRecipeComponents(updated);
                            }}
                          >
                            <SelectTrigger data-testid={`select-recipe-${index}`} className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {recipes.map((r) => (
                                <SelectItem key={r.id} value={String(r.id)}>
                                  {r.name} (R$ {r.costPerUnit.toFixed(2)}/un)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            data-testid={`input-recipe-qty-${index}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={comp.quantity}
                            onChange={(e) => {
                              const updated = [...recipeComponents];
                              updated[index].quantity = e.target.value;
                              setRecipeComponents(updated);
                            }}
                            className="w-20 text-center"
                          />
                          <span className="text-sm text-gray-500">un</span>
                          <span className="text-sm font-medium w-24 text-right">
                            R$ {((recipe?.costPerUnit || 0) * parseFloat(comp.quantity || "0")).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRecipeComponent(index)}
                          >
                            <X size={16} />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Box size={18} className="text-blue-600" />
                  <Label className="font-semibold">Embalagens</Label>
                </div>
                <Button
                  data-testid="btn-add-packaging-component"
                  size="sm"
                  variant="outline"
                  onClick={handleAddPackagingComponent}
                  disabled={packagingIngredients.length === 0 || packagingComponents.length >= packagingIngredients.length}
                >
                  <Plus size={14} className="mr-1" />
                  Adicionar
                </Button>
              </div>
              
              {packagingIngredients.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4 border rounded-lg">
                  Nenhuma embalagem cadastrada. Cadastre em Estoque com tipo "Embalagem".
                </div>
              ) : packagingComponents.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4 border rounded-lg">
                  Nenhuma embalagem adicionada
                </div>
              ) : (
                <div className="space-y-2">
                  {packagingComponents.map((comp, index) => {
                    const packaging = packagingIngredients.find(p => p.id === comp.ingredientId);
                    return (
                      <Card key={index}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <Select
                            value={String(comp.ingredientId)}
                            onValueChange={(v) => {
                              const updated = [...packagingComponents];
                              updated[index].ingredientId = parseInt(v);
                              setPackagingComponents(updated);
                            }}
                          >
                            <SelectTrigger data-testid={`select-packaging-${index}`} className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {packagingIngredients.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.name} (R$ {parseFloat(p.costPerUnit || "0").toFixed(2)}/un)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            data-testid={`input-packaging-qty-${index}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={comp.quantity}
                            onChange={(e) => {
                              const updated = [...packagingComponents];
                              updated[index].quantity = e.target.value;
                              setPackagingComponents(updated);
                            }}
                            className="w-20 text-center"
                          />
                          <span className="text-sm text-gray-500">un</span>
                          <span className="text-sm font-medium w-24 text-right">
                            R$ {(parseFloat(packaging?.costPerUnit || "0") * parseFloat(comp.quantity || "0")).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePackagingComponent(index)}
                          >
                            <X size={16} />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Custo Total Calculado:</span>
                  <span className="text-xl font-bold text-[#00A884]">
                    R$ {calculateCompositionCost().toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompositionOpen(false)}>
              Cancelar
            </Button>
            <Button 
              data-testid="btn-save-composition"
              onClick={handleSaveComposition}
              disabled={setProductComponents.isPending}
              className="bg-[#00A884] hover:bg-[#008f6f]"
            >
              {setProductComponents.isPending ? "Salvando..." : "Salvar Composição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
