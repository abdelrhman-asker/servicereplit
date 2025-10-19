import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/auth/login', { email, password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      navigate('/');
    },
    onError: async (err: any) => {
      toast({ title: 'Login failed', description: err?.message || 'Invalid credentials', variant: 'destructive' });
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await loginMutation.mutateAsync();
    setIsLoading(false);
  };

  const handleDemo = () => {
    // For local development using local auth, go to signup if needed
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md" data-testid="card-login">
        <CardHeader>
          <CardTitle data-testid="heading-login">Sign in</CardTitle>
          <CardDescription>Access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 grid gap-2">
            <Button variant="outline" className="w-full" onClick={handleDemo} data-testid="button-demo">
              Continue as demo
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/signup")} data-testid="button-to-signup">
              Create an account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
