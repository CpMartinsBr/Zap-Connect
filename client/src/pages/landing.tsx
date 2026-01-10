import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowRight, 
  Package, 
  ClipboardList, 
  ChefHat,
  Check,
  Clock,
  DollarSign,
  Sparkles,
  Star,
  Crown,
  Loader2
} from "lucide-react";
import type { Plan } from "@/lib/api";

const steps = [
  {
    icon: <Package className="w-8 h-8" />,
    title: "Cadastre seus produtos",
    description: "Adicione receitas, ingredientes e embalagens de forma simples"
  },
  {
    icon: <ClipboardList className="w-8 h-8" />,
    title: "Controle pedidos e clientes",
    description: "Organize tudo em um só lugar, do pedido à entrega"
  },
  {
    icon: <DollarSign className="w-8 h-8" />,
    title: "Saiba quanto você lucra",
    description: "Custos calculados automaticamente para você"
  }
];

const benefits = [
  {
    icon: <ClipboardList className="w-6 h-6" />,
    title: "Organização",
    description: "Tudo em um só lugar, fácil de encontrar"
  },
  {
    icon: <DollarSign className="w-6 h-6" />,
    title: "Controle de custos",
    description: "Saiba exatamente quanto cada produto custa"
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "Mais tempo para vender",
    description: "Menos planilhas, mais clientes"
  }
];

const planIcons: Record<string, React.ReactNode> = {
  free: <Sparkles className="w-5 h-5" />,
  pro: <Star className="w-5 h-5" />,
  premium: <Crown className="w-5 h-5" />,
};

const planBadges: Record<string, string | null> = {
  free: null,
  pro: "Mais popular",
  premium: "Completo",
};

function formatPrice(price: string): { display: string; note: string } {
  const numPrice = Number(price);
  if (numPrice === 0) {
    return { display: "Grátis", note: "para sempre" };
  }
  return { 
    display: `R$ ${numPrice.toFixed(2).replace(".", ",")}`, 
    note: "por mês" 
  };
}

function handleSelectPlan(planName: string) {
  localStorage.setItem("selectedPlan", planName);
  window.location.href = "/api/login";
}

function handleLogin() {
  localStorage.setItem("selectedPlan", "free");
  window.location.href = "/api/login";
}

function scrollToPlans() {
  document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
}

export default function Landing() {
  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <header className="p-4 md:p-6 sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-rose-600" />
            <span className="text-xl font-semibold text-gray-900">Grisly</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              data-testid="btn-ver-planos-header"
              onClick={scrollToPlans}
              variant="ghost"
              className="hidden md:inline-flex text-gray-600"
            >
              Ver planos
            </Button>
            <Button 
              data-testid="btn-login-header"
              onClick={handleLogin}
              variant="outline"
              className="border-gray-300"
            >
              Entrar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 mb-6">
              Feito para pequenos produtores
            </Badge>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Gerencie seu negócio <span className="text-rose-600">sem complicação</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Controle pedidos, clientes, receitas e custos em um só lugar. 
              Mais organização, mais lucro, mais tempo para criar.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                data-testid="btn-comecar-gratis"
                onClick={handleLogin}
                size="lg"
                className="bg-rose-600 text-white hover:bg-rose-700 font-medium px-8 text-lg"
              >
                Começar grátis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                data-testid="btn-ver-planos-hero"
                onClick={scrollToPlans}
                size="lg"
                variant="outline"
                className="border-gray-300 font-medium px-8 text-lg"
              >
                Ver planos
              </Button>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              Sem cartão de crédito. Comece em menos de 1 minuto.
            </p>
          </div>
        </section>

        <section className="px-4 md:px-6 py-16 bg-white border-y border-gray-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Como funciona
              </h2>
              <p className="text-gray-600">
                Três passos simples para organizar seu negócio
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-700">
                    {step.icon}
                  </div>
                  <div className="text-sm font-medium text-rose-600 mb-2">
                    Passo {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="px-4 md:px-6 py-16 md:py-24 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Escolha seu plano
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Comece grátis e mude quando quiser. Sem surpresas, sem letras pequenas.
              </p>
            </div>

            {plansLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {plans.map((plan) => {
                  const { display: priceDisplay, note: priceNote } = formatPrice(plan.price);
                  const isHighlight = plan.name === "pro";
                  const badge = planBadges[plan.name];
                  const icon = planIcons[plan.name] || <Sparkles className="w-5 h-5" />;
                  
                  return (
                    <Card 
                      key={plan.id}
                      className={`relative flex flex-col ${
                        isHighlight 
                          ? "border-2 border-rose-500 shadow-lg scale-[1.02]" 
                          : "border-gray-200"
                      }`}
                      data-testid={`card-plan-${plan.name}`}
                    >
                      {badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className={`${
                            isHighlight 
                              ? "bg-rose-500 text-white hover:bg-rose-500" 
                              : "bg-slate-700 text-white hover:bg-slate-700"
                          }`}>
                            {badge}
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="text-center pt-8">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                          isHighlight ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                        }`}>
                          {icon}
                        </div>
                        <CardTitle className="text-xl">{plan.displayName}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                        
                        <div className="pt-4">
                          <span className="text-3xl font-bold text-gray-900">{priceDisplay}</span>
                          {priceNote && (
                            <span className="text-gray-500 text-sm ml-1">/{priceNote}</span>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 flex flex-col">
                        <ul className="space-y-3 mb-8 flex-1">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <Button
                          data-testid={`btn-select-${plan.name}`}
                          onClick={() => handleSelectPlan(plan.name)}
                          variant={isHighlight ? "default" : "outline"}
                          className={`w-full ${
                            isHighlight 
                              ? "bg-rose-600 hover:bg-rose-700 text-white" 
                              : ""
                          }`}
                        >
                          {plan.name === "free" ? "Começar grátis" : `Escolher ${plan.displayName}`}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <p className="text-center text-sm text-gray-500 mt-8">
              Todos os planos incluem período de teste de 14 dias. Cancele quando quiser.
            </p>
          </div>
        </section>

        <section className="px-4 md:px-6 py-16 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Feito para pequenos produtores
              </h2>
              <p className="text-gray-600">
                Tudo que você precisa para crescer sem perder o controle
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center p-6 rounded-2xl bg-slate-50">
                  <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-rose-600">
                    {benefit.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 md:px-6 py-16 md:py-20 bg-slate-800 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Pronto para organizar seu negócio?
            </h2>
            <p className="text-slate-300 mb-8 text-lg">
              Comece grátis agora mesmo. Leva menos de 1 minuto.
            </p>
            <Button 
              data-testid="btn-comecar-footer"
              onClick={handleLogin}
              size="lg"
              className="bg-rose-600 text-white hover:bg-rose-700 font-medium px-8 text-lg"
            >
              Começar grátis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="px-4 md:px-6 py-8 bg-gray-900 text-gray-400">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-rose-500" />
            <span className="text-white font-medium">Grisly</span>
          </div>
          <p className="text-sm text-center md:text-right">
            grisly.com.br - A ferramenta que pequenos produtores confiam para crescer.
          </p>
        </div>
      </footer>
    </div>
  );
}
