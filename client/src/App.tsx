import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import TestPage from "@/pages/TestPage";
import { TestGraderProvider } from "@/context/TestGraderContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={TestPage} />
      <Route path="/home" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TestGraderProvider>
        <Router />
        <Toaster />
      </TestGraderProvider>
    </QueryClientProvider>
  );
}

export default App;
