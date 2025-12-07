import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="p-6 border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xl font-semibold text-gray-900">CRM</span>
          <Button 
            data-testid="btn-login-header"
            onClick={() => window.location.href = "/api/login"}
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
          >
            Entrar
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-6 leading-tight">
            Organize sua confeitaria
          </h1>
          <p className="text-lg text-gray-500 mb-10">
            Clientes, pedidos, estoque e receitas em um só lugar.
          </p>
          
          <Button 
            data-testid="btn-login-main"
            onClick={() => window.location.href = "/api/login"}
            size="lg"
            className="bg-gray-900 text-white hover:bg-gray-800 font-medium px-8"
          >
            Começar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>

      <footer className="p-6 text-center text-gray-400 text-sm">
        <p>Feito para confeiteiros</p>
      </footer>
    </div>
  );
}
