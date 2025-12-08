import { useState } from "react";
import { Plus, Search, Edit2, Trash2, AlertTriangle, Wheat, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIngredients, useCreateIngredient, useUpdateIngredient, useDeleteIngredient } from "@/lib/hooks";
import type { Ingredient, InsertIngredient, UpdateIngredient } from "@shared/schema";

const UNITS = [
  { value: "g", label: "Gramas (g)" },
  { value: "kg", label: "Quilogramas (kg)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "L", label: "Litros (L)" },
  { value: "un", label: "Unidades (un)" },
  { value: "dz", label: "Dúzias (dz)" },
];

const KINDS = [
  { value: "ingredient", label: "Ingrediente" },
  { value: "packaging", label: "Embalagem" },
];

export default function Ingredients() {
  const { data: ingredients = [], isLoading } = useIngredients();
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient();
  const deleteIngredient = useDeleteIngredient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [deletingIngredient, setDeletingIngredient] = useState<Ingredient | null>(null);

  const [formData, setFormData] = useState<Partial<InsertIngredient>>({
    name: "",
    kind: "ingredient",
    unit: "g",
    costPerUnit: "0",
    stock: "0",
    minStock: "100",
    supplier: "",
    notes: "",
  });
  const [kindFilter, setKindFilter] = useState<string>("all");

  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ing.supplier?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesKind = kindFilter === "all" || ing.kind === kindFilter;
    return matchesSearch && matchesKind;
  });

  const lowStockIngredients = ingredients.filter(ing => 
    parseFloat(ing.stock || "0") < parseFloat(ing.minStock || "0")
  );

  const handleOpenAddDialog = () => {
    setFormData({
      name: "",
      kind: "ingredient",
      unit: "g",
      costPerUnit: "0",
      stock: "0",
      minStock: "100",
      supplier: "",
      notes: "",
    });
    setEditingIngredient(null);
    setIsAddDialogOpen(true);
  };

  const handleEditIngredient = (ingredient: Ingredient) => {
    setFormData({
      name: ingredient.name,
      kind: ingredient.kind || "ingredient",
      unit: ingredient.unit,
      costPerUnit: ingredient.costPerUnit,
      stock: ingredient.stock || "0",
      minStock: ingredient.minStock || "100",
      supplier: ingredient.supplier || "",
      notes: ingredient.notes || "",
    });
    setEditingIngredient(ingredient);
    setIsAddDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return;

    if (editingIngredient) {
      updateIngredient.mutate({
        id: editingIngredient.id,
        updates: formData as UpdateIngredient,
      }, {
        onSuccess: () => setIsAddDialogOpen(false),
      });
    } else {
      createIngredient.mutate(formData as InsertIngredient, {
        onSuccess: () => setIsAddDialogOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (!deletingIngredient) return;
    deleteIngredient.mutate(deletingIngredient.id, {
      onSuccess: () => setDeletingIngredient(null),
    });
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(value || "0"));
  };

  return (
    <div className="flex h-full bg-gray-50">
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Wheat className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ingredientes</h1>
                <p className="text-sm text-gray-500">Gerencie seus ingredientes e custos</p>
              </div>
            </div>
            <Button 
              data-testid="btn-add-ingredient"
              onClick={handleOpenAddDialog}
              className="bg-[#25D366] hover:bg-[#1fb855]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Ingrediente
            </Button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-hidden flex flex-col gap-6">
          {lowStockIngredients.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-800 flex items-center gap-2 text-base">
                  <AlertTriangle className="w-5 h-5" />
                  Estoque Baixo ({lowStockIngredients.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {lowStockIngredients.map(ing => (
                    <span 
                      key={ing.id}
                      className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                    >
                      {ing.name}: {parseFloat(ing.stock || "0").toFixed(0)}{ing.unit}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                data-testid="input-search-ingredient"
                placeholder="Buscar ingrediente..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger data-testid="select-kind-filter" className="w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ingredient">Ingredientes</SelectItem>
                <SelectItem value="packaging">Embalagens</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#25D366]" />
              </div>
            ) : filteredIngredients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Wheat className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhum ingrediente encontrado</p>
                <p className="text-sm">Clique no botão acima para adicionar um novo ingrediente</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIngredients.map((ingredient) => {
                  const isLowStock = parseFloat(ingredient.stock || "0") < parseFloat(ingredient.minStock || "0");
                  return (
                    <Card 
                      key={ingredient.id}
                      data-testid={`ingredient-card-${ingredient.id}`}
                      className={`hover:shadow-md transition-shadow ${isLowStock ? "border-amber-300" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{ingredient.name}</h3>
                              <Badge variant={ingredient.kind === "packaging" ? "secondary" : "outline"} className="text-xs">
                                {ingredient.kind === "packaging" ? (
                                  <><Box className="w-3 h-3 mr-1" />Embalagem</>
                                ) : (
                                  <>Ingrediente</>
                                )}
                              </Badge>
                            </div>
                            {ingredient.supplier && (
                              <p className="text-sm text-gray-500">{ingredient.supplier}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              data-testid={`btn-edit-ingredient-${ingredient.id}`}
                              onClick={() => handleEditIngredient(ingredient)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              data-testid={`btn-delete-ingredient-${ingredient.id}`}
                              onClick={() => setDeletingIngredient(ingredient)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Custo por {ingredient.unit}:</span>
                            <span className="font-medium">{formatCurrency(ingredient.costPerUnit)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Estoque:</span>
                            <span className={`font-medium ${isLowStock ? "text-amber-600" : "text-green-600"}`}>
                              {parseFloat(ingredient.stock || "0").toFixed(2)} {ingredient.unit}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Mínimo:</span>
                            <span className="font-medium">
                              {parseFloat(ingredient.minStock || "0").toFixed(0)} {ingredient.unit}
                            </span>
                          </div>
                        </div>

                        {ingredient.notes && (
                          <p className="mt-3 text-xs text-gray-500 italic">
                            {ingredient.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingIngredient ? "Editar Ingrediente" : "Novo Ingrediente"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  data-testid="input-ingredient-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Farinha de Trigo"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select 
                  value={formData.kind || "ingredient"} 
                  onValueChange={(value) => setFormData({ ...formData, kind: value })}
                >
                  <SelectTrigger data-testid="select-ingredient-kind">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((kind) => (
                      <SelectItem key={kind.value} value={kind.value}>
                        {kind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidade *</Label>
                <Select 
                  value={formData.unit} 
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger data-testid="select-ingredient-unit">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Custo por Unidade</Label>
                <Input
                  data-testid="input-ingredient-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costPerUnit}
                  onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estoque Atual</Label>
                <Input
                  data-testid="input-ingredient-stock"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.stock || ""}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Estoque Mínimo</Label>
                <Input
                  data-testid="input-ingredient-min-stock"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minStock || ""}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input
                data-testid="input-ingredient-supplier"
                value={formData.supplier || ""}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Nome do fornecedor"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                data-testid="input-ingredient-notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anotações sobre o ingrediente"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              data-testid="btn-save-ingredient"
              onClick={handleSave}
              disabled={!formData.name || createIngredient.isPending || updateIngredient.isPending}
              className="bg-[#25D366] hover:bg-[#1fb855]"
            >
              {(createIngredient.isPending || updateIngredient.isPending) ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingIngredient} onOpenChange={() => setDeletingIngredient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o ingrediente "{deletingIngredient?.name}"? 
              Isso também removerá o ingrediente de todas as receitas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
