import { Crown, Check, AlertTriangle, Clock, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlans, useSubscription } from "@/lib/hooks";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: "Ativo", color: "bg-green-100 text-green-800", icon: <Check className="w-4 h-4" /> },
  trial: { label: "Período de Teste", color: "bg-blue-100 text-blue-800", icon: <Clock className="w-4 h-4" /> },
  suspended: { label: "Suspenso", color: "bg-red-100 text-red-800", icon: <AlertTriangle className="w-4 h-4" /> },
  canceled: { label: "Cancelado", color: "bg-gray-100 text-gray-800", icon: <AlertTriangle className="w-4 h-4" /> },
};

export default function PlanPage() {
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: subscriptionData, isLoading: subLoading } = useSubscription();

  const isLoading = plansLoading || subLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  const currentPlan = subscriptionData?.plan;
  const subscription = subscriptionData?.subscription;
  const status = subscriptionData?.status || "active";
  const trialEndsAt = subscriptionData?.trialEndsAt;

  const statusInfo = statusConfig[status] || statusConfig.active;
  const trialDaysLeft = trialEndsAt ? differenceInDays(new Date(trialEndsAt), new Date()) : null;

  return (
    <div className="flex-1 flex flex-col h-full p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Plano</h1>
          <p className="text-gray-500">Gerencie sua assinatura e veja os recursos disponíveis</p>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{currentPlan?.displayName || "Gratuito"}</CardTitle>
                  <CardDescription>{currentPlan?.description}</CardDescription>
                </div>
              </div>
              <Badge className={statusInfo.color}>
                <span className="flex items-center gap-1">
                  {statusInfo.icon}
                  {statusInfo.label}
                </span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "trial" && trialDaysLeft !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">
                    {trialDaysLeft > 0 
                      ? `Seu período de teste termina em ${trialDaysLeft} dias`
                      : "Seu período de teste expirou"}
                  </span>
                </div>
                {trialEndsAt && (
                  <p className="text-sm text-blue-600 mt-1">
                    Data de expiração: {format(new Date(trialEndsAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            )}

            {status === "suspended" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Sua assinatura está suspensa</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  Entre em contato com o suporte para regularizar sua situação.
                </p>
              </div>
            )}

            <div>
              <h3 className="font-medium text-gray-900 mb-3">Recursos incluídos:</h3>
              <ul className="space-y-2">
                {(currentPlan?.features || []).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-gray-700">
                    <Check className="w-4 h-4 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {currentPlan?.price && Number(currentPlan.price) > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    R$ {Number(currentPlan.price).toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-gray-500">/mês</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Todos os Planos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrentPlan = plan.id === currentPlan?.id;
              return (
                <Card 
                  key={plan.id} 
                  className={`relative ${isCurrentPlan ? "border-2 border-primary ring-2 ring-primary/20" : ""}`}
                  data-testid={`card-plan-${plan.name}`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-white">
                        <Star className="w-3 h-3 mr-1" />
                        Plano Atual
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pt-6">
                    <CardTitle className="text-lg">{plan.displayName}</CardTitle>
                    <CardDescription className="text-sm">{plan.description}</CardDescription>
                    <div className="pt-2">
                      {Number(plan.price) === 0 ? (
                        <span className="text-2xl font-bold text-gray-900">Grátis</span>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-gray-900">
                            R$ {Number(plan.price).toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-gray-500 text-sm">/mês</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-600">
                          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="bg-gray-50 border-dashed">
          <CardContent className="pt-6">
            <div className="text-center text-gray-600">
              <p className="font-medium">Quer mudar de plano?</p>
              <p className="text-sm mt-1">
                Entre em contato com o suporte para solicitar uma mudança de plano.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
