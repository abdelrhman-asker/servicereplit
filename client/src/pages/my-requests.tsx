import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import RequestCard from "@/components/client/RequestCard";
import type { ServiceRequest } from "@shared/schema";

export default function MyRequests() {
  const [activeTab, setActiveTab] = useState<"all" | ServiceRequest["status"]>("all");

  const { data: requests = [], refetch, isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });

  const filteredRequests = activeTab === "all" ? requests : requests.filter(r => r.status === activeTab);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">My Service Requests</h1>
          <p className="text-muted-foreground mt-2">Track and manage all your service requests</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : filteredRequests.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <ClipboardList className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No requests found</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {activeTab === "all"
                      ? "You haven't made any service requests yet."
                      : `You don't have any ${activeTab.replace('_',' ')} requests.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredRequests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
