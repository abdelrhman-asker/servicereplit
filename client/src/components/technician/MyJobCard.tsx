import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ServiceRequest } from "@shared/schema";
import { Link } from "wouter";
import { MapPin } from "lucide-react";

function StatusBadge({ status }: { status: ServiceRequest["status"] }) {
  const map: Record<string, { variant: any; label: string }> = {
    pending: { variant: "secondary", label: "Pending" },
    accepted: { variant: "default", label: "Accepted" },
    in_progress: { variant: "default", label: "In Progress" },
    completed: { variant: "default", label: "Completed" },
    cancelled: { variant: "destructive", label: "Cancelled" },
  };
  const cfg = map[status] || map.pending;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default function MyJobCard({ job }: { job: ServiceRequest }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">{job.serviceType}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>
        <p className="text-sm mb-4 line-clamp-2">{job.description}</p>
        <Link href={`/my-jobs/${job.id}`}>
          <Button variant="outline" size="sm">View Details</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
