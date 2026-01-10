import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { PlanUpgradeDialog, isPlanUpgradeError } from "@/components/plan-upgrade-dialog";

interface PlanUpgradeContextType {
  showUpgradeDialog: (feature?: string) => void;
  handlePlanError: (error: unknown) => boolean;
}

const PlanUpgradeContext = createContext<PlanUpgradeContextType | null>(null);

export function PlanUpgradeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<string | undefined>();

  const showUpgradeDialog = useCallback((feat?: string) => {
    setFeature(feat);
    setOpen(true);
  }, []);

  const handlePlanError = useCallback((error: unknown): boolean => {
    const { isUpgradeError, feature: errorFeature } = isPlanUpgradeError(error);
    if (isUpgradeError) {
      setFeature(errorFeature);
      setOpen(true);
      return true;
    }
    return false;
  }, []);

  return (
    <PlanUpgradeContext.Provider value={{ showUpgradeDialog, handlePlanError }}>
      {children}
      <PlanUpgradeDialog open={open} onOpenChange={setOpen} feature={feature} />
    </PlanUpgradeContext.Provider>
  );
}

export function usePlanUpgrade() {
  const context = useContext(PlanUpgradeContext);
  if (!context) {
    throw new Error("usePlanUpgrade must be used within a PlanUpgradeProvider");
  }
  return context;
}
