import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SpeakerPaymentNotifications from "@/components/SpeakerPaymentNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock as PendingIcon,
  TrendingUp,
  Users,
  Award,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SpeakerApplication {
  id: string;
  status: string;
  agreed_rate?: number;
  message?: string;
  created_at: string;
  updated_at: string;
  event: {
    id: string;
    title: string;
    description: string;
    event_type: string;
    format: string;
    location?: string;
    date_time: string;
    duration_hours: number;
    budget_min?: number;
    budget_max?: number;
    status: string;
    organizer: {
      full_name: string;
      avatar_url?: string;
      location?: string;
    };
  };
}

const SpeakerEvents = () => {
  const [applications, setApplications] = useState<SpeakerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [userProfile, setUserProfile] = useState<{ user_type: string } | null>(
    null
  );
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchMyApplications();
    }
  }, [user]);

  // Add focus event listener to refresh data when user returns to page
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchMyApplications();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchMyApplications = async () => {
    if (!user) return;

    try {
      console.log("Fetching applications for user:", user.id);

      // First get user's profile ID
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("User profile not found:", profileError);
        setLoading(false);
        return;
      }

      console.log("User profile found:", userProfile);

      // Then get user's speaker profile ID using the profile ID
      const { data: speakerProfile, error: speakerError } = await supabase
        .from("speakers")
        .select("id")
        .eq("profile_id", userProfile.id)
        .single();

      if (speakerError) {
        console.error("Speaker profile not found:", speakerError);
        setLoading(false);
        return;
      }

      console.log("Speaker profile found:", speakerProfile);

      // Fetch applications made by this speaker
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          event:events!event_id(
            id,
            title,
            description,
            event_type,
            format,
            location,
            date_time,
            duration_hours,
            budget_min,
            budget_max,
            status,
            organizer:profiles!organizer_id(full_name, avatar_url, location)
          )
        `
        )
        .eq("speaker_id", speakerProfile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("Applications found:", data);
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error loading applications",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = applications.filter((application) => {
    const matchesSearch =
      application.event.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      application.event.organizer.full_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || application.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return "Budget not specified";
    if (min && max)
      return `Rp${min.toLocaleString("id-ID")} - Rp${max.toLocaleString(
        "id-ID"
      )}`;
    if (min) return `From Rp${min.toLocaleString("id-ID")}`;
    if (max) return `Up to Rp${max.toLocaleString("id-ID")}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Accepted
          </Badge>
        );
      case "paid":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100"
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Paid
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline">
            <PendingIcon className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEventStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="default">Open</Badge>;
      case "in_progress":
        return <Badge variant="outline">In Progress</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "finished":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100"
          >
            Finished
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: applications.length,
    pending: applications.filter((app) => app.status === "pending").length,
    accepted: applications.filter(
      (app) => app.status === "accepted" || app.status === "paid"
    ).length,
    rejected: applications.filter((app) => app.status === "rejected").length,
  };

  const canAccessSpeakerEvents =
    userProfile?.user_type === "speaker" || userProfile?.user_type === "both";

  if (!canAccessSpeakerEvents) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground mb-4">
            You need to be registered as a speaker to view this page.
          </p>
          <Link to="/auth">
            <Button>Sign up as Speaker</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading your applications...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Applications</h1>
          <p className="text-muted-foreground">
            Track all your speaking applications and their status
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Applications
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <PendingIcon className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending
                  </p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Accepted
                  </p>
                  <p className="text-2xl font-bold">{stats.accepted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-full">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Rejected
                  </p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Notifications */}
        <div className="mb-8">
          <SpeakerPaymentNotifications />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events or organizers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Applications</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Applications List */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
            <TabsTrigger value="accepted">
              Accepted ({stats.accepted})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({stats.rejected})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredApplications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Award className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Applications Found
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchTerm || filterStatus !== "all"
                      ? "No applications match your current filters"
                      : "You haven't applied to any events yet"}
                  </p>
                  <Link to="/events">
                    <Button>Browse Events</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="max-h-96 overflow-y-auto grid gap-6">
                {filteredApplications.map((application) => (
                  <Card
                    key={application.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-semibold mb-2">
                                <Link
                                  to={`/events/${application.event.id}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {application.event.title}
                                </Link>
                              </h3>
                              <div className="flex items-center space-x-2 mb-2">
                                {getEventStatusBadge(application.event.status)}
                                <Badge variant="outline">
                                  {application.event.event_type}
                                </Badge>
                                <Badge variant="outline">
                                  {application.event.format}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              {getStatusBadge(application.status)}
                              <p className="text-xs text-muted-foreground">
                                Applied {formatDate(application.created_at)}
                              </p>
                            </div>
                          </div>

                          <p className="text-muted-foreground mb-4 line-clamp-2">
                            {application.event.description}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="mr-2 h-4 w-4" />
                              {formatDate(application.event.date_time)}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="mr-2 h-4 w-4" />
                              {application.event.duration_hours} hours
                            </div>
                            {application.event.location && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="mr-2 h-4 w-4" />
                                {application.event.location}
                              </div>
                            )}
                            <div className="flex items-center text-sm text-muted-foreground">
                              <DollarSign className="mr-2 h-4 w-4" />
                              {formatBudget(
                                application.event.budget_min,
                                application.event.budget_max
                              )}
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-sm text-muted-foreground mb-2">
                              Organized by{" "}
                              {application.event.organizer.full_name}
                              {application.event.organizer.location &&
                                ` • ${application.event.organizer.location}`}
                            </p>

                            {application.message && (
                              <div className="bg-muted/50 p-3 rounded-lg">
                                <p className="text-sm font-medium mb-1">
                                  Your Application Message:
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {application.message}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="lg:w-64 space-y-4">
                          {application.agreed_rate && (
                            <div className="text-center p-4 bg-primary/5 rounded-lg">
                              <p className="text-sm text-muted-foreground">
                                Proposed Rate
                              </p>
                              <p className="text-2xl font-bold text-primary">
                                Rp
                                {application.agreed_rate.toLocaleString(
                                  "id-ID"
                                )}
                                <span className="text-sm text-muted-foreground">
                                  /hour
                                </span>
                              </p>
                            </div>
                          )}

                          <div className="flex flex-col space-y-2">
                            <Link to={`/events/${application.event.id}`}>
                              <Button variant="outline" className="w-full">
                                <Eye className="mr-2 h-4 w-4" />
                                View Event
                              </Button>
                            </Link>

                            {application.status === "accepted" && (
                              <Badge
                                variant="default"
                                className="justify-center py-2"
                              >
                                <TrendingUp className="mr-2 h-4 w-4" />
                                Congratulations! You got this event
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <div className="max-h-96 overflow-y-auto grid gap-6">
              {filteredApplications
                .filter((app) => app.status === "pending")
                .map((application) => (
                  <Card
                    key={application.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-semibold mb-2">
                                <Link
                                  to={`/events/${application.event.id}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {application.event.title}
                                </Link>
                              </h3>
                              <div className="flex items-center space-x-2 mb-2">
                                {getEventStatusBadge(application.event.status)}
                                <Badge variant="outline">
                                  {application.event.event_type}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              {getStatusBadge(application.status)}
                              <p className="text-xs text-muted-foreground">
                                Applied {formatDate(application.created_at)}
                              </p>
                            </div>
                          </div>

                          <p className="text-muted-foreground mb-4 line-clamp-2">
                            {application.event.description}
                          </p>

                          <div className="flex items-center text-sm text-muted-foreground mb-4">
                            <Calendar className="mr-2 h-4 w-4" />
                            {formatDate(application.event.date_time)}
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-sm text-muted-foreground">
                              Organized by{" "}
                              {application.event.organizer.full_name}
                            </p>
                          </div>
                        </div>

                        <div className="lg:w-64">
                          <Link to={`/events/${application.event.id}`}>
                            <Button variant="outline" className="w-full">
                              <Eye className="mr-2 h-4 w-4" />
                              View Event
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="accepted" className="space-y-4">
            <div className="max-h-96 overflow-y-auto grid gap-6">
              {filteredApplications
                .filter(
                  (app) => app.status === "accepted" || app.status === "paid"
                )
                .map((application) => (
                  <Card
                    key={application.id}
                    className="hover:shadow-lg transition-shadow border-green-200 bg-green-50/50"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-semibold mb-2">
                                <Link
                                  to={`/events/${application.event.id}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {application.event.title}
                                </Link>
                              </h3>
                              <div className="flex items-center space-x-2 mb-2">
                                {getEventStatusBadge(application.event.status)}
                                <Badge variant="outline">
                                  {application.event.event_type}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              {getStatusBadge(application.status)}
                              <p className="text-xs text-muted-foreground">
                                Accepted {formatDate(application.updated_at)}
                              </p>
                            </div>
                          </div>

                          <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center">
                              <Award className="h-5 w-5 text-green-600 mr-2" />
                              <p className="font-medium text-green-800">
                                Congratulations!
                              </p>
                            </div>
                            <p className="text-sm text-green-700 mt-1">
                              Your application has been accepted. You're
                              confirmed to speak at this event.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="mr-2 h-4 w-4" />
                              {formatDate(application.event.date_time)}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="mr-2 h-4 w-4" />
                              {application.event.duration_hours} hours
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-sm text-muted-foreground">
                              Organized by{" "}
                              {application.event.organizer.full_name}
                            </p>
                          </div>
                        </div>

                        <div className="lg:w-64 space-y-4">
                          {application.agreed_rate && (
                            <div className="text-center p-4 bg-green-100 border border-green-200 rounded-lg">
                              <p className="text-sm text-green-700">
                                Agreed Rate
                              </p>
                              <p className="text-2xl font-bold text-green-800">
                                Rp
                                {application.agreed_rate.toLocaleString(
                                  "id-ID"
                                )}
                                <span className="text-sm">/hour</span>
                              </p>
                            </div>
                          )}

                          {/* Complete Event Button - only show for paid events that have passed */}
                          {(() => {
                            const eventHasPassed =
                              new Date(application.event.date_time).getTime() +
                                2 * 60 * 60 * 1000 <
                              Date.now();
                            const isPaidStatus = application.status === "paid";
                            const isNotCompleted =
                              application.status !== "completed";

                            return (
                              isPaidStatus &&
                              eventHasPassed &&
                              isNotCompleted && (
                                <Button
                                  variant="outline"
                                  className="w-full mb-2"
                                  onClick={() =>
                                    navigate(
                                      `/event-completion/${application.id}`
                                    )
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Complete Event
                                </Button>
                              )
                            );
                          })()}

                          <Link to={`/events/${application.event.id}`}>
                            <Button className="w-full">
                              <Eye className="mr-2 h-4 w-4" />
                              View Event Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            <div className="max-h-96 overflow-y-auto grid gap-6">
              {filteredApplications
                .filter((app) => app.status === "rejected")
                .map((application) => (
                  <Card
                    key={application.id}
                    className="hover:shadow-lg transition-shadow border-red-200 bg-red-50/30"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-semibold mb-2">
                                <Link
                                  to={`/events/${application.event.id}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {application.event.title}
                                </Link>
                              </h3>
                              <div className="flex items-center space-x-2 mb-2">
                                {getEventStatusBadge(application.event.status)}
                                <Badge variant="outline">
                                  {application.event.event_type}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              {getStatusBadge(application.status)}
                              <p className="text-xs text-muted-foreground">
                                Rejected {formatDate(application.updated_at)}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="mr-2 h-4 w-4" />
                              {formatDate(application.event.date_time)}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="mr-2 h-4 w-4" />
                              {application.event.duration_hours} hours
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-sm text-muted-foreground">
                              Organized by{" "}
                              {application.event.organizer.full_name}
                            </p>
                          </div>
                        </div>

                        <div className="lg:w-64">
                          <Link to={`/events/${application.event.id}`}>
                            <Button variant="outline" className="w-full">
                              <Eye className="mr-2 h-4 w-4" />
                              View Event
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SpeakerEvents;
