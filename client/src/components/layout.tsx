import { Link, useLocation } from "wouter";
import { MessageCircle, Package, ShoppingCart, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/", icon: MessageCircle, label: "Conversas" },
  { path: "/estoque", icon: Package, label: "Estoque" },
  { path: "/pedidos", icon: ShoppingCart, label: "Pedidos" },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden">
      <nav className="w-16 bg-[#202C33] flex flex-col items-center py-4 gap-1">
        <div className="mb-6 p-2">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
            alt="WhatsApp CRM" 
            className="w-8 h-8"
          />
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
        
        <div className="mt-auto">
          <div 
            data-testid="nav-stats"
            className="w-12 h-12 flex items-center justify-center rounded-lg cursor-pointer text-gray-400 hover:bg-gray-700 hover:text-white transition-all group"
          >
            <BarChart3 size={22} />
            <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Estatísticas
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
