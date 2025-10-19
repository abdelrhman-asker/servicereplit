import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Wrench, CheckCircle, FileText, TrendingUp, BarChart2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ServiceRequest } from "@shared/schema";

export default function Landing() {
  const { data: jobs = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/public/alljobs"],
    queryFn: async () => await apiRequest("GET", "/api/public/alljobs"),
  });

  const totals = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    accepted: jobs.filter(j => j.status === 'accepted').length,
    in_progress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
  };

  const monthsBack = 6;
  const now = new Date();
  const monthly = Array.from({ length: monthsBack }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - idx), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const count = jobs.filter(j => {
      const cd = new Date(j.createdAt as any);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    }).length;
    return { key, label: d.toLocaleString(undefined, { month: 'short' }), count };
  });

  const maxMonthly = Math.max(1, ...monthly.map(m => m.count));

  // Top categories (serviceType)
  const typeCounts = jobs.reduce<Record<string, number>>((acc, j) => {
    const key = (j.serviceType || 'Other').trim();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const topTypes = sortedTypes.slice(0, 5);
  const topTotal = Math.max(1, topTypes.reduce((s, [, c]) => s + c, 0));
  const donutRadius = 50;
  const donutCirc = 2 * Math.PI * donutRadius;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold" data-testid="text-logo">ServiceConnect</span>
          </div>
          <Button onClick={() => window.location.href = '/login'} data-testid="button-login">
            Log In
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 px-4 bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-bold mb-6" data-testid="heading-hero">
              Connect with Trusted Service Professionals
            </h1>
            <p className="text-xl text-muted-foreground mb-8" data-testid="text-hero-description">
              Find skilled technicians for all your home service needs. From plumbing to electrical work, we connect you with the right professional.
            </p>
            {/* <div className="flex items-center justify-center gap-3 mb-6">
              <Badge variant="secondary" className="text-base px-3 py-1">
                Total jobs: <span className="font-semibold ml-2">{totals.total}</span>
              </Badge>
              <Badge variant="outline" className="text-base px-3 py-1">
                Completed: <span className="font-semibold ml-2">{totals.completed}</span>
              </Badge>
            </div> */}
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={() => window.location.href = '/login'}
              data-testid="button-get-started"
            >
              Get Started
            </Button>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-12" data-testid="heading-features">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center" data-testid="card-feature-1">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Post Your Request</h3>
                <p className="text-muted-foreground">
                  Describe your service needs and upload photos of the problem.
                </p>
              </div>

              <div className="text-center" data-testid="card-feature-2">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Wrench className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Get Matched</h3>
                <p className="text-muted-foreground">
                  Skilled technicians review and accept your service request.
                </p>
              </div>

              <div className="text-center" data-testid="card-feature-3">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Pay Securely</h3>
                <p className="text-muted-foreground">
                  Pay only after the job is completed to your satisfaction.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-2"><BarChart2 className="w-6 h-6"/> Platform Insights</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5"/>Monthly Jobs (last {monthsBack} months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    {isLoading ? (
                      <div className="h-full w-full animate-pulse bg-muted rounded-md" />
                    ) : (
                    <svg viewBox="0 0 300 140" className="w-full h-full">
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const padX = 20, padY = 20;
                        const w = 300 - padX * 2;
                        const h = 140 - padY * 2;
                        const points = monthly.map((m, i) => {
                          const x = padX + (i / (monthly.length - 1 || 1)) * w;
                          const y = padY + (1 - m.count / maxMonthly) * h;
                          return `${x},${y}`;
                        }).join(" ");
                        const area = `${padX},${padY + h} ${points} ${padX + w},${padY + h}`;
                        return (
                          <>
                            <polyline fill="url(#grad)" stroke="none" points={area} />
                            <polyline className="transition-all" fill="none" stroke="#4f46e5" strokeWidth="2" points={points} />
                            {monthly.map((m, i) => {
                              const x = padX + (i / (monthly.length - 1 || 1)) * w;
                              const y = padY + (1 - m.count / maxMonthly) * h;
                              return <circle key={m.key} cx={x} cy={y} r="3" fill="#4f46e5" />
                            })}
                          </>
                        );
                      })()}
                    </svg>
                    )}
                    {!isLoading && (
                      <div className="mt-2 grid grid-cols-6 text-xs text-muted-foreground">
                        {monthly.map(m => (
                          <div key={m.key} className="text-center">{m.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 flex items-end gap-3">
                    {isLoading ? (
                      <div className="h-full w-full animate-pulse bg-muted rounded-md" />
                    ) : (
                      [
                        { key: 'pending', label: 'Pending', value: totals.pending, color: 'bg-blue-500' },
                        { key: 'accepted', label: 'Accepted', value: totals.accepted, color: 'bg-indigo-500' },
                        { key: 'in_progress', label: 'In Progress', value: totals.in_progress, color: 'bg-amber-500' },
                        { key: 'completed', label: 'Completed', value: totals.completed, color: 'bg-green-500' },
                        { key: 'cancelled', label: 'Cancelled', value: totals.cancelled, color: 'bg-red-500' },
                      ].map(s => {
                        const h = Math.max(6, Math.round((s.value / Math.max(1, totals.total)) * 150));
                        return (
                          <div key={s.key} className="flex-1 flex flex-col items-center">
                            <div className={`w-full max-w-10 ${s.color} rounded-t-md transition-all`} style={{ height: h }} />
                            <div className="text-xs mt-2 text-center">
                              <div className="font-medium">{s.value}</div>
                              <div className="text-muted-foreground">{s.label}</div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    {isLoading ? (
                      <div className="w-40 h-40 rounded-full animate-pulse bg-muted" />
                    ) : (
                      <svg viewBox="0 0 140 140" width="160" height="160">
                        <g transform="translate(70,70)">
                          {(() => {
                            let offset = 0;
                            const colors = ["#4f46e5", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];
                            return topTypes.map(([label, count], idx) => {
                              const frac = count / topTotal;
                              const len = frac * donutCirc;
                              const dash = `${len} ${donutCirc - len}`;
                              const rotate = (offset / donutCirc) * 360 - 90; // start at top
                              offset += len;
                              return (
                                <circle
                                  key={label}
                                  r={donutRadius}
                                  cx={0}
                                  cy={0}
                                  fill="transparent"
                                  stroke={colors[idx % colors.length]}
                                  strokeWidth={18}
                                  strokeDasharray={dash}
                                  transform={`rotate(${rotate})`}
                                  strokeLinecap="butt"
                                />
                              );
                            });
                          })()}
                          <circle r={donutRadius-26} fill="white" />
                        </g>
                      </svg>
                    )}
                    <div className="flex-1 space-y-2">
                      {isLoading ? (
                        <div className="space-y-2">
                          <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-40 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-36 bg-muted animate-pulse rounded" />
                        </div>
                      ) : (
                        topTypes.map(([label, count], idx) => (
                          <div key={label} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: ["#4f46e5","#22c55e","#f59e0b","#ef4444","#06b6d4"][idx % 5] }} />
                              <span>{label}</span>
                            </div>
                            <div className="text-muted-foreground">{count}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-10 text-center">
              <h3 className="text-xl font-semibold mb-2">Ready to Get Started?</h3>
              <p className="text-muted-foreground mb-6">Join thousands of satisfied customers and skilled technicians.</p>
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" onClick={() => window.location.href = '/login'}>
                Join Now
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p data-testid="text-footer">© 2025 ServiceConnect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
