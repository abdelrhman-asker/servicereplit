import { Home, FileText, User, LogOut, Briefcase, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      // Purge auth cache so the app immediately treats the user as logged out
      queryClient.clear();
      // Hard reload to ensure all state resets and landing renders
      window.location.assign('/');
    },
  });

  if (!user) return null;

  const getInitials = () => {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const clientMenuItems = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "My Requests", url: "/requests", icon: FileText },
    { title: "Profile", url: "/profile", icon: User },
  ];

  const technicianMenuItems = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "Available Jobs", url: "/jobs", icon: Briefcase },
    { title: "My Jobs", url: "/my-jobs", icon: FileText },
    { title: "Profile", url: "/profile", icon: User },
  ];

  const menuItems = user.userType === 'client' ? clientMenuItems : technicianMenuItems;

  return (
    <Sidebar data-testid="app-sidebar">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" data-testid="icon-logo" />
          </div>
          <div>
            <div className="font-bold text-lg" data-testid="text-app-name">ServiceConnect</div>
            <div className="text-xs text-muted-foreground capitalize" data-testid="text-user-type">
              {user.userType || 'User'}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel data-testid="label-navigation">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <Link href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10" data-testid="avatar-user">
            <AvatarImage src={user.profileImageUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate" data-testid="text-user-name">
              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
            </div>
            <div className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {user.email}
            </div>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => logoutMutation.mutate()}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
