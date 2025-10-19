import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Onboarding from "@/pages/onboarding";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import MyJobs from "@/pages/my-jobs";
import MyRequests from "@/pages/my-requests";
import ClientDashboard from "@/pages/client-dashboard";
import TechnicianDashboard from "@/pages/technician-dashboard";
import CreateRequest from "@/pages/create-request";
import RequestDetail from "@/pages/request-details";
import Profile from "@/pages/profile";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-app">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Not authenticated - show landing page
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Authenticated but no user type - show onboarding
  if (!user?.userType) {
    return (
      <Switch>
        <Route path="/" component={Onboarding} />
        <Route component={Onboarding} />
      </Switch>
    );
  }

  // Authenticated with user type - show app with sidebar
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              {user.userType === 'client' && (
                <>
                  <Route path="/" component={ClientDashboard} />
                  <Route path="/requests" component={MyRequests} />
                  <Route path="/create-request" component={CreateRequest} />
                  <Route path="/requests/:id" component={RequestDetail} />
                </>
              )}
              {user.userType === 'technician' && (
                <>
                  <Route path="/" component={TechnicianDashboard} />
                  <Route path="/jobs" component={TechnicianDashboard} />
                  <Route path="/jobs/:id" component={RequestDetail} />
                  <Route path="/my-jobs" component={MyJobs} />
                  <Route path="/my-jobs/:id" component={RequestDetail} />
                </>
              )}
              <Route path="/profile" component={Profile} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
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
