import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Package, ClipboardList, ChefHat } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <header className="p-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xl font-semibold text-gray-900">CRM Confeitaria</span>
          <Button 
            data-testid="btn-login-header"
            onClick={() => window.location.href = "/api/login"}
            variant="outline"
            className="border-gray-300"
          >
            Entrar
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-6 leading-tight">
            Gerencie sua confeitaria com simplicidade
          </h1>
          <p className="text-lg text-gray-500 mb-8">
            Controle clientes, pedidos, estoque e receitas em uma única plataforma intuitiva.
          </p>
          
          <Button 
            data-testid="btn-login-main"
            onClick={() => window.location.href = "/api/login"}
            size="lg"
            className="bg-gray-900 text-white hover:bg-gray-800 font-medium px-8"
          >
            Começar agora
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          <FeatureItem icon={<Users className="w-5 h-5" />} label="Contatos" />
          <FeatureItem icon={<ClipboardList className="w-5 h-5" />} label="Pedidos" />
          <FeatureItem icon={<Package className="w-5 h-5" />} label="Estoque" />
          <FeatureItem icon={<ChefHat className="w-5 h-5" />} label="Receitas" />
        </div>
      </main>

      <footer className="p-6 text-center text-gray-400 text-sm">
        <p>Feito para confeiteiros e pequenos negócios</p>
      </footer>
    </div>
  );
}

function FeatureItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
      <div className="text-gray-600">{icon}</div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
}
