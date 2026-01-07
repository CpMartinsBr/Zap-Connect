import { useState } from "react";
import { Plus, Search, Edit2, Trash2, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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

const PACKAGING_TYPES = [
  { value: "caixa", label: "Caixa" },
  { value: "saco", label: "Saco/Sacola" },
  { value: "pote", label: "Pote" },
  { value: "lata", label: "Lata" },
  { value: "bandeja", label: "Bandeja" },
  { value: "filme", label: "Filme/Plástico" },
  { value: "fita", label: "Fita/Laço" },
  { value: "etiqueta", label: "Etiqueta" },
  { value: "outro", label: "Outro" },
];

export default function Packaging() {
  const { data: allIngredients = [], isLoading } = useIngredients();
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient();
  const deleteIngredient = useDeleteIngredient();

  const packagings = allIngredients.filter(ing => ing.kind === "packaging");

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState<Ingredient | null>(null);
  const [deletingPackaging, setDeletingPackaging] = useState<Ingredient | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    unit: "caixa",
    costPerUnit: "0",
    notes: "",
  });

  const filteredPackagings = packagings.filter(pkg => 
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddDialog = () => {
    setFormData({
      name: "",
      unit: "caixa",
      costPerUnit: "0",
      notes: "",
    });
    setEditingPackaging(null);
    setIsAddDialogOpen(true);
  };

  const handleEditPackaging = (packaging: Ingredient) => {
    setFormData({
      name: packaging.name,
      unit: packaging.unit,
      costPerUnit: packaging.costPerUnit,
      notes: packaging.notes || "",
    });
    setEditingPackaging(packaging);
    setIsAddDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return;

    if (editingPackaging) {
      const updates: UpdateIngredient = {
        name: formData.name,
        unit: formData.unit,
        costPerUnit: formData.costPerUnit,
        notes: formData.notes,
      };
      updateIngredient.mutate({
        id: editingPackaging.id,
        updates,
      }, {
        onSuccess: () => setIsAddDialogOpen(false),
      });
    } else {
      const data: InsertIngredient = {
        name: formData.name,
        kind: "packaging",
        unit: formData.unit,
        costPerUnit: formData.costPerUnit,
        stock: "0",
        minStock: "0",
        supplier: "",
        notes: formData.notes,
      };
      createIngredient.mutate(data, {
        onSuccess: () => setIsAddDialogOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (!deletingPackaging) return;
    deleteIngredient.mutate(deletingPackaging.id, {
      onSuccess: () => setDeletingPackaging(null),
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Carregando embalagens...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full p-6 bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Embalagens</h1>
          <p className="text-gray-500 text-sm">Caixas, sacolas, fitas e outros materiais de embalagem</p>
        </div>
        <Button onClick={handleOpenAddDialog} data-testid="btn-add-packaging">
          <Plus size={18} className="mr-2" />
          Nova Embalagem
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            data-testid="input-search-packaging"
            placeholder="Buscar embalagens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Box size={20} />
            Catálogo de Embalagens ({filteredPackagings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            {filteredPackagings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? "Nenhuma embalagem encontrada" : "Nenhuma embalagem cadastrada"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredPackagings.map((packaging) => (
                  <Card key={packaging.id} className="hover:shadow-md transition-shadow" data-testid={`card-packaging-${packaging.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Box size={20} className="text-amber-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{packaging.name}</h3>
                            <p className="text-sm text-gray-500">{packaging.unit}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            data-testid={`btn-edit-packaging-${packaging.id}`}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditPackaging(packaging)}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            data-testid={`btn-delete-packaging-${packaging.id}`}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => setDeletingPackaging(packaging)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Custo unitário</span>
                          <span className="font-medium text-green-600">
                            R$ {Number(packaging.costPerUnit).toFixed(2)}
                          </span>
                        </div>
                        {packaging.notes && (
                          <p className="text-xs text-gray-400 mt-2 line-clamp-2">{packaging.notes}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPackaging ? "Editar Embalagem" : "Nova Embalagem"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Embalagem *</Label>
              <Input
                id="name"
                data-testid="input-packaging-name"
                placeholder="Ex: Caixa Kraft 15x15"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                <SelectTrigger data-testid="select-packaging-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Custo Unitário (R$)</Label>
              <Input
                id="cost"
                data-testid="input-packaging-cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.costPerUnit}
                onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                data-testid="input-packaging-notes"
                placeholder="Detalhes sobre a embalagem..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              data-testid="btn-save-packaging"
              onClick={handleSave} 
              disabled={!formData.name || createIngredient.isPending || updateIngredient.isPending}
            >
              {createIngredient.isPending || updateIngredient.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingPackaging} onOpenChange={() => setDeletingPackaging(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir embalagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingPackaging?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="btn-confirm-delete-packaging"
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
