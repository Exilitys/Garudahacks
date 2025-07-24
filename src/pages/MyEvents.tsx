import React, { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Search,
  Users,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Event {
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
  required_topics: string[];
  status: string;
  created_at: string;
}

interface Booking {
  id: string;
  status: string;
  agreed_rate?: number;
  message?: string;
  created_at: string;
  speaker: {
    id: string;
    experience_level: string;
    average_rating: number;
    total_talks: number;
    profile: {
      full_name: string;
      avatar_url?: string;
      bio?: string;
      location?: string;
    };
  };
  event: {
    id: string;
    title: string;
  };
}

const MyEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ user_type: string } | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [eventBookings, setEventBookings] = useState<Booking[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchMyEvents();
      fetchMyBookings();
    }
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

  const fetchMyEvents = async () => {
    if (!user) return;

    try {
      // Get user's profile ID first
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      // Fetch events created by this user
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", profile.id)
        .order("date_time", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error loading events",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    if (!user) return;

    try {
      // Get user's profile ID first
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      // Fetch bookings for events organized by this user
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          speaker:speakers!speaker_id(
            id,
            experience_level,
            average_rating,
            total_talks,
            profile:profiles!profile_id(full_name, avatar_url, bio, location)
          ),
          event:events!event_id(id, title)
        `
        )
        .eq("organizer_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const fetchEventBookings = async (eventId: string) => {
    setBookingLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          speaker:speakers!speaker_id(
            id,
            experience_level,
            average_rating,
            total_talks,
            profile:profiles!profile_id(full_name, avatar_url, bio, location)
          ),
          event:events!event_id(id, title)
        `
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEventBookings(data || []);
    } catch (error) {
      console.error("Error fetching event bookings:", error);
      toast({
        title: "Error loading applications",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBookingAction = async (
    bookingId: string,
    action: "accepted" | "rejected"
  ) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: action })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: `Application ${action}`,
        description: `The speaker application has been ${action}.`,
      });

      // Refresh bookings
      fetchMyBookings();
      if (selectedEvent) {
        fetchEventBookings(selectedEvent);
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({
        title: "Error updating application",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || event.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getEventApplicationCount = (eventId: string) => {
    return bookings.filter((booking) => booking.event.id === eventId).length;
  };

  const getPendingApplicationCount = (eventId: string) => {
    return bookings.filter(
      (booking) => booking.event.id === eventId && booking.status === "pending"
    ).length;
  };

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
    if (min && max) return `$${min / 100} - $${max / 100}`;
    if (min) return `From $${min / 100}`;
    if (max) return `Up to $${max / 100}`;
    return "Budget not specified";
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <span
        key={index}
        className={`text-lg ${
          index < Math.floor(rating) ? "text-yellow-400" : "text-gray-300"
        }`}
      >
        ★
      </span>
    ));
  };

  // Check if user has access to this page
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">
            Authentication Required
          </h3>
          <p className="text-muted-foreground mb-4">
            Please sign in to view your events.
          </p>
          <Button onClick={() => (window.location.href = "/auth")}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (
    userProfile &&
    userProfile.user_type !== "organizer" &&
    userProfile.user_type !== "both"
  ) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground mb-4">
            This page is only available to event organizers. You need to have an
            organizer account to manage events.
          </p>
          <Button onClick={() => (window.location.href = "/events")}>
            Browse Events
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Events</h1>
          <p className="text-muted-foreground">
            Manage your events and review speaker applications
          </p>
        </div>

        <Tabs defaultValue="events" className="space-y-6">
          <TabsList>
            <TabsTrigger value="events">
              My Events ({events.length})
            </TabsTrigger>
            <TabsTrigger value="applications">
              All Applications ({bookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Event Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground flex items-center">
                {filteredEvents.length} events found
              </div>
            </div>

            {/* Events Grid */}
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No events found</h3>
                <p className="text-muted-foreground">
                  You haven't created any events yet, or no events match your
                  filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <Card key={event.id} className="h-full flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Badge
                          variant={
                            event.status === "open" ? "default" : "secondary"
                          }
                          className="mb-2"
                        >
                          {event.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline">{event.format}</Badge>
                      </div>
                      <CardTitle className="line-clamp-2">
                        {event.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {event.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between">
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="mr-2 h-4 w-4" />
                          {formatDate(event.date_time)}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-2 h-4 w-4" />
                          {event.duration_hours} hour
                          {event.duration_hours !== 1 ? "s" : ""}
                        </div>
                        {event.location && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-2 h-4 w-4" />
                            {event.location}
                          </div>
                        )}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <DollarSign className="mr-2 h-4 w-4" />
                          {formatBudget(event.budget_min, event.budget_max)}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="mr-2 h-4 w-4" />
                          {getEventApplicationCount(event.id)} applications
                          {getPendingApplicationCount(event.id) > 0 && (
                            <Badge
                              variant="destructive"
                              className="ml-2 text-xs"
                            >
                              {getPendingApplicationCount(event.id)} pending
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <Dialog
                          onOpenChange={(open) => {
                            if (open) {
                              setSelectedEvent(event.id);
                              fetchEventBookings(event.id);
                            } else {
                              setSelectedEvent(null);
                              setEventBookings([]);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button className="w-full">
                              <Eye className="mr-2 h-4 w-4" />
                              View Applications
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Applications for "{event.title}"
                              </DialogTitle>
                              <DialogDescription>
                                Review and manage speaker applications for this
                                event
                              </DialogDescription>
                            </DialogHeader>
                            {bookingLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin" />
                              </div>
                            ) : eventBookings.length === 0 ? (
                              <div className="text-center py-8">
                                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                  No applications yet for this event.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {eventBookings.map((booking) => (
                                  <Card key={booking.id}>
                                    <CardContent className="p-4">
                                      <div className="flex items-start space-x-4">
                                        <Avatar className="h-12 w-12">
                                          <AvatarImage
                                            src={
                                              booking.speaker.profile.avatar_url
                                            }
                                          />
                                          <AvatarFallback>
                                            {booking.speaker.profile.full_name
                                              .charAt(0)
                                              .toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold">
                                              {
                                                booking.speaker.profile
                                                  .full_name
                                              }
                                            </h4>
                                            <Badge
                                              variant={
                                                booking.status === "pending"
                                                  ? "outline"
                                                  : booking.status ===
                                                    "accepted"
                                                  ? "default"
                                                  : "destructive"
                                              }
                                            >
                                              {booking.status}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                                            <span>
                                              {booking.speaker.experience_level}
                                            </span>
                                            <span>
                                              {booking.speaker.total_talks}{" "}
                                              talks
                                            </span>
                                            <div className="flex items-center">
                                              {renderStars(
                                                booking.speaker.average_rating
                                              )}
                                              <span className="ml-1">
                                                (
                                                {booking.speaker.average_rating.toFixed(
                                                  1
                                                )}
                                                )
                                              </span>
                                            </div>
                                          </div>
                                          {booking.speaker.profile.location && (
                                            <div className="flex items-center text-sm text-muted-foreground mb-2">
                                              <MapPin className="mr-1 h-3 w-3" />
                                              {booking.speaker.profile.location}
                                            </div>
                                          )}
                                          {booking.message && (
                                            <div className="mt-2">
                                              <p className="text-sm font-medium mb-1">
                                                Message:
                                              </p>
                                              <p className="text-sm text-muted-foreground">
                                                {booking.message}
                                              </p>
                                            </div>
                                          )}
                                          {booking.agreed_rate && (
                                            <div className="mt-2 text-sm">
                                              <span className="font-medium">
                                                Proposed Rate:{" "}
                                              </span>
                                              ${booking.agreed_rate / 100}/hour
                                            </div>
                                          )}
                                          {booking.status === "pending" && (
                                            <div className="flex space-x-2 mt-4">
                                              <Button
                                                size="sm"
                                                onClick={() =>
                                                  handleBookingAction(
                                                    booking.id,
                                                    "accepted"
                                                  )
                                                }
                                              >
                                                <CheckCircle className="mr-1 h-4 w-4" />
                                                Accept
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() =>
                                                  handleBookingAction(
                                                    booking.id,
                                                    "rejected"
                                                  )
                                                }
                                              >
                                                <XCircle className="mr-1 h-4 w-4" />
                                                Reject
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No applications yet
                </h3>
                <p className="text-muted-foreground">
                  You haven't received any speaker applications for your events.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={booking.speaker.profile.avatar_url}
                          />
                          <AvatarFallback>
                            {booking.speaker.profile.full_name
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">
                                {booking.speaker.profile.full_name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Applied for "{booking.event.title}"
                              </p>
                            </div>
                            <Badge
                              variant={
                                booking.status === "pending"
                                  ? "outline"
                                  : booking.status === "accepted"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                            <span>{booking.speaker.experience_level}</span>
                            <span>{booking.speaker.total_talks} talks</span>
                            <div className="flex items-center">
                              {renderStars(booking.speaker.average_rating)}
                              <span className="ml-1">
                                ({booking.speaker.average_rating.toFixed(1)})
                              </span>
                            </div>
                          </div>
                          {booking.speaker.profile.location && (
                            <div className="flex items-center text-sm text-muted-foreground mb-2">
                              <MapPin className="mr-1 h-3 w-3" />
                              {booking.speaker.profile.location}
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground mb-2">
                            Applied on {formatDate(booking.created_at)}
                          </div>
                          {booking.message && (
                            <div className="mt-2">
                              <p className="text-sm font-medium mb-1">
                                Message:
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {booking.message}
                              </p>
                            </div>
                          )}
                          {booking.agreed_rate && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium">
                                Proposed Rate:{" "}
                              </span>
                              ${booking.agreed_rate / 100}/hour
                            </div>
                          )}
                          {booking.status === "pending" && (
                            <div className="flex space-x-2 mt-4">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleBookingAction(booking.id, "accepted")
                                }
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleBookingAction(booking.id, "rejected")
                                }
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyEvents;
