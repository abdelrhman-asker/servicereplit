import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, User as UserIcon, DollarSign } from "lucide-react";
import type { ServiceRequest } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function PaymentForm({ clientSecret, requestId }: { clientSecret: string; requestId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + `/requests/${requestId}`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      navigate(`/requests/${requestId}`);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-payment">
      <PaymentElement />
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        disabled={!stripe || isProcessing}
        data-testid="button-submit-payment"
      >
        {isProcessing ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPayment, setShowPayment] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [technicianNotes, setTechnicianNotes] = useState("");

  const { data: request, isLoading } = useQuery<ServiceRequest>({
    queryKey: ['/api/service-requests', id],
  });

  const acceptJobMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PATCH', `/api/service-requests/${id}`, {
        technicianId: user?.id,
        status: 'accepted',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      toast({ title: "Job Accepted", description: "You have accepted this job!" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest('PATCH', `/api/service-requests/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      toast({ title: "Status Updated", description: "Job status has been updated!" });
    },
  });

  const completeJobMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PATCH', `/api/service-requests/${id}`, {
        status: 'completed',
        quotedPrice: parseInt(quotedPrice),
        technicianNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      setShowComplete(false);
      toast({ title: "Job Completed", description: "Job marked as completed!" });
    },
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/payments/create-intent', {
        serviceRequestId: id,
      });
    },
    onSuccess: (data: any) => {
      setClientSecret(data.clientSecret);
      setShowPayment(true);
    },
  });

  if (isLoading || !request) {
    return <div className="p-8" data-testid="loading-request">Loading...</div>;
  }

  const isTechnician = user?.userType === 'technician';
  const isClient = user?.userType === 'client';
  const isMyJob = request.technicianId === user?.id;
  const isMyRequest = request.clientId === user?.id;

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

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Card data-testid="card-request-detail">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2" data-testid="heading-service-type">{request.serviceType}</CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span data-testid="text-location">{request.location}</span>
              </div>
            </div>
            {getStatusBadge(request.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2" data-testid="heading-description">Description</h3>
            <p className="text-muted-foreground" data-testid="text-description">{request.description}</p>
          </div>

          {request.technicianNotes && (
            <div>
              <h3 className="font-semibold mb-2" data-testid="heading-technician-notes">Technician Notes</h3>
              <p className="text-muted-foreground" data-testid="text-technician-notes">{request.technicianNotes}</p>
            </div>
          )}

          {request.quotedPrice && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="font-semibold">Price:</span>
                <span className="text-2xl font-bold text-green-600" data-testid="text-quoted-price">
                  ${request.quotedPrice}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {isTechnician && !isMyJob && request.status === 'pending' && (
              <Button
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                onClick={() => acceptJobMutation.mutate()}
                disabled={acceptJobMutation.isPending}
                data-testid="button-accept-job"
              >
                Accept Job
              </Button>
            )}

            {isTechnician && isMyJob && request.status === 'accepted' && (
              <Button
                onClick={() => updateStatusMutation.mutate('in_progress')}
                disabled={updateStatusMutation.isPending}
                data-testid="button-start-job"
              >
                Start Job
              </Button>
            )}

            {isTechnician && isMyJob && request.status === 'in_progress' && (
              <Button
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                onClick={() => setShowComplete(true)}
                data-testid="button-complete-job"
              >
                Complete Job
              </Button>
            )}

            {isClient && isMyRequest && request.status === 'completed' && request.quotedPrice && (
              <Button
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                onClick={() => createPaymentIntentMutation.mutate()}
                disabled={createPaymentIntentMutation.isPending}
                data-testid="button-pay-now"
              >
                Pay Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showComplete} onOpenChange={setShowComplete}>
        <DialogContent data-testid="dialog-complete-job">
          <DialogHeader>
            <DialogTitle data-testid="heading-dialog-complete">Complete Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="quoted-price" data-testid="label-quoted-price">Quoted Price ($)</Label>
              <Input
                id="quoted-price"
                type="number"
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(e.target.value)}
                placeholder="Enter the total amount"
                data-testid="input-quoted-price"
              />
            </div>
            <div>
              <Label htmlFor="technician-notes" data-testid="label-technician-notes">Completion Notes</Label>
              <Textarea
                id="technician-notes"
                value={technicianNotes}
                onChange={(e) => setTechnicianNotes(e.target.value)}
                placeholder="Add any notes about the completed work..."
                data-testid="textarea-technician-notes"
              />
            </div>
            <Button
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              onClick={() => completeJobMutation.mutate()}
              disabled={!quotedPrice || completeJobMutation.isPending}
              data-testid="button-submit-complete"
            >
              {completeJobMutation.isPending ? "Completing..." : "Mark as Completed"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md" data-testid="dialog-payment">
          <DialogHeader>
            <DialogTitle data-testid="heading-dialog-payment">Complete Payment</DialogTitle>
          </DialogHeader>
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm clientSecret={clientSecret} requestId={id!} />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
