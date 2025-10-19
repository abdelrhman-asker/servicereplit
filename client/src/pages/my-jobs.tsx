import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ServiceRequest } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

const STATUSES = ["pending","accepted","in_progress","completed","cancelled","paid"] as const;

type StatusFilter = typeof STATUSES[number];

export default function MyJobs() {
  const [status, setStatus] = useState<StatusFilter>("pending");

  const { data: jobs = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/my/jobs"],
  });

  // When filter is 'paid', fetch payments for these jobs and keep only those with succeeded
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    async function loadPaid() {
      if (status !== "paid" || !jobs.length) { setPaidIds(new Set()); return; }
      const out = new Set<string>();
      for (const j of jobs) {
        try {
          const p = await apiRequest("GET", `/api/payments/${j.id}`);
          if (p && p.status === "succeeded") out.add(j.id);
        } catch {
          // ignore
        }
        if (cancelled) return;
      }
      if (!cancelled) setPaidIds(out);
    }
    loadPaid();
    return () => { cancelled = true; };
  }, [status, jobs]);

  const filtered = useMemo(() => {
    if (status === "paid") {
      return jobs.filter(j => paidIds.has(j.id));
    }
    return jobs.filter(j => j.status === status);
  }, [jobs, status, paidIds]);

  const getBadge = (s: string) => {
    const map: Record<string, {variant: any; label: string}> = {
      pending: { variant: "secondary", label: "Pending" },
      accepted: { variant: "default", label: "Accepted" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "default", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
      paid: { variant: "default", label: "Paid" },
    };
    const cfg = map[s] || map.pending;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Jobs</h1>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v: StatusFilter) => setStatus(v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">No jobs match the selected filter.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(job => (
            <Card key={job.id} className="hover-elevate">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{job.serviceType}</CardTitle>
                    <div className="text-sm text-muted-foreground">{job.location}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === 'paid' ? getBadge('paid') : getBadge(job.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">{job.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
