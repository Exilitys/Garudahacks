import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { syncAllSpeakerStatistics } from "@/lib/speaker-stats-sync";
import {
  RefreshCw,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

const AdminUtils = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const { toast } = useToast();

  const handleSyncAllSpeakers = async () => {
    setSyncing(true);
    setSyncResults(null);

    try {
      const results = await syncAllSpeakerStatistics();
      setSyncResults(results);

      if (results.success) {
        toast({
          title: "Sync Completed",
          description: `Updated ${results.updated} out of ${results.total} speakers`,
        });
      } else {
        toast({
          title: "Sync Failed",
          description: "Failed to sync speaker statistics",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error syncing speakers:", error);
      toast({
        title: "Sync Error",
        description: "An error occurred while syncing",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Utilities</h1>

        {/* Speaker Statistics Sync */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Speaker Statistics Sync
            </CardTitle>
            <CardDescription>
              Manually sync all speaker statistics (total talks, ratings) with
              actual completed bookings. This is useful if database triggers are
              not working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleSyncAllSpeakers}
              disabled={syncing}
              className="w-full sm:w-auto"
            >
              {syncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync All Speaker Statistics
                </>
              )}
            </Button>

            {/* Sync Results */}
            {syncResults && (
              <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-3 flex items-center">
                  {syncResults.success ? (
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  )}
                  Sync Results
                </h3>

                {syncResults.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">
                        Total Speakers: {syncResults.total}
                      </Badge>
                      <Badge variant="default">
                        Updated: {syncResults.updated}
                      </Badge>
                      <Badge variant="secondary">
                        Already Up to Date:{" "}
                        {syncResults.total - syncResults.updated}
                      </Badge>
                    </div>

                    {syncResults.results && syncResults.results.length > 0 && (
                      <div className="mt-4 max-h-64 overflow-y-auto">
                        <h4 className="font-medium mb-2">Detailed Results:</h4>
                        <div className="space-y-1">
                          {syncResults.results.map(
                            (result: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2 text-sm"
                              >
                                {result.success ? (
                                  result.changes ? (
                                    <>
                                      <CheckCircle className="h-3 w-3 text-green-500" />
                                      <span>
                                        Speaker {result.speakerId}: Updated
                                      </span>
                                      {result.changes.total_talks && (
                                        <span className="text-muted-foreground">
                                          (talks:{" "}
                                          {result.changes.total_talks.old} →{" "}
                                          {result.changes.total_talks.new})
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3 w-3 text-blue-500" />
                                      <span>
                                        Speaker {result.speakerId}: Already up
                                        to date
                                      </span>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 text-red-500" />
                                    <span>
                                      Speaker {result.speakerId}: Failed
                                    </span>
                                  </>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>Sync failed. Check console for details.</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>When to Use This Tool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Database Triggers Not Working
                </h4>
                <p>
                  If speaker statistics aren't updating automatically when
                  events are completed or ratings are submitted.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Data Migration
                </h4>
                <p>
                  After importing data or making changes to the database schema.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Data Verification
                </h4>
                <p>
                  To ensure all speaker statistics are accurate and in sync with
                  actual bookings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUtils;
