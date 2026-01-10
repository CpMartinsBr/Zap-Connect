import { Link, useLocation } from "wouter";
import { Users, Package, ShoppingCart, Wheat, BookOpen, LogOut, User, Cake, Box, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden">
      <nav className="w-16 bg-[#202C33] flex flex-col items-center py-4 gap-1">
        <div className="mb-6 p-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Cake className="w-6 h-6 text-white" />
          </div>
        </div>
        
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
