import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Clock, CheckCircle, Plus } from "lucide-react";
import { Link } from "wouter";
import type { ServiceRequest } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import CreateRequestDialog from "@/components/client/CreateRequestDialog";

export default function ClientDashboard() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: requests = [], isLoading, refetch } = useQuery<ServiceRequest[]>({
    queryKey: ['/api/service-requests'],
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    inProgress: requests.filter(r => r.status === 'in_progress' || r.status === 'accepted').length,
    completed: requests.filter(r => r.status === 'completed').length,
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
            Manage your service requests and track their progress
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow" data-testid="button-create-request">
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-total">{stats.total}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-pending">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-pending">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-in-progress">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-in-progress">{stats.inProgress}</div>
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
        <h2 className="text-2xl font-bold mb-4" data-testid="heading-recent-requests">Recent Requests</h2>
        {requests.length === 0 ? (
          <Card className="border-2 border-dashed" data-testid="card-empty-state">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No requests yet</h3>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first service request. Our skilled technicians are ready to help!
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" data-testid="button-create-first-request">
                <Plus className="w-4 h-4 mr-2" />
                Create First Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.slice(0, 5).map((request) => (
              <Card key={request.id} className="hover-elevate" data-testid={`card-request-${request.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1" data-testid={`text-request-title-${request.id}`}>
                        {request.serviceType}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`text-request-location-${request.id}`}>
                        {request.location}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-sm mb-4 line-clamp-2" data-testid={`text-request-description-${request.id}`}>
                    {request.description}
                  </p>
                  <Link href={`/requests/${request.id}`}>
                    <Button variant="outline" size="sm" data-testid={`button-view-request-${request.id}`}>
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateRequestDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
