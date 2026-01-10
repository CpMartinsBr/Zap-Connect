import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crown } from "lucide-react";
import { useLocation } from "wouter";

interface PlanUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const featureNames: Record<string, string> = {
  whatsappEnabled: "WhatsApp integrado",
  reportsEnabled: "Relatórios",
  apiAccess: "Acesso à API",
};

export function PlanUpgradeDialog({ open, onOpenChange, feature }: PlanUpgradeDialogProps) {
  const [, setLocation] = useLocation();

  const featureName = feature ? featureNames[feature] || feature : "essa funcionalidade";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-plan-upgrade">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Crown className="w-6 h-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center">
            Funcionalidade não disponível
          </DialogTitle>
          <DialogDescription className="text-center">
            Seu plano atual não permite usar <strong>{featureName}</strong>.
            Faça upgrade para liberar essa e outras funcionalidades.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
            data-testid="btn-cancel-upgrade"
          >
            Voltar
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              setLocation("/plano");
            }}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
            data-testid="btn-view-plans"
          >
            Ver planos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function isPlanUpgradeError(error: unknown): { isUpgradeError: boolean; feature?: string } {
  if (error instanceof Error) {
    try {
      const match = error.message.match(/403: (.+)/);
      if (match) {
        const body = JSON.parse(match[1]);
        if (body.error === "PLAN_UPGRADE_REQUIRED") {
          return { isUpgradeError: true, feature: body.feature };
        }
      }
    } catch {
      if (error.message.includes("PLAN_UPGRADE_REQUIRED")) {
        return { isUpgradeError: true };
      }
    }
  }
  return { isUpgradeError: false };
}
