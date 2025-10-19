import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Clock, CheckCircle, Wrench, MapPin } from "lucide-react";
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
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [sortMode, setSortMode] = useState<'newest' | 'nearest'>('newest');
  const { data: myJobs = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ['/api/service-requests'],
  });

  // Start job
  const startJobMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest('POST', `/api/service-requests/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my/jobs'] });
      toast({ title: 'Job started', description: 'This job is now in progress.' });
    },
    onError: (err: any) => toast({ title: 'Failed to start job', description: err?.message || 'Please try again', variant: 'destructive' })
  });

  // Complete job dialog state and mutation
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeJobId, setCompleteJobId] = useState<string | null>(null);
  const completeSchema = z.object({
    totalPrice: z.coerce.number().positive('Total price must be greater than 0'),
    summary: z.string().min(5, 'Please provide a short summary'),
  });
  const completeForm = useForm<z.infer<typeof completeSchema>>({
    resolver: zodResolver(completeSchema),
    defaultValues: { totalPrice: undefined as unknown as number, summary: '' },
  });

  const completeJobMutation = useMutation({
    mutationFn: async (vars: { id: string; totalPrice: number; summary: string }) =>
      await apiRequest('POST', `/api/service-requests/${vars.id}/complete`, { totalPrice: vars.totalPrice, summary: vars.summary }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my/jobs'] });
      toast({ title: 'Job completed', description: 'The job was marked as completed.' });
      setCompleteOpen(false);
      setCompleteJobId(null);
      completeForm.reset();
    },
    onError: (err: any) => toast({ title: 'Failed to complete job', description: err?.message || 'Please try again', variant: 'destructive' })
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

  // Accept job mutation
  const acceptJobMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/service-requests/${id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests/available'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my/jobs'] });
      toast({ title: 'Job accepted', description: 'The job has been assigned to you.' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to accept job', description: err?.message || 'Please try again', variant: 'destructive' });
    }
  });

  const stats = {
    total: myJobs.length,
    active: myJobs.filter(r => r.status === 'accepted' || r.status === 'in_progress').length,
    completed: myJobs.filter(r => r.status === 'completed').length,
  };

  const skillFiltered = (availableJobs || []).filter((job) => {
    const skills = user?.skills || [];
    if (!skills.length) return true;
    return skills.includes(job.serviceType);
  });

  // Try parse "lat, lon" from location string
  const parseLatLon = (loc?: string) => {
    if (!loc) return null;
    const m = loc.match(/\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*/);
    if (!m) return null;
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return { lat, lon };
  };

  const haversine = (a: {lat:number;lon:number}, b: {lat:number;lon:number}) => {
    const R = 6371; // km
    const dLat = (b.lat - a.lat) * Math.PI/180;
    const dLon = (b.lon - a.lon) * Math.PI/180;
    const la1 = a.lat * Math.PI/180;
    const la2 = b.lat * Math.PI/180;
    const x = Math.sin(dLat/2)**2 + Math.sin(dLon/2)**2 * Math.cos(la1) * Math.cos(la2);
    const d = 2 * Math.asin(Math.sqrt(x));
    return R * d;
  };

  const sortedAvailable = [...skillFiltered].sort((j1, j2) => {
    if (sortMode === 'nearest' && coords) {
      const p1 = parseLatLon(j1.location);
      const p2 = parseLatLon(j2.location);
      const d1 = p1 ? haversine(coords, p1) : Number.POSITIVE_INFINITY;
      const d2 = p2 ? haversine(coords, p2) : Number.POSITIVE_INFINITY;
      return d1 - d2;
    }
    // default: newest first by createdAt
    const t1 = (j1 as any).createdAt ? new Date(j1.createdAt as any).getTime() : 0;
    const t2 = (j2 as any).createdAt ? new Date(j2.createdAt as any).getTime() : 0;
    return t2 - t1;
  });

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

      {/* Removed job creation UI; technicians accept client requests instead */}

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" data-testid="heading-available-jobs">Available Jobs ({sortedAvailable.length})</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                  setSortMode('nearest');
                });
              } else {
                toast({ title: 'Geolocation not available', variant: 'destructive' });
              }
            }} data-testid="button-use-current-location-tech">
              Use my location
            </Button>
            <Button variant={sortMode==='nearest' ? 'default':'outline'} size="sm" onClick={() => setSortMode(sortMode==='nearest'?'newest':'nearest')} data-testid="button-toggle-sort">
              {sortMode === 'nearest' ? 'Nearest' : 'Newest'}
            </Button>
          </div>
        </div>
        {sortedAvailable.length === 0 ? (
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
            {sortedAvailable.slice(0, 3).map((job) => (
              <Card key={job.id} className="hover-elevate" data-testid={`card-job-${job.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1" data-testid={`text-job-title-${job.id}`}>
                        {job.serviceType}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid={`text-job-location-${job.id}`}>
                        <MapPin className="w-4 h-4" /> {job.location}
                      </p>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                  <p className="text-sm mb-4 line-clamp-2" data-testid={`text-job-description-${job.id}`}>
                    {job.description}
                  </p>
                  <div className="flex gap-2">
                    <Link href={`/jobs/${job.id}`}>
                      <Button variant="outline" size="sm" data-testid={`button-view-job-${job.id}`}>
                        View Details
                      </Button>
                    </Link>
                    {job.status === 'pending' && (
                      <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" onClick={() => acceptJobMutation.mutate(job.id)} data-testid={`button-accept-job-${job.id}`}>
                        Accept Job
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {sortedAvailable.length > 3 && (
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
                      <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid={`text-my-job-location-${job.id}`}>
                        <MapPin className="w-4 h-4" /> {job.location}
                      </p>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                  <p className="text-sm mb-4 line-clamp-2" data-testid={`text-my-job-description-${job.id}`}>
                    {job.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/my-jobs/${job.id}`}>
                      <Button variant="outline" size="sm" data-testid={`button-view-my-job-${job.id}`}>
                        View Details
                      </Button>
                    </Link>
                    {job.status === 'accepted' && (
                      <Button size="sm" onClick={() => startJobMutation.mutate(job.id)} data-testid={`button-start-job-${job.id}`}>
                        Start Job
                      </Button>
                    )}
                    {job.status === 'in_progress' && (
                      <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" onClick={() => { setCompleteJobId(job.id); setCompleteOpen(true); }} data-testid={`button-complete-job-${job.id}`}>
                        Complete Job
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={completeOpen} onOpenChange={(o) => { setCompleteOpen(o); if (!o) completeForm.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Job</DialogTitle>
          </DialogHeader>
          <Form {...completeForm}>
            <form
              onSubmit={completeForm.handleSubmit(({ totalPrice, summary }) => {
                if (!completeJobId) return;
                completeJobMutation.mutate({ id: completeJobId, totalPrice, summary });
              })}
              className="space-y-4"
            >
              <FormField
                control={completeForm.control}
                name="totalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="1" placeholder="e.g. 120" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={completeForm.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Summary</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe what was done" className="min-h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setCompleteOpen(false); completeForm.reset(); }}>Cancel</Button>
                <Button type="submit" disabled={completeJobMutation.isPending}>{completeJobMutation.isPending ? 'Submitting...' : 'Complete Job'}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
