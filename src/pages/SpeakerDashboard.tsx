import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  TrendingUp,
  Calendar,
  DollarSign,
  Award,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SpeakerStats {
  total_events_completed: number;
  total_earnings: number;
  average_rating: number;
  total_ratings: number;
  pending_bookings: number;
  upcoming_events: number;
  paid_events: number;
  waiting_organizer_completion: number;
  total_released_payments: number;
}

export default function SpeakerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SpeakerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSpeakerStats();
    }
  }, [user]);

  const fetchSpeakerStats = async () => {
    try {
      setLoading(true);

      // Get basic speaker info and bookings
      const { data: speakerData, error: speakerError } = await supabase
        .from("speakers")
        .select(
          `
          *,
          profile:profiles!speakers_profile_id_fkey(user_id)
        `
        )
        .eq("profile.user_id", user?.id)
        .single();

      if (speakerError || !speakerData) {
        console.log("No speaker profile found");
        setLoading(false);
        return;
      }

      // Get bookings for this speaker
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*")
        .eq("speaker_id", speakerData.id);

      const bookings = bookingsData || [];

      const basicStats: SpeakerStats = {
        total_events_completed: bookings.filter((b) => b.status === "completed")
          .length,
        total_earnings: 0, // Will be calculated after migration
        average_rating: 0, // Will be updated after migration
        total_ratings: 0, // Will be updated after migration
        pending_bookings: bookings.filter((b) => b.status === "pending").length,
        upcoming_events: bookings.filter((b) => b.status === "accepted").length,
        paid_events: bookings.filter((b) => b.status === "paid").length,
        waiting_organizer_completion: 0, // Will be updated after migration
        total_released_payments: 0, // Will be updated after migration
      };

      setStats(basicStats);
    } catch (error) {
      console.error("Error fetching speaker stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Speaker Dashboard
          </h1>
          <p className="text-gray-600">
            No speaker profile found. Please complete your speaker profile
            first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Speaker Dashboard
        </h1>
        <p className="text-gray-600">
          Overview of your speaking career and earnings
        </p>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total_events_completed}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed speaking engagements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp{stats.total_earnings.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground">
              From completed events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Rating
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">
                {stats.average_rating ? stats.average_rating.toFixed(1) : "N/A"}
              </div>
              {stats.average_rating && (
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= stats.average_rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {stats.total_ratings} rating
              {stats.total_ratings !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Applications
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_bookings}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting organizer response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Event Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Event Status Overview
            </CardTitle>
            <CardDescription>
              Current status of your speaking engagements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Upcoming Events</span>
              <Badge variant="outline">{stats.upcoming_events}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Paid Events</span>
              <Badge variant="default">{stats.paid_events}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Waiting for Completion
              </span>
              <Badge variant="secondary">
                {stats.waiting_organizer_completion}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completed Events</span>
              <Badge variant="default" className="bg-green-600">
                {stats.total_events_completed}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Payment Overview
            </CardTitle>
            <CardDescription>Your earnings and payment status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Total Released Payments
              </span>
              <span className="font-bold text-green-600">
                Rp{stats.total_released_payments.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average per Event</span>
              <span className="font-medium">
                Rp
                {stats.total_events_completed > 0
                  ? (
                      stats.total_earnings / stats.total_events_completed
                    ).toLocaleString("id-ID")
                  : "0"}
              </span>
            </div>
            {stats.total_ratings > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <Star className="h-4 w-4 inline mr-1" />
                  You've maintained an excellent rating of{" "}
                  {stats.average_rating.toFixed(1)} stars!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      {stats.total_events_completed > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Insights
            </CardTitle>
            <CardDescription>Your speaking career highlights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {stats.total_events_completed}
                </p>
                <p className="text-sm text-gray-600">Events Completed</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  Rp{stats.total_earnings.toLocaleString("id-ID")}
                </p>
                <p className="text-sm text-gray-600">Total Earned</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.average_rating
                    ? stats.average_rating.toFixed(1)
                    : "N/A"}
                </p>
                <p className="text-sm text-gray-600">Average Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
