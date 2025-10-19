import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Wrench } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<'client' | 'technician' | null>(null);

  const updateProfileMutation = useMutation({
    mutationFn: async (userType: 'client' | 'technician') => {
      await apiRequest('PATCH', '/api/user/profile', { userType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile Updated",
        description: "Your account has been set up successfully!",
      });
      navigate('/');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleContinue = () => {
    if (selectedType) {
      updateProfileMutation.mutate(selectedType);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <Card className="w-full max-w-2xl" data-testid="card-onboarding">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl" data-testid="heading-onboarding">Welcome to ServiceConnect</CardTitle>
          <CardDescription data-testid="text-onboarding-description">
            Please select how you'd like to use the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer transition-all hover-elevate ${
                selectedType === 'client' ? 'border-primary border-2' : ''
              }`}
              onClick={() => setSelectedType('client')}
              data-testid="card-select-client"
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">I need services</h3>
                <p className="text-sm text-muted-foreground">
                  Post service requests and hire technicians for your home needs
                </p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover-elevate ${
                selectedType === 'technician' ? 'border-primary border-2' : ''
              }`}
              onClick={() => setSelectedType('technician')}
              data-testid="card-select-technician"
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Wrench className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">I provide services</h3>
                <p className="text-sm text-muted-foreground">
                  Find jobs and connect with clients who need your expertise
                </p>
              </CardContent>
            </Card>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            size="lg"
            disabled={!selectedType || updateProfileMutation.isPending}
            onClick={handleContinue}
            data-testid="button-continue"
          >
            {updateProfileMutation.isPending ? "Setting up..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
