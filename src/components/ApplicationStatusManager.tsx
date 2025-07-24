import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getUserApplicationStats,
  getApplicationHistory,
  updateApplicationStatus,
  ApplicationStatus,
  ApplicationStats,
} from "@/lib/application-tracking";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  History,
} from "lucide-react";

interface ApplicationStatusManagerProps {
  applicationId?: string;
  showStats?: boolean;
}

const ApplicationStatusManager: React.FC<ApplicationStatusManagerProps> = ({
  applicationId,
  showStats = true,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && showStats) {
      loadApplicationStats();
    }
    if (applicationId) {
      loadApplicationHistory();
    }
  }, [user, applicationId, showStats]);

  const loadApplicationStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userStats = await getUserApplicationStats(user.id);
      setStats(userStats);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadApplicationHistory = async () => {
    if (!applicationId) return;

    try {
      const { data } = await getApplicationHistory(applicationId);
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const handleStatusUpdate = async (
    newStatus: ApplicationStatus,
    reason?: string
  ) => {
    if (!applicationId) return;

    try {
      const { error } = await updateApplicationStatus(
        applicationId,
        newStatus,
        reason
      );

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Application status changed to ${newStatus}`,
      });

      // Reload history to show the change
      loadApplicationHistory();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      case "pending":
        return "bg-yellow-500";
      case "completed":
        return "bg-blue-500";
      case "cancelled":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatResponseRate = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  const formatResponseTime = (hours: number) => {
    if (hours < 24) {
      return `${hours.toFixed(1)} hours`;
    }
    return `${(hours / 24).toFixed(1)} days`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Application Statistics */}
      {showStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.total_applications}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.pending_applications}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Accepted
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.accepted_applications}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Response Rate
                  </p>
                  <p className="text-2xl font-bold">
                    {formatResponseRate(stats.response_rate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Avg Response
                  </p>
                  <p className="text-lg font-bold">
                    {formatResponseTime(stats.avg_response_time_hours)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Application History */}
      {applicationId && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Application History</span>
            </CardTitle>
            <CardDescription>
              Track all status changes and updates for this application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <div
                    className={`w-3 h-3 rounded-full mt-2 ${getStatusColor(
                      entry.new_status
                    )}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">
                        Status changed to{" "}
                        <Badge variant="outline">{entry.new_status}</Badge>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {entry.previous_status && (
                      <p className="text-sm text-muted-foreground">
                        Previous status: {entry.previous_status}
                      </p>
                    )}
                    {entry.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Reason: {entry.reason}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Notes: {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions (for testing) */}
      {applicationId && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Test status updates (for demonstration purposes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleStatusUpdate("accepted", "Application approved")
                }
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleStatusUpdate("rejected", "Application declined")
                }
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate("pending", "Under review")}
              >
                Set Pending
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleStatusUpdate("completed", "Event completed")
                }
              >
                Complete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ApplicationStatusManager;
