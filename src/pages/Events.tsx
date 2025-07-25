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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar-utils";

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
  images?: string[];
  organizer: {
    id: string;
    full_name: string;
    location?: string;
    avatar_url?: string;
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
  const [eventImages, setEventImages] = useState<File[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
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
          organizer:profiles!organizer_id(id, full_name, location, avatar_url)
        `
        )
        .eq("status", "open")
        .gte("date_time", new Date().toISOString())
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

  const uploadEventImages = async (
    eventId: string,
    images: File[]
  ): Promise<string[]> => {
    if (images.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const fileExt = file.name.split(".").pop();
      const fileName = `${user!.id}/${eventId}/${Date.now()}-${i}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Error uploading image:", uploadError);
        continue; // Skip this image and continue with others
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("event-images").getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    // Validate that the event date is at least 7 days from now
    const eventDate = new Date(eventForm.date_time);
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (eventDate < oneWeekFromNow) {
      toast({
        title: "Invalid event date",
        description:
          "Events must be scheduled at least 7 days in advance to allow speakers time to prepare.",
        variant: "destructive",
      });
      return;
    }

    setCreateLoading(true);

    try {
      // Get the user's profile ID
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      // Create the event first
      const { data: eventData, error } = await supabase
        .from("events")
        .insert({
          organizer_id: profile.id,
          title: eventForm.title,
          description: eventForm.description,
          event_type: eventForm.event_type,
          format: eventForm.format,
          location: eventForm.location || null,
          date_time: new Date(eventForm.date_time).toISOString(),
          duration_hours: parseInt(eventForm.duration_hours),
          budget_min: eventForm.budget_min
            ? parseInt(eventForm.budget_min)
            : null, // Store in Rupiah directly
          budget_max: eventForm.budget_max
            ? parseInt(eventForm.budget_max)
            : null, // Store in Rupiah directly
          required_topics: eventForm.required_topics,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      // Upload images if any
      let imageUrls: string[] = [];
      if (eventImages.length > 0) {
        setImageUploading(true);
        imageUrls = await uploadEventImages(eventData.id, eventImages);

        // Update event with image URLs
        if (imageUrls.length > 0) {
          const { error: updateError } = await supabase
            .from("events")
            .update({ images: imageUrls } as any)
            .eq("id", eventData.id);

          if (updateError) {
            console.error("Error updating event with images:", updateError);
          }
        }
        setImageUploading(false);
      }

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
      setEventImages([]);
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
          ? parseInt(applicationForm.proposed_rate)
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
    if (min && max)
      return `Rp${min.toLocaleString("id-ID")} - Rp${max.toLocaleString(
        "id-ID"
      )}`;
    if (min) return `From Rp${min.toLocaleString("id-ID")}`;
    if (max) return `Up to Rp${max.toLocaleString("id-ID")}`;
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
                        min={(() => {
                          const oneWeekFromNow = new Date();
                          oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
                          return oneWeekFromNow.toISOString().slice(0, 16);
                        })()}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            date_time: e.target.value,
                          })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Events must be scheduled at least 7 days in advance
                      </p>
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
                      <Label htmlFor="budget-min">Budget Min (IDR)</Label>
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
                        placeholder="e.g., 500000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget-max">Budget Max (IDR)</Label>
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
                        placeholder="e.g., 2000000"
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

                  <div className="space-y-2">
                    <Label>Event Images (Optional)</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 5) {
                            toast({
                              title: "Too many images",
                              description:
                                "You can upload maximum 5 images per event.",
                              variant: "destructive",
                            });
                            return;
                          }
                          setEventImages(files);
                        }}
                        className="hidden"
                        id="event-images"
                      />
                      <label
                        htmlFor="event-images"
                        className="cursor-pointer flex flex-col items-center text-center"
                      >
                        <Plus className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600 mb-1">
                          Click to upload event images
                        </span>
                        <span className="text-xs text-gray-500">
                          PNG, JPG, WebP up to 10MB each (max 5 images)
                        </span>
                      </label>
                      {eventImages.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-2">
                            {eventImages.length} image(s) selected:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {eventImages.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2 text-xs"
                              >
                                <span className="truncate">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEventImages(
                                      eventImages.filter((_, i) => i !== index)
                                    );
                                  }}
                                  className="h-4 w-4 p-0"
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
                      disabled={createLoading || imageUploading}
                      className="flex-1"
                    >
                      {(createLoading || imageUploading) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {imageUploading ? "Uploading Images..." : "Create Event"}
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

                  {/* Event Images Preview */}
                  {event.images && event.images.length > 0 && (
                    <div className="px-6 pb-4">
                      <img
                        src={event.images[0]}
                        alt={event.title}
                        className="w-full h-32 object-cover rounded-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg";
                        }}
                      />
                      {event.images.length > 1 && (
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          +{event.images.length - 1} more image
                          {event.images.length > 2 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  )}

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
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={getAvatarUrl(event.organizer?.avatar_url)}
                            alt={event.organizer?.full_name || "Organizer"}
                          />
                          <AvatarFallback className="bg-primary/10 text-xs">
                            {event.organizer?.full_name
                              ?.charAt(0)
                              ?.toUpperCase() || "O"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            Organized by {event.organizer?.full_name}
                            {event.organizer?.location &&
                              ` • ${event.organizer.location}`}
                          </p>
                        </div>
                      </div>
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
                                Proposed Rate (IDR/hour)
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
                                placeholder="e.g., 500000"
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
