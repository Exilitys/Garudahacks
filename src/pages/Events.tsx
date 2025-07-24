import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Search,
  Plus,
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
  organizer: {
    id: string;
    full_name: string;
    location?: string;
  };
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterFormat, setFilterFormat] = useState("all");
  const [userProfile, setUserProfile] = useState<{ user_type: string } | null>(
    null
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [applicationForm, setApplicationForm] = useState({
    message: "",
    proposed_rate: "",
  });
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [topics, setTopics] = useState<Array<{ id: string; name: string }>>([]);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    event_type: "lecture" as
      | "lecture"
      | "seminar"
      | "workshop"
      | "webinar"
      | "conference"
      | "other",
    format: "in-person" as "in-person" | "virtual" | "hybrid",
    location: "",
    date_time: "",
    duration_hours: "",
    budget_min: "",
    budget_max: "",
    required_topics: [] as string[],
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
    loadTopics();
    if (user) {
      fetchUserProfile();
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

  const loadTopics = async () => {
    try {
      const { data } = await supabase.from("topics").select("id, name");
      if (data) setTopics(data);
    } catch (error) {
      console.error("Error loading topics:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *,
          organizer:profiles!organizer_id(id, full_name, location)
        `
        )
        .eq("status", "open")
        .order("date_time", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      toast({
        title: "Error loading events",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    setCreateLoading(true);

    try {
      // Get the user's profile ID
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      // Create the event
      const { error } = await supabase.from("events").insert({
        organizer_id: profile.id,
        title: eventForm.title,
        description: eventForm.description,
        event_type: eventForm.event_type,
        format: eventForm.format,
        location: eventForm.location || null,
        date_time: new Date(eventForm.date_time).toISOString(),
        duration_hours: parseInt(eventForm.duration_hours),
        budget_min: eventForm.budget_min
          ? parseInt(eventForm.budget_min) * 100
          : null, // Convert to cents
        budget_max: eventForm.budget_max
          ? parseInt(eventForm.budget_max) * 100
          : null, // Convert to cents
        required_topics: eventForm.required_topics,
        status: "open",
      });

      if (error) throw error;

      toast({
        title: "Event created!",
        description: "Your event has been posted successfully.",
      });

      // Reset form and close dialog
      setEventForm({
        title: "",
        description: "",
        event_type: "lecture",
        format: "in-person",
        location: "",
        date_time: "",
        duration_hours: "",
        budget_min: "",
        budget_max: "",
        required_topics: [],
      });
      setShowCreateDialog(false);

      // Refresh events list
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error creating event",
        description: error.message,
        variant: "destructive",
      });
    }

    setCreateLoading(false);
  };

  const handleApplyToSpeak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !selectedEvent) return;

    setApplicationLoading(true);

    try {
      // Get the user's profile ID and speaker ID
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      // Get speaker ID
      const { data: speaker, error: speakerError } = await supabase
        .from("speakers")
        .select("id")
        .eq("profile_id", profile.id)
        .single();

      if (speakerError) throw speakerError;

      // Check if already applied
      const { data: existingBooking, error: checkError } = await supabase
        .from("bookings")
        .select("id")
        .eq("event_id", selectedEvent.id)
        .eq("speaker_id", speaker.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingBooking) {
        toast({
          title: "Already applied",
          description: "You have already applied to speak at this event.",
          variant: "destructive",
        });
        return;
      }

      // Create the application/booking
      const { error } = await supabase.from("bookings").insert({
        event_id: selectedEvent.id,
        speaker_id: speaker.id,
        organizer_id: selectedEvent.organizer.id, // We need to add this to the Event interface
        status: "pending",
        agreed_rate: applicationForm.proposed_rate
          ? parseInt(applicationForm.proposed_rate) * 100
          : null,
        message: applicationForm.message || null,
      });

      if (error) throw error;

      toast({
        title: "Application submitted!",
        description: "Your speaker application has been sent to the organizer.",
      });

      // Reset form and close dialog
      setApplicationForm({
        message: "",
        proposed_rate: "",
      });
      setShowApplicationDialog(false);
      setSelectedEvent(null);
    } catch (error: any) {
      toast({
        title: "Error submitting application",
        description: error.message,
        variant: "destructive",
      });
    }

    setApplicationLoading(false);
  };

  const handleTopicToggle = (topicName: string) => {
    setEventForm((prev) => ({
      ...prev,
      required_topics: prev.required_topics.includes(topicName)
        ? prev.required_topics.filter((t) => t !== topicName)
        : [...prev.required_topics, topicName],
    }));
  };

  const canCreateEvents =
    userProfile?.user_type === "organizer" || userProfile?.user_type === "both";

  const canApplyToSpeak =
    userProfile?.user_type === "speaker" || userProfile?.user_type === "both";

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || event.event_type === filterType;
    const matchesFormat =
      filterFormat === "all" || event.format === filterFormat;

    return matchesSearch && matchesType && matchesFormat;
  });

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return "Budget not specified";
    if (min && max) return `$${min / 100} - $${max / 100}`;
    if (min) return `From $${min / 100}`;
    if (max) return `Up to $${max / 100}`;
    return "Budget not specified";
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Speaking Opportunities</h1>
            <p className="text-muted-foreground">
              Discover events looking for speakers like you
            </p>
          </div>
          {user && canCreateEvents && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Post Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                  <DialogDescription>
                    Post a new speaking opportunity for the community
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      value={eventForm.title}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, title: e.target.value })
                      }
                      placeholder="e.g., Tech Innovation Conference 2025"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={eventForm.description}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe your event, target audience, and what you're looking for in speakers..."
                      className="min-h-[100px]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event-type">Event Type *</Label>
                      <Select
                        value={eventForm.event_type}
                        onValueChange={(value: any) =>
                          setEventForm({ ...eventForm, event_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lecture">Lecture</SelectItem>
                          <SelectItem value="seminar">Seminar</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="webinar">Webinar</SelectItem>
                          <SelectItem value="conference">Conference</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="format">Format *</Label>
                      <Select
                        value={eventForm.format}
                        onValueChange={(value: any) =>
                          setEventForm({ ...eventForm, format: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in-person">In-Person</SelectItem>
                          <SelectItem value="virtual">Virtual</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={eventForm.location}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, location: e.target.value })
                      }
                      placeholder="e.g., San Francisco Convention Center"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date-time">Date & Time *</Label>
                      <Input
                        id="date-time"
                        type="datetime-local"
                        value={eventForm.date_time}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            date_time: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (hours) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        max="24"
                        value={eventForm.duration_hours}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            duration_hours: e.target.value,
                          })
                        }
                        placeholder="e.g., 2"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="budget-min">Budget Min (USD)</Label>
                      <Input
                        id="budget-min"
                        type="number"
                        min="0"
                        value={eventForm.budget_min}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            budget_min: e.target.value,
                          })
                        }
                        placeholder="e.g., 500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget-max">Budget Max (USD)</Label>
                      <Input
                        id="budget-max"
                        type="number"
                        min="0"
                        value={eventForm.budget_max}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            budget_max: e.target.value,
                          })
                        }
                        placeholder="e.g., 2000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Required Topics</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                      {topics.map((topic) => (
                        <label
                          key={topic.id}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={eventForm.required_topics.includes(
                              topic.name
                            )}
                            onChange={() => handleTopicToggle(topic.name)}
                            className="rounded"
                          />
                          <span className="text-sm">{topic.name}</span>
                        </label>
                      ))}
                    </div>
                    {eventForm.required_topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {eventForm.required_topics.map((topic, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createLoading}
                      className="flex-1"
                    >
                      {createLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Event
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="lecture">Lecture</SelectItem>
              <SelectItem value="seminar">Seminar</SelectItem>
              <SelectItem value="workshop">Workshop</SelectItem>
              <SelectItem value="webinar">Webinar</SelectItem>
              <SelectItem value="conference">Conference</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterFormat} onValueChange={setFilterFormat}>
            <SelectTrigger>
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="in-person">In-Person</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
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
              Try adjusting your search criteria or check back later for new
              opportunities.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <Card
                key={event.id}
                className="h-full flex flex-col hover:shadow-lg transition-shadow"
              >
                <Link
                  to={`/events/${event.id}`}
                  className="flex-1 flex flex-col"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary" className="mb-2">
                        {event.event_type}
                      </Badge>
                      <Badge
                        variant={
                          event.format === "virtual" ? "default" : "outline"
                        }
                      >
                        {event.format}
                      </Badge>
                    </div>
                    <CardTitle className="line-clamp-2 hover:text-primary transition-colors">
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
                      {event.required_topics.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Required Topics:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {event.required_topics
                              .slice(0, 3)
                              .map((topic, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {topic}
                                </Badge>
                              ))}
                            {event.required_topics.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{event.required_topics.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-3">
                        Organized by {event.organizer?.full_name}
                        {event.organizer?.location &&
                          ` • ${event.organizer.location}`}
                      </p>
                    </div>
                  </CardContent>
                </Link>

                {/* Action buttons outside the link to prevent nested links */}
                <CardContent className="pt-0">
                  <div className="pt-4 border-t">
                    {user && canApplyToSpeak ? (
                      <Dialog
                        open={
                          showApplicationDialog &&
                          selectedEvent?.id === event.id
                        }
                        onOpenChange={(open) => {
                          setShowApplicationDialog(open);
                          if (open) {
                            setSelectedEvent(event);
                          } else {
                            setSelectedEvent(null);
                            setApplicationForm({
                              message: "",
                              proposed_rate: "",
                            });
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            className="w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Apply to Speak
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Apply to Speak</DialogTitle>
                            <DialogDescription>
                              Submit your application to speak at "{event.title}
                              "
                            </DialogDescription>
                          </DialogHeader>
                          <form
                            onSubmit={handleApplyToSpeak}
                            className="space-y-4"
                          >
                            <div className="space-y-2">
                              <Label htmlFor="message">
                                Message (Optional)
                              </Label>
                              <Textarea
                                id="message"
                                value={applicationForm.message}
                                onChange={(e) =>
                                  setApplicationForm({
                                    ...applicationForm,
                                    message: e.target.value,
                                  })
                                }
                                placeholder="Tell the organizer why you'd be a great fit for this event..."
                                className="min-h-[100px]"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="proposed-rate">
                                Proposed Rate (USD/hour)
                              </Label>
                              <Input
                                id="proposed-rate"
                                type="number"
                                min="0"
                                value={applicationForm.proposed_rate}
                                onChange={(e) =>
                                  setApplicationForm({
                                    ...applicationForm,
                                    proposed_rate: e.target.value,
                                  })
                                }
                                placeholder="e.g., 500"
                              />
                            </div>

                            <div className="flex space-x-3 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowApplicationDialog(false)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={applicationLoading}
                                className="flex-1"
                              >
                                {applicationLoading && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Submit Application
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    ) : !user ? (
                      <Link to="/auth">
                        <Button
                          className="w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Sign In to Apply
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
