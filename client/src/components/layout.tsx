import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Users, Package, ShoppingCart, Wheat, BookOpen, LogOut, User, Store, Box, Crown, Pencil, X, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateCompany } from "@/lib/hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const navItems = [
  { path: "/", icon: Users, label: "Clientes" },
  { path: "/estoque", icon: Package, label: "Produtos" },
  { path: "/ingredientes", icon: Wheat, label: "Ingredientes" },
  { path: "/embalagens", icon: Box, label: "Embalagens" },
  { path: "/pedidos", icon: ShoppingCart, label: "Pedidos" },
  { path: "/receitas", icon: BookOpen, label: "Receitas" },
  { path: "/equipe", icon: Users, label: "Equipe" },
  { path: "/plano", icon: Crown, label: "Plano" },
];

interface LayoutProps {
  children: React.ReactNode;
}

function UserInfo() {
  const { user } = useAuth();
  
  return (
    <div className="relative w-12 h-12 flex items-center justify-center rounded-lg cursor-pointer text-gray-400 hover:bg-gray-700 hover:text-white transition-all group">
      {user?.profileImageUrl ? (
        <img 
          src={user.profileImageUrl} 
          alt="Perfil" 
          className="w-8 h-8 rounded-full object-cover"
        />
      ) : (
        <User size={22} />
      )}
      <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
        {user?.firstName || user?.email || "Minha conta"}
      </span>
    </div>
  );
}

function CompanyLogo() {
  const { user } = useAuth();
  const updateCompany = useUpdateCompany();
  const [isOpen, setIsOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");

  const company = user?.company;
  const isAdmin = user?.activeRole === "admin" || user?.activeRole === "manager";

  const handleOpen = () => {
    setLogoUrl(company?.logoUrl || "");
    setIsOpen(true);
  };

  const handleSave = () => {
    updateCompany.mutate({ logoUrl: logoUrl || null }, {
      onSuccess: () => setIsOpen(false),
    });
  };

  return (
    <>
      <div 
        className="mb-6 p-2 relative group cursor-pointer"
        onClick={isAdmin ? handleOpen : undefined}
        data-testid="company-logo"
      >
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
          {company?.logoUrl ? (
            <img 
              src={company.logoUrl} 
              alt={company.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <Store className="w-6 h-6 text-white" />
          )}
        </div>
        {isAdmin && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-4 h-4 text-white" />
          </div>
        )}
        <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
          {company?.name || "Sua empresa"}
        </span>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Logo da empresa</DialogTitle>
            <DialogDescription>
              Cole a URL de uma imagem para usar como logo da sua empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <Store className="w-8 h-8 text-gray-400" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo-url">URL da imagem</Label>
              <Input
                id="logo-url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://exemplo.com/logo.png"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateCompany.isPending}>
              {updateCompany.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden">
      <nav className="w-16 bg-[#202C33] flex flex-col items-center py-4 gap-1">
        <CompanyLogo />
        
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <div
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`relative w-12 h-12 flex items-center justify-center rounded-lg cursor-pointer transition-all group
                  ${isActive 
                    ? "bg-[#25D366] text-white" 
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                  }`}
              >
                <Icon size={22} />
                <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
        
        <div className="mt-auto flex flex-col gap-1">
          <UserInfo />
          <div 
            data-testid="nav-logout"
            onClick={() => window.location.href = "/api/logout"}
            className="w-12 h-12 flex items-center justify-center rounded-lg cursor-pointer text-gray-400 hover:bg-red-600 hover:text-white transition-all group"
          >
            <LogOut size={22} />
            <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Sair
            </span>
          </div>
        </div>
      </nav>
      
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
