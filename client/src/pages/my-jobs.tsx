import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase } from "lucide-react";
import MyJobCard from "@/components/technician/MyJobCard";
import type { ServiceRequest } from "@shared/schema";

export default function MyJobs() {
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const { data: myJobs = [], isLoading, refetch } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });

  const filteredJobs = activeTab === "active"
    ? myJobs.filter(j => ["accepted", "in_progress"].includes(j.status))
    : myJobs.filter(j => j.status === "completed");

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">My Jobs</h1>
          <p className="text-muted-foreground mt-2">Manage your accepted and completed jobs</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active">Active Jobs</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredJobs.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {activeTab === "active"
                      ? "You don't have any active jobs at the moment."
                      : "You haven't completed any jobs yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredJobs.map((job) => (
                  <MyJobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
