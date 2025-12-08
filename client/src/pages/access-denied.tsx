import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          Acesso Negado
        </h1>
        <p className="text-gray-500 mb-8">
          Sua conta não está autorizada a acessar este sistema. 
          Entre em contato com o administrador para solicitar acesso.
        </p>
        <div className="flex flex-col gap-3">
          <Button 
            variant="outline"
            onClick={() => window.location.href = "/api/logout"}
          >
            Sair e tentar com outra conta
          </Button>
        </div>
      </div>
    </div>
  );
}
