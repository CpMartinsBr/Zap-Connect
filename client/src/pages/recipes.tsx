import { useState } from "react";
import { Plus, Search, Edit2, Trash2, BookOpen, Calculator, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
import { useRecipes, useIngredients, useProducts, useCreateRecipe, useUpdateRecipe, useDeleteRecipe } from "@/lib/hooks";
import type { RecipeWithItems, InsertRecipe, InsertRecipeItem } from "@shared/schema";

interface RecipeFormItem {
  ingredientId: number;
  quantity: string;
}

export default function Recipes() {
  const { data: recipes = [], isLoading } = useRecipes();
  const { data: ingredients = [] } = useIngredients();
  const { data: products = [] } = useProducts();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithItems | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<RecipeWithItems | null>(null);

  const [formData, setFormData] = useState<Partial<InsertRecipe>>({
    productId: 0,
    name: "",
    yield: 1,
    yieldUnit: "un",
    instructions: "",
    notes: "",
  });
  const [recipeItems, setRecipeItems] = useState<RecipeFormItem[]>([]);

  const filteredRecipes = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productsWithoutRecipe = products.filter(
    p => !recipes.some(r => r.productId === p.id) || editingRecipe?.productId === p.id
  );

  const handleOpenAddDialog = () => {
    setFormData({
      productId: 0,
      name: "",
      yield: 1,
      yieldUnit: "un",
      instructions: "",
      notes: "",
    });
    setRecipeItems([]);
    setEditingRecipe(null);
    setIsAddDialogOpen(true);
  };

  const handleEditRecipe = (recipe: RecipeWithItems) => {
    setFormData({
      productId: recipe.productId,
      name: recipe.name,
      yield: recipe.yield || 1,
      yieldUnit: recipe.yieldUnit || "un",
      instructions: recipe.instructions || "",
      notes: recipe.notes || "",
    });
    setRecipeItems(recipe.items.map(item => ({
      ingredientId: item.ingredientId,
      quantity: item.quantity,
    })));
    setEditingRecipe(recipe);
    setIsAddDialogOpen(true);
  };

  const handleAddIngredientToRecipe = () => {
    if (ingredients.length === 0) return;
    const availableIngredient = ingredients.find(
      i => !recipeItems.some(ri => ri.ingredientId === i.id)
    );
    if (availableIngredient) {
      setRecipeItems([...recipeItems, { ingredientId: availableIngredient.id, quantity: "0" }]);
    }
  };

  const handleRemoveIngredientFromRecipe = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const handleUpdateRecipeItem = (index: number, field: keyof RecipeFormItem, value: string | number) => {
    const updated = [...recipeItems];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeItems(updated);
  };

  const calculateRecipeCost = () => {
    let totalCost = 0;
    for (const item of recipeItems) {
      const ingredient = ingredients.find(i => i.id === item.ingredientId);
      if (ingredient) {
        const cost = parseFloat(ingredient.costPerUnit || "0");
        const qty = parseFloat(item.quantity || "0");
        totalCost += cost * qty;
      }
    }
    return totalCost;
  };

  const handleSave = () => {
    if (!formData.productId || !formData.name) return;

    const items: Omit<InsertRecipeItem, "recipeId">[] = recipeItems
      .filter(item => item.ingredientId && parseFloat(item.quantity) > 0)
      .map(item => ({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
      }));

    if (editingRecipe) {
      updateRecipe.mutate({
        id: editingRecipe.id,
        updates: formData,
        items,
      }, {
        onSuccess: () => setIsAddDialogOpen(false),
      });
    } else {
      createRecipe.mutate({
        recipe: formData as InsertRecipe,
        items,
      }, {
        onSuccess: () => setIsAddDialogOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (!deletingRecipe) return;
    deleteRecipe.mutate(deletingRecipe.id, {
      onSuccess: () => setDeletingRecipe(null),
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="flex h-full bg-gray-50">
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Receitas</h1>
                <p className="text-sm text-gray-500">Calcule custos de produção dos seus produtos</p>
              </div>
            </div>
            <Button 
              data-testid="btn-add-recipe"
              onClick={handleOpenAddDialog}
              className="bg-[#25D366] hover:bg-[#1fb855]"
              disabled={productsWithoutRecipe.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Receita
            </Button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-hidden flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{recipes.length}</p>
                    <p className="text-sm text-gray-500">Receitas cadastradas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calculator className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(recipes.reduce((acc, r) => acc + (r.costPerUnit || 0), 0) / (recipes.length || 1))}
                    </p>
                    <p className="text-sm text-gray-500">Custo médio por unidade</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Package className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{products.length - recipes.length}</p>
                    <p className="text-sm text-gray-500">Produtos sem receita</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              data-testid="input-search-recipe"
              placeholder="Buscar receita ou produto..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#25D366]" />
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <BookOpen className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhuma receita encontrada</p>
                <p className="text-sm">Clique no botão acima para adicionar uma nova receita</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredRecipes.map((recipe) => (
                  <Card 
                    key={recipe.id}
                    data-testid={`recipe-card-${recipe.id}`}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{recipe.name}</CardTitle>
                          <p className="text-sm text-gray-500">
                            Produto: {recipe.product?.name || "N/A"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            data-testid={`btn-edit-recipe-${recipe.id}`}
                            onClick={() => handleEditRecipe(recipe)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            data-testid={`btn-delete-recipe-${recipe.id}`}
                            onClick={() => setDeletingRecipe(recipe)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {recipe.items.slice(0, 5).map((item) => (
                            <Badge key={item.id} variant="secondary" className="text-xs">
                              {item.ingredient?.name}: {parseFloat(item.quantity).toFixed(1)}{item.ingredient?.unit}
                            </Badge>
                          ))}
                          {recipe.items.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{recipe.items.length - 5} mais
                            </Badge>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t">
                          <div>
                            <span className="text-sm text-gray-500">Rendimento: </span>
                            <span className="font-medium">{recipe.yield} {recipe.yieldUnit}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Custo por unidade</p>
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(recipe.costPerUnit || 0)}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-lg">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Custo total da receita:</span>
                            <span className="font-medium">{formatCurrency(recipe.totalCost || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecipe ? "Editar Receita" : "Nova Receita"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select 
                  value={formData.productId?.toString()} 
                  onValueChange={(value) => {
                    const product = products.find(p => p.id === parseInt(value));
                    setFormData({ 
                      ...formData, 
                      productId: parseInt(value),
                      name: product?.name || formData.name,
                    });
                  }}
                  disabled={!!editingRecipe}
                >
                  <SelectTrigger data-testid="select-recipe-product">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {(editingRecipe ? products : productsWithoutRecipe).map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome da Receita *</Label>
                <Input
                  data-testid="input-recipe-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Bolo de Chocolate"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rendimento</Label>
                <Input
                  data-testid="input-recipe-yield"
                  type="number"
                  min="1"
                  value={formData.yield ?? 1}
                  onChange={(e) => setFormData({ ...formData, yield: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Unidade do Rendimento</Label>
                <Input
                  data-testid="input-recipe-yield-unit"
                  value={formData.yieldUnit || ""}
                  onChange={(e) => setFormData({ ...formData, yieldUnit: e.target.value })}
                  placeholder="un, fatias, porções..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Ingredientes</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddIngredientToRecipe}
                  disabled={recipeItems.length >= ingredients.length}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {recipeItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4 border rounded-lg">
                  Nenhum ingrediente adicionado. Clique em "Adicionar" para começar.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recipeItems.map((item, index) => {
                    const ingredient = ingredients.find(i => i.id === item.ingredientId);
                    return (
                      <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
                        <Select
                          value={item.ingredientId.toString()}
                          onValueChange={(value) => handleUpdateRecipeItem(index, "ingredientId", parseInt(value))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {ingredients.map((ing) => (
                              <SelectItem key={ing.id} value={ing.id.toString()}>
                                {ing.name} ({ing.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24"
                          value={item.quantity}
                          onChange={(e) => handleUpdateRecipeItem(index, "quantity", e.target.value)}
                          placeholder="Qtd"
                        />

                        <span className="text-sm text-gray-500 w-8">
                          {ingredient?.unit}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveIngredientFromRecipe(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-green-700">Custo total da receita</p>
                    <p className="text-2xl font-bold text-green-800">{formatCurrency(calculateRecipeCost())}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-700">Custo por {formData.yieldUnit || "unidade"}</p>
                    <p className="text-2xl font-bold text-green-800">
                      {formatCurrency(calculateRecipeCost() / (formData.yield || 1))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Modo de Preparo</Label>
              <textarea
                data-testid="input-recipe-instructions"
                className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
                value={formData.instructions || ""}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Descreva o passo a passo..."
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                data-testid="input-recipe-notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              data-testid="btn-save-recipe"
              onClick={handleSave}
              disabled={!formData.productId || !formData.name || createRecipe.isPending || updateRecipe.isPending}
              className="bg-[#25D366] hover:bg-[#1fb855]"
            >
              {(createRecipe.isPending || updateRecipe.isPending) ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRecipe} onOpenChange={() => setDeletingRecipe(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a receita "{deletingRecipe?.name}"? 
              Esta ação não pode ser desfeita.
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
