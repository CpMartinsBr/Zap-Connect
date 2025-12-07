import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Users, Package, ClipboardList, ChefHat, Cookie } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#075e54] via-[#128c7e] to-[#25d366] flex flex-col">
      <header className="p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <Cookie className="w-7 h-7 text-[#25d366]" />
            </div>
            <span className="text-2xl font-bold text-white">CRM WhatsApp</span>
          </div>
          <Button 
            data-testid="btn-login-header"
            onClick={() => window.location.href = "/api/login"}
            className="bg-white text-[#128c7e] hover:bg-gray-100 font-semibold"
          >
            Entrar
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Gerencie sua Confeitaria com Facilidade
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto">
            CRM completo para confeitarias e pequenos negócios. Organize clientes, pedidos, estoque e receitas em um só lugar.
          </p>
          
          <Button 
            data-testid="btn-login-main"
            onClick={() => window.location.href = "/api/login"}
            size="lg"
            className="bg-white text-[#128c7e] hover:bg-gray-100 font-bold text-lg px-8 py-6 h-auto"
          >
            Começar Agora
          </Button>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-16">
            <FeatureCard 
              icon={<Users className="w-8 h-8" />}
              title="Contatos"
              description="Gerencie seus clientes"
            />
            <FeatureCard 
              icon={<MessageSquare className="w-8 h-8" />}
              title="Conversas"
              description="Interface WhatsApp"
            />
            <FeatureCard 
              icon={<ClipboardList className="w-8 h-8" />}
              title="Pedidos"
              description="Controle de encomendas"
            />
            <FeatureCard 
              icon={<Package className="w-8 h-8" />}
              title="Estoque"
              description="Gestão de produtos"
            />
            <FeatureCard 
              icon={<Cookie className="w-8 h-8" />}
              title="Ingredientes"
              description="Controle de insumos"
            />
            <FeatureCard 
              icon={<ChefHat className="w-8 h-8" />}
              title="Receitas"
              description="Custo automático"
            />
          </div>
        </div>
      </main>

      <footer className="p-6 text-center text-white/70">
        <p>Feito com carinho para confeiteiros e empreendedores</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
      <CardContent className="p-4 text-center text-white">
        <div className="flex justify-center mb-2">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-white/80">{description}</p>
      </CardContent>
    </Card>
  );
}
