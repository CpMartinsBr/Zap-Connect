import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Inventory from "@/pages/inventory";
import Orders from "@/pages/orders";
import Ingredients from "@/pages/ingredients";
import Recipes from "@/pages/recipes";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/estoque" component={Inventory} />
        <Route path="/pedidos" component={Orders} />
        <Route path="/ingredientes" component={Ingredients} />
        <Route path="/receitas" component={Recipes} />
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
