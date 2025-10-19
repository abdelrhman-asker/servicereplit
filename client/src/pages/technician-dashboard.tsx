import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Clock, CheckCircle, Wrench } from "lucide-react";
import { Link } from "wouter";
import type { ServiceRequest } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: myJobs = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ['/api/service-requests'],
  });

  const { data: availableJobs = [] } = useQuery<ServiceRequest[]>({
    queryKey: ['/api/service-requests/available'],
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      await apiRequest('PATCH', '/api/user/profile', { isAvailable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Availability Updated",
        description: user?.isAvailable ? "You are now unavailable" : "You are now available for jobs",
      });
    },
  });

  // Create Job popup form
  const [openCreate, setOpenCreate] = useState(false);
  const createJobSchema = z.object({
    serviceType: z.string().min(1, 'Service type is required'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    location: z.string().min(3, 'Location is required'),
  });
  const form = useForm<z.infer<typeof createJobSchema>>({
    resolver: zodResolver(createJobSchema),
    defaultValues: { serviceType: '', description: '', location: '' },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createJobSchema>) => {
      return await apiRequest('POST', '/api/technician/jobs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      toast({ title: 'Job created', description: 'Your job has been posted successfully' });
      setOpenCreate(false);
      form.reset();
    },
  });

  const stats = {
    total: myJobs.length,
    active: myJobs.filter(r => r.status === 'accepted' || r.status === 'in_progress').length,
    completed: myJobs.filter(r => r.status === 'completed').length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      accepted: { variant: "default", label: "Accepted" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "default", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  if (isLoading) {
    return <div className="p-8" data-testid="loading-dashboard">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-dashboard">Dashboard</h1>
          <p className="text-muted-foreground" data-testid="text-dashboard-description">
            Manage your jobs and find new opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="availability-toggle" data-testid="label-availability">Available for Jobs</Label>
          <Switch
            id="availability-toggle"
            checked={user?.isAvailable || false}
            onCheckedChange={(checked) => updateAvailabilityMutation.mutate(checked)}
            data-testid="switch-availability"
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button onClick={() => setOpenCreate(true)} data-testid="button-open-create-job">
          Create Job
        </Button>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Job</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createJobMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Plumber" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="Enter area or use current location" {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition((pos) => {
                              const { latitude, longitude } = pos.coords;
                              form.setValue('location', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                            });
                          }
                        }}
                      >
                        Use current
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-32" placeholder="Describe the job" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={createJobMutation.isPending}>
                  {createJobMutation.isPending ? 'Creating...' : 'Create Job'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card data-testid="card-stat-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-total">{stats.total}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-active">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-active">{stats.active}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-completed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-completed">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4" data-testid="heading-available-jobs">Available Jobs ({availableJobs.length})</h2>
        {availableJobs.length === 0 ? (
          <Card data-testid="card-empty-available">
            <CardContent className="p-12 text-center">
              <Wrench className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No available jobs</h3>
              <p className="text-muted-foreground">
                Check back later for new job opportunities matching your skills
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {availableJobs.slice(0, 3).map((job) => (
              <Card key={job.id} className="hover-elevate" data-testid={`card-job-${job.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1" data-testid={`text-job-title-${job.id}`}>
                        {job.serviceType}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`text-job-location-${job.id}`}>
                        {job.location}
                      </p>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                  <p className="text-sm mb-4 line-clamp-2" data-testid={`text-job-description-${job.id}`}>
                    {job.description}
                  </p>
                  <Link href={`/jobs/${job.id}`}>
                    <Button variant="outline" size="sm" data-testid={`button-view-job-${job.id}`}>
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
            {availableJobs.length > 3 && (
              <Link href="/jobs">
                <Button variant="outline" className="w-full" data-testid="button-view-all-jobs">
                  View All Available Jobs
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4" data-testid="heading-my-jobs">My Jobs</h2>
        {myJobs.length === 0 ? (
          <Card data-testid="card-empty-my-jobs">
            <CardContent className="p-12 text-center">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No jobs yet</h3>
              <p className="text-muted-foreground">
                Browse available jobs and start accepting them
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {myJobs.slice(0, 3).map((job) => (
              <Card key={job.id} className="hover-elevate" data-testid={`card-my-job-${job.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1" data-testid={`text-my-job-title-${job.id}`}>
                        {job.serviceType}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`text-my-job-location-${job.id}`}>
                        {job.location}
                      </p>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                  <p className="text-sm mb-4 line-clamp-2" data-testid={`text-my-job-description-${job.id}`}>
                    {job.description}
                  </p>
                  <Link href={`/my-jobs/${job.id}`}>
                    <Button variant="outline" size="sm" data-testid={`button-view-my-job-${job.id}`}>
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
