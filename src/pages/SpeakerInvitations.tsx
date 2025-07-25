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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  getSpeakerInvitations,
  updateInvitationStatus,
  InvitationDetails,
} from "@/lib/speaker-invitations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock as PendingIcon,
  Eye,
  Mail,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SpeakerInvitations = () => {
  const [invitations, setInvitations] = useState<InvitationDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [speakerProfile, setSpeakerProfile] = useState<{ id: string } | null>(
    null
  );

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const getSpeakerProfile = async () => {
      if (!user) return;

      try {
        console.log("Fetching speaker profile for user:", user.id);

        // First get user's profile ID
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          throw profileError;
        }

        console.log("User profile found:", userProfile);

        // Then get user's speaker profile ID using the profile ID
        const { data: speakerData, error: speakerError } = await supabase
          .from("speakers")
          .select("id")
          .eq("profile_id", userProfile.id)
          .single();

        if (speakerError) {
          console.error("Error fetching speaker data:", speakerError);
          if (speakerError.code === "PGRST116") {
            console.log("No speaker profile found for this user");
            return;
          }
          throw speakerError;
        }

        console.log("Speaker profile found:", speakerData);
        setSpeakerProfile(speakerData);
      } catch (error) {
        console.error("Error fetching speaker profile:", error);
      }
    };

    getSpeakerProfile();
  }, [user]);

  useEffect(() => {
    if (speakerProfile) {
      fetchInvitations();
    }
  }, [speakerProfile]);

  const fetchInvitations = async () => {
    if (!speakerProfile) return;

    setLoading(true);
    try {
      console.log("Fetching invitations for speaker profile:", speakerProfile);
      const { data, error } = await getSpeakerInvitations(speakerProfile.id);
      console.log("Invitation fetch result:", { data, error });

      if (error) {
        console.error("Error fetching invitations:", error);
        toast({
          title: "Error loading invitations",
          description: error.message || "Please try again later",
          variant: "destructive",
        });
      } else {
        console.log("Setting invitations:", data);
        setInvitations(data || []);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast({
        title: "Error loading invitations",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = async (
    invitationId: string,
    status: "accepted" | "declined"
  ) => {
    setActionLoading(invitationId);
    try {
      const { error } = await updateInvitationStatus(invitationId, status);

      if (error) throw error;

      toast({
        title: `Invitation ${status}`,
        description: `You have ${status} the speaking invitation.`,
      });

      fetchInvitations(); // Refresh the list
    } catch (error: any) {
      console.error("Error responding to invitation:", error);
      toast({
        title: "Error updating invitation",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
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

  const formatRate = (rate: number | null) => {
    if (!rate) return "Rate not specified";
    return `Rp${rate.toLocaleString("id-ID")}/hour`;
  };

  const getStatusBadge = (status: string, expiresAt?: string | null) => {
    const isExpired = expiresAt && new Date(expiresAt) < new Date();

    switch (status) {
      case "accepted":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Accepted
          </Badge>
        );
      case "declined":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Declined
          </Badge>
        );
      case "expired":
      case "pending":
        if (isExpired) {
          return (
            <Badge variant="secondary">
              <Clock className="mr-1 h-3 w-3" />
              Expired
            </Badge>
          );
        }
        return (
          <Badge variant="outline">
            <PendingIcon className="mr-1 h-3 w-3" />
            Pending Response
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isInvitationExpired = (expiresAt: string | null) => {
    return expiresAt && new Date(expiresAt) < new Date();
  };

  const canRespondToInvitation = (status: string, expiresAt: string | null) => {
    return status === "pending" && !isInvitationExpired(expiresAt);
  };

  const filteredInvitations = {
    all: invitations,
    pending: invitations.filter(
      (inv) => inv.status === "pending" && !isInvitationExpired(inv.expires_at)
    ),
    accepted: invitations.filter((inv) => inv.status === "accepted"),
    declined: invitations.filter((inv) => inv.status === "declined"),
    expired: invitations.filter(
      (inv) => inv.status === "expired" || isInvitationExpired(inv.expires_at)
    ),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading your invitations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Speaking Invitations</h1>
          <p className="text-muted-foreground">
            Manage invitations to speak at events
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Invitations
                  </p>
                  <p className="text-2xl font-bold">
                    {filteredInvitations.all.length}
                  </p>
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
                    Pending Response
                  </p>
                  <p className="text-2xl font-bold">
                    {filteredInvitations.pending.length}
                  </p>
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
                  <p className="text-2xl font-bold">
                    {filteredInvitations.accepted.length}
                  </p>
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
                    Declined
                  </p>
                  <p className="text-2xl font-bold">
                    {filteredInvitations.declined.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* No invitations message for speakers who don't have a speaker profile */}
        {!speakerProfile && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Speaker Profile Required
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                You need to set up a speaker profile to receive invitations from
                event organizers.
              </p>
              <Link to="/auth">
                <Button>Set Up Speaker Profile</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Invitations List */}
        {speakerProfile && (
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pending">
                Pending ({filteredInvitations.pending.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({filteredInvitations.all.length})
              </TabsTrigger>
              <TabsTrigger value="accepted">
                Accepted ({filteredInvitations.accepted.length})
              </TabsTrigger>
              <TabsTrigger value="declined">
                Declined ({filteredInvitations.declined.length})
              </TabsTrigger>
              <TabsTrigger value="expired">
                Expired ({filteredInvitations.expired.length})
              </TabsTrigger>
            </TabsList>

            {Object.entries(filteredInvitations).map(
              ([key, invitationList]) => (
                <TabsContent key={key} value={key} className="space-y-4">
                  {invitationList.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No Invitations Found
                        </h3>
                        <p className="text-muted-foreground text-center">
                          {key === "pending"
                            ? "You don't have any pending invitations to respond to."
                            : `No ${
                                key === "all" ? "" : key
                              } invitations found.`}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-6">
                      {invitationList.map((invitation) => (
                        <Card
                          key={invitation.id}
                          className="hover:shadow-lg transition-shadow"
                        >
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <h3 className="text-xl font-semibold mb-2">
                                      <Link
                                        to={`/events/${invitation.event_id}`}
                                        className="hover:text-primary transition-colors"
                                      >
                                        {invitation.event_title}
                                      </Link>
                                    </h3>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Badge variant="outline">
                                        {invitation.event_type}
                                      </Badge>
                                      <Badge variant="outline">
                                        {invitation.event_format}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end space-y-2">
                                    {getStatusBadge(
                                      invitation.status,
                                      invitation.expires_at
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      Invited{" "}
                                      {formatDate(invitation.created_at)}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {formatDate(invitation.event_date)}
                                  </div>
                                  {invitation.event_location && (
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      <MapPin className="mr-2 h-4 w-4" />
                                      {invitation.event_location}
                                    </div>
                                  )}
                                  {invitation.proposed_rate && (
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      <DollarSign className="mr-2 h-4 w-4" />
                                      {formatRate(invitation.proposed_rate)}
                                    </div>
                                  )}
                                  {invitation.expires_at && (
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      <Clock className="mr-2 h-4 w-4" />
                                      Expires{" "}
                                      {formatDate(invitation.expires_at)}
                                    </div>
                                  )}
                                </div>

                                <div className="border-t pt-4">
                                  <div className="flex items-center space-x-3 mb-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage
                                        src={invitation.organizer_avatar || ""}
                                      />
                                      <AvatarFallback>
                                        {invitation.organizer_name
                                          .charAt(0)
                                          .toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium">
                                        {invitation.organizer_name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {invitation.organizer_email}
                                      </p>
                                    </div>
                                  </div>

                                  {invitation.message && (
                                    <div className="bg-muted/50 p-3 rounded-lg">
                                      <p className="text-sm font-medium mb-1">
                                        Invitation Message:
                                      </p>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {invitation.message}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="lg:w-64 space-y-4">
                                {canRespondToInvitation(
                                  invitation.status,
                                  invitation.expires_at
                                ) && (
                                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                    <p className="text-sm font-medium mb-3">
                                      Respond to Invitation
                                    </p>
                                    <div className="flex flex-col space-y-2">
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            className="w-full"
                                            disabled={
                                              actionLoading === invitation.id
                                            }
                                          >
                                            {actionLoading === invitation.id ? (
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                              <CheckCircle className="mr-2 h-4 w-4" />
                                            )}
                                            Accept Invitation
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>
                                              Accept Invitation
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to accept
                                              this speaking invitation for "
                                              {invitation.event_title}"? This
                                              will confirm your participation in
                                              the event.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>
                                              Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() =>
                                                handleInvitationResponse(
                                                  invitation.id,
                                                  "accepted"
                                                )
                                              }
                                            >
                                              Accept
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>

                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            className="w-full"
                                            disabled={
                                              actionLoading === invitation.id
                                            }
                                          >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Decline Invitation
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>
                                              Decline Invitation
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to decline
                                              this speaking invitation for "
                                              {invitation.event_title}"? This
                                              action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>
                                              Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() =>
                                                handleInvitationResponse(
                                                  invitation.id,
                                                  "declined"
                                                )
                                              }
                                            >
                                              Decline
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                )}

                                <Link to={`/events/${invitation.event_id}`}>
                                  <Button variant="outline" className="w-full">
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Event Details
                                  </Button>
                                </Link>

                                {invitation.status === "accepted" && (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center">
                                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                      <p className="text-sm text-green-800 font-medium">
                                        You're confirmed to speak at this event!
                                      </p>
                                    </div>
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
              )
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default SpeakerInvitations;
