import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AccessDenied from "@/pages/access-denied";
import Home from "@/pages/home";
import Inventory from "@/pages/inventory";
import Orders from "@/pages/orders";
import Ingredients from "@/pages/ingredients";
import Packaging from "@/pages/packaging";
import Recipes from "@/pages/recipes";
import Team from "@/pages/team";

function Router() {
  const { isAuthenticated, isLoading, isAllowed } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  if (!isAllowed) {
    return <AccessDenied />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/estoque" component={Inventory} />
        <Route path="/pedidos" component={Orders} />
        <Route path="/ingredientes" component={Ingredients} />
        <Route path="/embalagens" component={Packaging} />
        <Route path="/receitas" component={Recipes} />
        <Route path="/equipe" component={Team} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
