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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  getOrganizerInvitations,
  getEventInvitationStats,
  updateInvitationStatus,
  InvitationDetails,
  InvitationStats,
} from "@/lib/speaker-invitations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Clock as PendingIcon,
  DollarSign,
  Calendar,
  MapPin,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InvitationManagerProps {
  eventId?: string; // If provided, show invitations for specific event
  className?: string;
}

const InvitationManager: React.FC<InvitationManagerProps> = ({
  eventId,
  className,
}) => {
  const [invitations, setInvitations] = useState<InvitationDetails[]>([]);
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizerProfile, setOrganizerProfile] = useState<{
    id: string;
  } | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const getOrganizerProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setOrganizerProfile(data);
      }
    };

    getOrganizerProfile();
  }, [user]);

  useEffect(() => {
    if (organizerProfile) {
      fetchInvitations();
      if (eventId) {
        fetchEventStats();
      }
    }
  }, [organizerProfile, eventId]);

  const fetchInvitations = async () => {
    if (!organizerProfile) return;

    setLoading(true);
    try {
      const { data, error } = await getOrganizerInvitations(
        organizerProfile.id
      );
      if (!error && data) {
        let filteredInvitations = data;
        if (eventId) {
          filteredInvitations = data.filter((inv) => inv.event_id === eventId);
        }
        setInvitations(filteredInvitations);
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

  const fetchEventStats = async () => {
    if (!eventId) return;

    try {
      const { data, error } = await getEventInvitationStats(eventId);
      if (!error && data) {
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching event stats:", error);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("speaker_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast({
        title: "Invitation deleted",
        description: "The invitation has been removed",
      });

      fetchInvitations();
      if (eventId) fetchEventStats();
    } catch (error) {
      console.error("Error deleting invitation:", error);
      toast({
        title: "Error deleting invitation",
        description: "Please try again later",
        variant: "destructive",
      });
    }
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
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvitations = {
    all: invitations,
    pending: invitations.filter((inv) => inv.status === "pending"),
    accepted: invitations.filter((inv) => inv.status === "accepted"),
    declined: invitations.filter((inv) => inv.status === "declined"),
    expired: invitations.filter(
      (inv) =>
        inv.status === "expired" ||
        (inv.expires_at && new Date(inv.expires_at) < new Date())
    ),
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading invitations...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          {eventId ? "Event Invitations" : "Speaker Invitations"}
        </CardTitle>
        <CardDescription>
          {eventId
            ? "Manage invitations sent for this event"
            : "Manage all your speaker invitations"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {stats.total_invitations}
              </div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending_invitations}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.accepted_invitations}
              </div>
              <div className="text-sm text-muted-foreground">Accepted</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {stats.declined_invitations}
              </div>
              <div className="text-sm text-muted-foreground">Declined</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {stats.expired_invitations}
              </div>
              <div className="text-sm text-muted-foreground">Expired</div>
            </div>
          </div>
        )}

        {/* Invitations List */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              All ({filteredInvitations.all.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({filteredInvitations.pending.length})
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

          {Object.entries(filteredInvitations).map(([key, invitationList]) => (
            <TabsContent key={key} value={key} className="space-y-4">
              {invitationList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No {key === "all" ? "" : key} invitations found.
                </div>
              ) : (
                <div className="space-y-4">
                  {invitationList.map((invitation) => (
                    <Card
                      key={invitation.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <Avatar className="h-12 w-12">
                              <AvatarImage
                                src={invitation.speaker_avatar || ""}
                              />
                              <AvatarFallback>
                                {invitation.speaker_name
                                  .charAt(0)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold">
                                  {invitation.speaker_name}
                                </h4>
                                {getStatusBadge(
                                  invitation.status,
                                  invitation.expires_at
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-sm text-muted-foreground">
                                <div className="flex items-center">
                                  <Mail className="mr-2 h-3 w-3" />
                                  {invitation.speaker_email}
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="mr-2 h-3 w-3" />
                                  {formatDate(invitation.event_date)}
                                </div>
                                {invitation.proposed_rate && (
                                  <div className="flex items-center">
                                    <DollarSign className="mr-2 h-3 w-3" />
                                    {formatRate(invitation.proposed_rate)}
                                  </div>
                                )}
                                {invitation.expires_at && (
                                  <div className="flex items-center">
                                    <Clock className="mr-2 h-3 w-3" />
                                    Expires {formatDate(invitation.expires_at)}
                                  </div>
                                )}
                              </div>

                              {!eventId && (
                                <div className="mb-3">
                                  <h5 className="font-medium text-sm">
                                    {invitation.event_title}
                                  </h5>
                                  {invitation.event_location && (
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      <MapPin className="mr-1 h-3 w-3" />
                                      {invitation.event_location}
                                    </div>
                                  )}
                                </div>
                              )}

                              {invitation.message && (
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-sm">
                                    {invitation.message}
                                  </p>
                                </div>
                              )}

                              <div className="mt-3 text-xs text-muted-foreground">
                                Sent {formatDate(invitation.created_at)}
                                {invitation.updated_at !==
                                  invitation.created_at && (
                                  <span>
                                    {" "}
                                    • Updated{" "}
                                    {formatDate(invitation.updated_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {invitation.status === "pending" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDeleteInvitation(invitation.id)
                                  }
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Cancel Invitation
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InvitationManager;
