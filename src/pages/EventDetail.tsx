import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageGallery } from "@/components/ui/image-gallery";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import InviteSpeaker from "@/components/InviteSpeaker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Users,
  ArrowLeft,
  Globe,
  Briefcase,
  Mail,
  Phone,
  MessageSquare,
  UserPlus,
  Loader2,
  Building,
  Target,
  Info,
  CheckCircle,
  XCircle,
  Clock as PendingIcon,
  User,
  CreditCard,
} from "lucide-react";

interface EventDetails {
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
  required_topics?: string[];
  status: string;
  organizer_id: string;
  created_at: string;
  images?: string[];
  organizer: {
    full_name: string;
    bio?: string;
    location?: string;
    avatar_url?: string;
    website?: string;
    email: string;
  };
}

interface Application {
  id: string;
  message?: string;
  proposed_rate?: number;
  status: string;
  created_at: string;
  speaker: {
    id: string;
    profile: {
      full_name: string;
      avatar_url?: string;
    };
    experience_level: string;
    average_rating: number;
  };
}

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [confirmedSpeakers, setConfirmedSpeakers] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ user_type: string } | null>(
    null
  );
  const [userApplicationStatus, setUserApplicationStatus] = useState<{
    status: string;
    applied: boolean;
  } | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    message: "",
    proposed_rate: "",
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchEventDetails();
      fetchApplications();
      fetchConfirmedSpeakers();
    }
    if (user) {
      fetchUserProfile();
      checkUserApplicationStatus();
    }
  }, [id, user]);

  // Add focus event listener to refresh data when user returns to page
  useEffect(() => {
    const handleFocus = () => {
      if (id) {
        fetchApplications();
        fetchConfirmedSpeakers();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [id]);

  const fetchEventDetails = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *,
          organizer:profiles!organizer_id(full_name, bio, location, avatar_url, website, email)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast({
        title: "Error loading event",
        description: "Event not found or unable to load details",
        variant: "destructive",
      });
      navigate("/events");
    } finally {
      setLoading(false);
    }
  };

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

  const fetchApplications = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          speaker:speakers(
            id,
            experience_level,
            average_rating,
            profile:profiles!profile_id(full_name, avatar_url)
          )
        `
        )
        .eq("event_id", id)
        .neq("status", "paid")
        .order("created_at", { ascending: false });

      if (error && error.code !== "PGRST116") throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  };

  const fetchConfirmedSpeakers = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          speaker:speakers(
            id,
            experience_level,
            average_rating,
            profile:profiles!profile_id(full_name, avatar_url)
          )
        `
        )
        .eq("event_id", id)
        .in("status", ["accepted", "paid"])
        .order("created_at", { ascending: false });

      if (error && error.code !== "PGRST116") throw error;
      setConfirmedSpeakers(data || []);
    } catch (error) {
      console.error("Error fetching confirmed speakers:", error);
    }
  };

  const checkUserApplicationStatus = async () => {
    if (!user || !id) return;

    try {
      // First get user's profile ID
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("User profile not found:", profileError);
        return;
      }

      // Then get user's speaker profile ID using the profile ID
      const { data: speakerProfile, error: speakerError } = await supabase
        .from("speakers")
        .select("id")
        .eq("profile_id", userProfile.id)
        .single();

      if (speakerError) {
        console.error("Speaker profile not found:", speakerError);
        setUserApplicationStatus({ applied: false, status: "" });
        return;
      }

      // Check if user has already applied to this event
      const { data: existingApplication, error: applicationError } =
        await supabase
          .from("bookings")
          .select("status")
          .eq("event_id", id)
          .eq("speaker_id", speakerProfile.id)
          .single();

      if (applicationError && applicationError.code !== "PGRST116") {
        console.error("Error checking application status:", applicationError);
        setUserApplicationStatus({ applied: false, status: "" });
        return;
      }

      if (existingApplication) {
        setUserApplicationStatus({
          applied: true,
          status: existingApplication.status,
        });
      } else {
        setUserApplicationStatus({ applied: false, status: "" });
      }
    } catch (error) {
      console.error("Error checking user application status:", error);
      setUserApplicationStatus({ applied: false, status: "" });
    }
  };

  const handleApplyToSpeak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !event) return;

    setApplyLoading(true);

    // Set a timeout as a failsafe to reset loading state after 30 seconds
    const timeoutId = setTimeout(() => {
      console.warn("Application submission timed out, resetting loading state");
      setApplyLoading(false);
      toast({
        title: "Request timed out",
        description: "The request took too long. Please try again.",
        variant: "destructive",
      });
    }, 30000); // 30 seconds timeout

    try {
      console.log("Submitting application for user:", user.id);

      // First get user's profile ID
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        throw new Error(
          "User profile not found. Please make sure you're logged in properly."
        );
      }

      console.log("User profile found:", userProfile);

      // Get speaker ID for the current user using profile ID
      const { data: speakerData, error: speakerError } = await supabase
        .from("speakers")
        .select("id")
        .eq("profile_id", userProfile.id)
        .single();

      if (speakerError) {
        console.error("Speaker error:", speakerError);
        throw new Error(
          "Speaker profile not found. Please make sure you're registered as a speaker."
        );
      }

      console.log("Speaker profile found:", speakerData);

      // Get organizer profile ID
      const { data: organizerData, error: organizerError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", event.organizer.email) // This might need adjustment based on your schema
        .single();

      if (organizerError) {
        // If we can't get organizer by email, we'll use the organizer_id from event directly
        console.warn(
          "Could not fetch organizer profile, using event organizer_id"
        );
      }

      const { data: insertedBooking, error } = await supabase
        .from("bookings")
        .insert({
          event_id: event.id,
          speaker_id: speakerData.id,
          organizer_id: organizerData?.id || event.organizer_id, // Fallback to event's organizer_id
          message: applicationForm.message || null,
          agreed_rate: applicationForm.proposed_rate
            ? parseInt(applicationForm.proposed_rate)
            : null,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Booking insert error:", error);
        throw error;
      }

      console.log("✅ Successfully inserted booking:", insertedBooking);

      toast({
        title: "Application submitted!",
        description: "Your application has been sent to the organizer",
      });

      setShowApplyDialog(false);
      setApplicationForm({
        message: "",
        proposed_rate: "",
      });
      await fetchApplications(); // Refresh applications
      await fetchConfirmedSpeakers(); // Refresh confirmed speakers
      await checkUserApplicationStatus(); // Check application status
    } catch (error: any) {
      console.error("Error submitting application:", error);

      let errorMessage = "Please try again later";

      if (error.message) {
        if (error.message.includes("duplicate key")) {
          errorMessage = "You have already applied to speak at this event";
        } else if (error.message.includes("Speaker profile not found")) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error submitting application",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Clear the timeout since the operation completed
      clearTimeout(timeoutId);
      // Always reset loading state, regardless of success or failure
      setApplyLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
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

  const getApplicationStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Accepted
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

  const handleApplicationAction = async (
    applicationId: string,
    action: "accepted" | "rejected"
  ) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: action,
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (error) throw error;

      toast({
        title: `Application ${action}`,
        description: `The speaker application has been ${action}.`,
        variant: action === "accepted" ? "default" : "destructive",
      });

      // Refresh applications and confirmed speakers to show updated status
      await fetchApplications();
      await fetchConfirmedSpeakers();
    } catch (error) {
      console.error(`Error ${action} application:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action.replace(
          "ed",
          ""
        )} application. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const canApplyToSpeak =
    userProfile?.user_type === "speaker" || userProfile?.user_type === "both";

  const isOrganizer = user && event && event.organizer.email === user.email;

  const handleContactOrganizer = () => {
    // Navigate to chat page
    navigate("/chat");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Event not found</h3>
          <p className="text-muted-foreground mb-4">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/events")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/events")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Button>

        {/* Event Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
                    <div className="flex items-center space-x-2 mb-3">
                      {getStatusBadge(event.status)}
                      <Badge variant="outline">{event.event_type}</Badge>
                      <Badge variant="outline">{event.format}</Badge>
                    </div>
                  </div>
                </div>

                {/* Event Images Gallery */}
                {event.images && event.images.length > 0 && (
                  <div className="mb-6 w-full overflow-hidden">
                    <ImageGallery images={event.images} />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    {formatDate(event.date_time)}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    {event.duration_hours} hours
                  </div>
                  {event.location && (
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="mr-2 h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                  <div className="flex items-center text-muted-foreground">
                    <DollarSign className="mr-2 h-4 w-4" />
                    {formatBudget(event.budget_min, event.budget_max)}
                  </div>
                </div>

                {/* Apply to Speak Button or Application Status */}
                {user && canApplyToSpeak && !isOrganizer && (
                  <div className="mb-4">
                    {userApplicationStatus?.applied ? (
                      // Show application status if user has already applied
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium mb-1">
                              Application Status
                            </p>
                            <p className="text-sm text-muted-foreground">
                              You have already applied to speak at this event
                            </p>
                          </div>
                          <div>
                            {getApplicationStatusBadge(
                              userApplicationStatus.status
                            )}
                          </div>
                        </div>
                        {userApplicationStatus.status === "accepted" && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center">
                              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                              <p className="text-sm text-green-800 font-medium">
                                Congratulations! Your application has been
                                accepted.
                              </p>
                            </div>
                          </div>
                        )}
                        {userApplicationStatus.status === "rejected" && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center">
                              <XCircle className="h-4 w-4 text-red-600 mr-2" />
                              <p className="text-sm text-red-800">
                                Your application was not selected for this
                                event.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Show Apply to Speak button if user hasn't applied and event is open
                      event.status === "open" && (
                        <Dialog
                          open={showApplyDialog}
                          onOpenChange={(open) => {
                            setShowApplyDialog(open);
                            // Reset loading state and form when dialog is closed
                            if (!open) {
                              setApplyLoading(false);
                              setApplicationForm({
                                message: "",
                                proposed_rate: "",
                              });
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button className="mb-4">
                              <UserPlus className="mr-2 h-4 w-4" />
                              Apply to Speak
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Apply to Speak</DialogTitle>
                              <DialogDescription>
                                Submit your application to speak at "
                                {event.title}"
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
                                  onClick={() => {
                                    setShowApplyDialog(false);
                                    setApplyLoading(false);
                                    setApplicationForm({
                                      message: "",
                                      proposed_rate: "",
                                    });
                                  }}
                                  className="flex-1"
                                  disabled={applyLoading}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={applyLoading}
                                  className="flex-1"
                                >
                                  {applyLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                  Submit Application
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Organizer Info */}
              <Card className="lg:w-80">
                <CardHeader>
                  <CardTitle className="text-lg">Event Organizer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={event.organizer.avatar_url} />
                      <AvatarFallback>
                        {event.organizer.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{event.organizer.full_name}</p>
                      {event.organizer.location && (
                        <p className="text-sm text-muted-foreground">
                          {event.organizer.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {event.organizer.bio && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {event.organizer.bio}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Mail className="mr-2 h-3 w-3" />
                      {event.organizer.email}
                    </div>
                    {event.organizer.website && (
                      <div className="flex items-center text-sm">
                        <Globe className="mr-2 h-3 w-3" />
                        <a
                          href={event.organizer.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {event.organizer.website}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Contact Organizer Button - Only show for speakers */}
                  {user && canApplyToSpeak && !isOrganizer && (
                    <Button
                      onClick={handleContactOrganizer}
                      className="w-full"
                      variant="outline"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Contact Organizer
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            {/* Required Topics */}
            {event.required_topics && event.required_topics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Required Topics</CardTitle>
                  <CardDescription>
                    Topics that speakers should be able to present on
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {event.required_topics.map((topic, index) => (
                      <Badge key={index} variant="outline">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Speaker Invitation - Only show to organizer */}
            {isOrganizer && (
              <Card>
                <CardHeader>
                  <CardTitle>Invite Speakers</CardTitle>
                  <CardDescription>
                    Search and invite speakers to present at your event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InviteSpeaker
                    eventId={event.id}
                    eventTitle={event.title}
                    onInvitationSent={() => {
                      // Optionally refresh data or show success message
                      toast({
                        title: "Invitation sent!",
                        description:
                          "The speaker has been invited to your event.",
                      });
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Speaker Applications - Only show to organizer */}
            {isOrganizer && applications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Speaker Applications</CardTitle>
                  <CardDescription>
                    Applications from speakers who want to present at your event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto space-y-4">
                    {applications.map((application) => (
                      <div
                        key={application.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={application.speaker.profile.avatar_url}
                            />
                            <AvatarFallback>
                              {application.speaker.profile.full_name
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">
                                {application.speaker.profile.full_name}
                              </h4>
                              <Badge
                                variant={
                                  application.status === "accepted"
                                    ? "default"
                                    : application.status === "rejected"
                                    ? "destructive"
                                    : application.status === "paid"
                                    ? "default"
                                    : "outline"
                                }
                                className={
                                  application.status === "paid"
                                    ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100"
                                    : ""
                                }
                              >
                                {application.status}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                              <Badge variant="outline" className="text-xs">
                                {application.speaker.experience_level}
                              </Badge>
                              {application.speaker.average_rating > 0 && (
                                <span>
                                  ⭐{" "}
                                  {application.speaker.average_rating.toFixed(
                                    1
                                  )}
                                </span>
                              )}
                              {application.proposed_rate && (
                                <span>
                                  Rp
                                  {application.proposed_rate.toLocaleString(
                                    "id-ID"
                                  )}
                                  /hour
                                </span>
                              )}
                            </div>
                            {application.message && (
                              <p className="text-sm text-muted-foreground">
                                {application.message}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Applied{" "}
                              {new Date(
                                application.created_at
                              ).toLocaleDateString()}
                            </p>

                            {/* Action buttons for organizers */}
                            {isOrganizer && (
                              <div className="mt-3 flex gap-2">
                                <Link
                                  to={`/speakers/${application.speaker.id}`}
                                >
                                  <Button size="sm" variant="outline">
                                    <User className="mr-1 h-4 w-4" />
                                    View Profile
                                  </Button>
                                </Link>

                                {application.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() =>
                                        handleApplicationAction(
                                          application.id,
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
                                        handleApplicationAction(
                                          application.id,
                                          "rejected"
                                        )
                                      }
                                    >
                                      <XCircle className="mr-1 h-4 w-4" />
                                      Reject
                                    </Button>
                                  </>
                                )}

                                {application.status === "accepted" && (
                                  <Link to={`/payment/${application.id}`}>
                                    <Button size="sm" variant="default">
                                      <CreditCard className="mr-1 h-4 w-4" />
                                      Pay Speaker
                                    </Button>
                                  </Link>
                                )}

                                {application.status === "paid" && (
                                  <Button size="sm" variant="outline" disabled>
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    Payment Completed
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Confirmed Speakers - Only show to organizer */}
            {isOrganizer && confirmedSpeakers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Confirmed Speakers</CardTitle>
                  <CardDescription>
                    Speakers who have been accepted and/or paid for this event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto space-y-4">
                    {confirmedSpeakers.map((speaker) => (
                      <div
                        key={speaker.id}
                        className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/10"
                      >
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={speaker.speaker.profile.avatar_url}
                            />
                            <AvatarFallback>
                              {speaker.speaker.profile.full_name
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">
                                {speaker.speaker.profile.full_name}
                              </h4>
                              <Badge
                                variant={
                                  speaker.status === "paid"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  speaker.status === "paid"
                                    ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100"
                                    : ""
                                }
                              >
                                {speaker.status === "paid"
                                  ? "Paid"
                                  : "Confirmed"}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                              <Badge variant="outline" className="text-xs">
                                {speaker.speaker.experience_level}
                              </Badge>
                              {speaker.speaker.average_rating > 0 && (
                                <span>
                                  ⭐ {speaker.speaker.average_rating.toFixed(1)}
                                </span>
                              )}
                              {speaker.proposed_rate && (
                                <span>
                                  Rp
                                  {speaker.proposed_rate.toLocaleString(
                                    "id-ID"
                                  )}
                                  /hour
                                </span>
                              )}
                            </div>
                            {speaker.message && (
                              <p className="text-sm text-muted-foreground">
                                {speaker.message}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Applied{" "}
                              {new Date(
                                speaker.created_at
                              ).toLocaleDateString()}
                            </p>

                            {/* Action buttons for organizers */}
                            {isOrganizer && (
                              <div className="mt-3 flex gap-2">
                                <Link to={`/speakers/${speaker.speaker.id}`}>
                                  <Button size="sm" variant="outline">
                                    <User className="mr-1 h-4 w-4" />
                                    View Profile
                                  </Button>
                                </Link>

                                {speaker.status === "accepted" && (
                                  <Link to={`/payment/${speaker.id}`}>
                                    <Button size="sm" variant="default">
                                      <CreditCard className="mr-1 h-4 w-4" />
                                      Pay Speaker
                                    </Button>
                                  </Link>
                                )}

                                {speaker.status === "paid" && (
                                  <Button size="sm" variant="outline" disabled>
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    Payment Completed
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Info */}
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Type</span>
                  <Badge variant="outline">{event.event_type}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Format</span>
                  <Badge variant="outline">{event.format}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Duration</span>
                  <span className="text-sm">{event.duration_hours} hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  {getStatusBadge(event.status)}
                </div>
                <Separator />
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    Created {new Date(event.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Applications Count */}
            {applications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Application Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {applications.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Applications
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-medium">
                        {
                          applications.filter((a) => a.status === "pending")
                            .length
                        }
                      </div>
                      <div className="text-muted-foreground">Pending</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-600">
                        {
                          applications.filter((a) => a.status === "accepted")
                            .length
                        }
                      </div>
                      <div className="text-muted-foreground">Accepted</div>
                    </div>
                    <div>
                      <div className="font-medium text-red-600">
                        {
                          applications.filter((a) => a.status === "rejected")
                            .length
                        }
                      </div>
                      <div className="text-muted-foreground">Rejected</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
