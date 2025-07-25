import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  TrendingUp,
  Calendar,
  DollarSign,
  Award,
  Users,
  Mic2,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  FileText,
  Mail,
  Eye,
} from "lucide-react";
import { Link } from "react-router-dom";

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

interface OrganizerStats {
  total_events_created: number;
  total_events_completed: number;
  total_spent: number;
  active_events: number;
  pending_payments: number;
  speakers_hired: number;
  average_event_rating: number;
  events_this_month: number;
}

interface RecentEvent {
  id: string;
  title: string;
  date: string;
  status: string;
  speaker_name?: string;
  organizer_name?: string;
  amount?: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<{
    user_type: string;
    full_name: string;
  } | null>(null);
  const [speakerStats, setSpeakerStats] = useState<SpeakerStats | null>(null);
  const [organizerStats, setOrganizerStats] = useState<OrganizerStats | null>(
    null
  );
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const formatRate = (rate?: number) => {
    if (!rate) return "Rate not specified";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rate);
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_type, full_name")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;

      setUserProfile(profile);

      if (profile.user_type === "speaker") {
        await fetchSpeakerStats();
      } else if (profile.user_type === "organizer") {
        await fetchOrganizerStats();
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpeakerStats = async () => {
    try {
      // Get speaker stats (reusing logic from SpeakerDashboard)
      const { data: speakerData, error: speakerError } = await supabase
        .from("speakers")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (speakerError) throw speakerError;

      // Get booking statistics
      const { data: bookings, error: bookingError } = await supabase
        .from("speaker_bookings")
        .select("*")
        .eq("speaker_id", speakerData.id);

      if (bookingError) throw bookingError;

      // Get ratings
      const { data: ratings, error: ratingError } = await supabase
        .from("speaker_ratings")
        .select("rating")
        .eq("speaker_id", speakerData.id);

      if (ratingError) throw ratingError;

      // Calculate stats
      const completedEvents = bookings.filter(
        (b) => b.status === "completed"
      ).length;
      const totalEarnings = bookings
        .filter((b) => b.status === "completed")
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          : 0;

      const pendingBookings = bookings.filter(
        (b) => b.status === "pending"
      ).length;
      const upcomingEvents = bookings.filter(
        (b) => b.status === "confirmed"
      ).length;

      setSpeakerStats({
        total_events_completed: completedEvents,
        total_earnings: totalEarnings,
        average_rating: averageRating,
        total_ratings: ratings.length,
        pending_bookings: pendingBookings,
        upcoming_events: upcomingEvents,
        paid_events: bookings.filter((b) => b.payment_status === "paid").length,
        waiting_organizer_completion: bookings.filter(
          (b) => b.status === "waiting_completion"
        ).length,
        total_released_payments: totalEarnings,
      });

      // Get recent events for speaker
      const { data: recentEventsData } = await supabase
        .from("speaker_bookings")
        .select(
          `
          id,
          status,
          amount,
          events (title, date, organizer:profiles!events_organizer_id_fkey(full_name))
        `
        )
        .eq("speaker_id", speakerData.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentEventsData) {
        setRecentEvents(
          recentEventsData.map((booking) => ({
            id: booking.id,
            title: booking.events?.title || "Untitled Event",
            date: booking.events?.date || "",
            status: booking.status,
            organizer_name: booking.events?.organizer?.full_name,
            amount: booking.amount,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching speaker stats:", error);
    }
  };

  const fetchOrganizerStats = async () => {
    try {
      // Get events created by organizer
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user?.id);

      if (eventsError) throw eventsError;

      // Get bookings for organizer's events
      const eventIds = events.map((e) => e.id);
      const { data: bookings, error: bookingsError } = await supabase
        .from("speaker_bookings")
        .select("*")
        .in("event_id", eventIds);

      if (bookingsError) throw bookingsError;

      // Calculate stats
      const completedEvents = events.filter(
        (e) => e.status === "completed"
      ).length;
      const totalSpent = bookings
        .filter((b) => b.status === "completed")
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      const activeEvents = events.filter(
        (e) => e.status === "upcoming" || e.status === "open"
      ).length;

      const pendingPayments = bookings.filter(
        (b) => b.status === "confirmed" && b.payment_status === "pending"
      ).length;

      const uniqueSpeakers = new Set(bookings.map((b) => b.speaker_id)).size;

      const currentMonth = new Date().toISOString().slice(0, 7);
      const eventsThisMonth = events.filter((e) =>
        e.created_at?.startsWith(currentMonth)
      ).length;

      setOrganizerStats({
        total_events_created: events.length,
        total_events_completed: completedEvents,
        total_spent: totalSpent,
        active_events: activeEvents,
        pending_payments: pendingPayments,
        speakers_hired: uniqueSpeakers,
        average_event_rating: 0, // Would need event ratings table
        events_this_month: eventsThisMonth,
      });

      // Get recent events for organizer
      const { data: recentEventsData } = await supabase
        .from("events")
        .select(
          `
          id,
          title,
          date,
          status,
          speaker_bookings (speaker:speakers(user:profiles(full_name)), amount)
        `
        )
        .eq("organizer_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentEventsData) {
        setRecentEvents(
          recentEventsData.map((event) => ({
            id: event.id,
            title: event.title,
            date: event.date,
            status: event.status,
            speaker_name: event.speaker_bookings?.[0]?.speaker?.user?.full_name,
            amount: event.speaker_bookings?.[0]?.amount,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching organizer stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Setup Required</CardTitle>
            <CardDescription>
              Please complete your profile setup to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/profile">
              <Button className="w-full">Complete Profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSpeaker = userProfile.user_type === "speaker";
  const isOrganizer = userProfile.user_type === "organizer";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {userProfile.full_name}!
          </h1>
          <p className="text-muted-foreground mt-2">
            {isSpeaker && "Here's your speaking activity overview"}
            {isOrganizer && "Here's your event organization overview"}
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {isSpeaker && speakerStats && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Earnings
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatRate(speakerStats.total_earnings)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        From {speakerStats.total_events_completed} completed
                        events
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
                      <div className="text-2xl font-bold">
                        {speakerStats.average_rating.toFixed(1)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        From {speakerStats.total_ratings} reviews
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Upcoming Events
                      </CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {speakerStats.upcoming_events}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Confirmed bookings
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Pending Requests
                      </CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {speakerStats.pending_bookings}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Awaiting your response
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              {isOrganizer && organizerStats && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Events Created
                      </CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {organizerStats.total_events_created}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {organizerStats.total_events_completed} completed
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Investment
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatRate(organizerStats.total_spent)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Spent on speakers
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Active Events
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {organizerStats.active_events}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Currently ongoing
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Speakers Hired
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {organizerStats.speakers_hired}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Unique speakers worked with
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Frequently used actions for your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {isSpeaker && (
                    <>
                      <Link to="/speaker-events">
                        <Button
                          variant="outline"
                          className="w-full h-auto py-4"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <Calendar className="h-6 w-6" />
                            <span>View Applications</span>
                          </div>
                        </Button>
                      </Link>
                      <Link to="/invitations">
                        <Button
                          variant="outline"
                          className="w-full h-auto py-4"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <Mail className="h-6 w-6" />
                            <span>Invitations</span>
                          </div>
                        </Button>
                      </Link>
                      <Link to="/profile">
                        <Button
                          variant="outline"
                          className="w-full h-auto py-4"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <Mic2 className="h-6 w-6" />
                            <span>Update Profile</span>
                          </div>
                        </Button>
                      </Link>
                      <Link to="/events">
                        <Button
                          variant="outline"
                          className="w-full h-auto py-4"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <Eye className="h-6 w-6" />
                            <span>Browse Events</span>
                          </div>
                        </Button>
                      </Link>
                    </>
                  )}

                  {isOrganizer && (
                    <>
                      <Link to="/events">
                        <Button className="w-full h-auto py-4">
                          <div className="flex flex-col items-center space-y-2">
                            <Calendar className="h-6 w-6" />
                            <span>Create Event</span>
                          </div>
                        </Button>
                      </Link>
                      <Link to="/my-events">
                        <Button
                          variant="outline"
                          className="w-full h-auto py-4"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <FileText className="h-6 w-6" />
                            <span>Manage Events</span>
                          </div>
                        </Button>
                      </Link>
                      <Link to="/speakers">
                        <Button
                          variant="outline"
                          className="w-full h-auto py-4"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <Users className="h-6 w-6" />
                            <span>Find Speakers</span>
                          </div>
                        </Button>
                      </Link>
                      <Link to="/profile">
                        <Button
                          variant="outline"
                          className="w-full h-auto py-4"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <Building className="h-6 w-6" />
                            <span>Update Profile</span>
                          </div>
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>
                  {isSpeaker && "Track your speaking career progress"}
                  {isOrganizer && "Monitor your event organization metrics"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Analytics Coming Soon
                  </h3>
                  <p className="text-muted-foreground">
                    Detailed analytics and insights will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest events and interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentEvents.length > 0 ? (
                  <div className="space-y-4">
                    {recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{event.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {isSpeaker &&
                                event.organizer_name &&
                                `Organizer: ${event.organizer_name}`}
                              {isOrganizer &&
                                event.speaker_name &&
                                `Speaker: ${event.speaker_name}`}
                              {event.date &&
                                ` • ${new Date(
                                  event.date
                                ).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              event.status === "completed"
                                ? "default"
                                : event.status === "confirmed"
                                ? "secondary"
                                : event.status === "pending"
                                ? "outline"
                                : "destructive"
                            }
                          >
                            {event.status}
                          </Badge>
                          {event.amount && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatRate(event.amount)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No Recent Activity
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {isSpeaker &&
                        "Start by browsing events or updating your profile."}
                      {isOrganizer && "Create your first event to get started."}
                    </p>
                    <Link to={isSpeaker ? "/events" : "/events"}>
                      <Button>
                        {isSpeaker ? "Browse Events" : "Create Event"}
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
