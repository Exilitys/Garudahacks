import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  createSpeakerInvitation,
  searchSpeakersForInvitation,
  checkExistingInvitation,
  checkInvitationTableExists,
  getCurrentUserProfile,
} from "@/lib/speaker-invitations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  Mail,
  MapPin,
  Star,
  DollarSign,
  Loader2,
  UserPlus,
  CheckCircle,
} from "lucide-react";

interface InviteSpeakerProps {
  eventId: string;
  eventTitle: string;
  onInvitationSent?: () => void;
}

interface Speaker {
  id: string;
  experience_level: string;
  hourly_rate: number | null;
  average_rating: number | null;
  available: boolean;
  profile: {
    full_name: string;
    email: string;
    bio: string | null;
    location: string | null;
    avatar_url: string | null;
  };
}

const InviteSpeaker: React.FC<InviteSpeakerProps> = ({
  eventId,
  eventTitle,
  onInvitationSent,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [invitationForm, setInvitationForm] = useState({
    message: "",
    proposed_rate: "",
    expires_in_days: "7",
  });
  const [organizerProfile, setOrganizerProfile] = useState<{
    id: string;
  } | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  // Get organizer profile on component mount
  useEffect(() => {
    const getOrganizerProfile = async () => {
      if (!user) {
        console.log("No user found");
        return;
      }

      console.log("Fetching organizer profile for user:", user.id);

      // Check if tables exist first
      const tableExists = await checkInvitationTableExists();
      console.log("Invitation table exists:", tableExists);

      if (!tableExists) {
        toast({
          title: "Database not ready",
          description: "The invitation system is not yet set up. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching organizer profile:", error);
      } else {
        console.log("Organizer profile found:", data);
        setOrganizerProfile(data);
      }
    };

    getOrganizerProfile();
  }, [user]);

  // Search speakers when search term changes
  useEffect(() => {
    const searchSpeakers = async () => {
      if (searchTerm.trim().length < 2) {
        setSpeakers([]);
        return;
      }

      setSearchLoading(true);
      try {
        const { data, error } = await searchSpeakersForInvitation(searchTerm);
        if (!error && data) {
          setSpeakers(data as Speaker[]);
        }
      } catch (error) {
        console.error("Error searching speakers:", error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchSpeakers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSpeakerSelect = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setInvitationForm({
      ...invitationForm,
      message: `Hi ${speaker.profile.full_name},\n\nI would like to invite you to speak at "${eventTitle}". I believe your expertise would be a great fit for our event.\n\nLooking forward to hearing from you!`,
    });
  };

  const handleSendInvitation = async () => {
    if (!selectedSpeaker || !organizerProfile) {
      console.log("Missing data:", { selectedSpeaker, organizerProfile });
      toast({
        title: "Missing information",
        description: "Please ensure you're logged in and have selected a speaker",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log("Checking existing invitation for:", { eventId, speakerId: selectedSpeaker.id });
      
      // First check if speaker is already invited
      const { data: existingInvitation } = await checkExistingInvitation(
        eventId,
        selectedSpeaker.id
      );

      if (existingInvitation) {
        toast({
          title: "Speaker already invited",
          description: `${selectedSpeaker.profile.full_name} has already been invited to this event.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(
        expiresAt.getDate() + parseInt(invitationForm.expires_in_days)
      );

      const invitationData = {
        event_id: eventId,
        organizer_id: organizerProfile.id,
        speaker_id: selectedSpeaker.id,
        message: invitationForm.message || null,
        proposed_rate: invitationForm.proposed_rate
          ? parseInt(invitationForm.proposed_rate) * 100
          : null,
        expires_at: expiresAt.toISOString(),
      };

      console.log("Sending invitation with data:", invitationData);

      // Debug: Check current user profile
      const { data: userProfile } = await getCurrentUserProfile();
      console.log("User profile check:", userProfile);

      const { data, error } = await createSpeakerInvitation(invitationData);

      if (error) throw error;

      toast({
        title: "Invitation sent!",
        description: `Invitation has been sent to ${selectedSpeaker.profile.full_name}`,
      });

      // Reset form and close dialog
      setSelectedSpeaker(null);
      setInvitationForm({
        message: "",
        proposed_rate: "",
        expires_in_days: "7",
      });
      setSearchTerm("");
      setSpeakers([]);
      setOpen(false);

      // Call callback if provided
      if (onInvitationSent) {
        onInvitationSent();
      }
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error sending invitation",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatRate = (rate: number | null) => {
    if (!rate) return "Rate not specified";
    return `$${rate}/hour`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Speaker
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Speaker to Event</DialogTitle>
          <DialogDescription>
            Search and invite speakers to speak at "{eventTitle}"
          </DialogDescription>
        </DialogHeader>

        {!selectedSpeaker ? (
          // Speaker Search Phase
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="speaker-search">Search Speakers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="speaker-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or expertise..."
                  className="pl-10"
                />
              </div>
            </div>

            {searchLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Searching speakers...</span>
              </div>
            )}

            {speakers.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <h4 className="font-medium">Available Speakers</h4>
                {speakers.map((speaker) => (
                  <div
                    key={speaker.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSpeakerSelect(speaker)}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={speaker.profile.avatar_url || ""} />
                        <AvatarFallback>
                          {speaker.profile.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">
                            {speaker.profile.full_name}
                          </h5>
                          <Badge variant="outline">
                            {speaker.experience_level}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center">
                            <Mail className="mr-1 h-3 w-3" />
                            {speaker.profile.email}
                          </div>
                          {speaker.profile.location && (
                            <div className="flex items-center">
                              <MapPin className="mr-1 h-3 w-3" />
                              {speaker.profile.location}
                            </div>
                          )}
                          {speaker.average_rating && (
                            <div className="flex items-center">
                              <Star className="mr-1 h-3 w-3" />
                              {speaker.average_rating.toFixed(1)}
                            </div>
                          )}
                          <div className="flex items-center">
                            <DollarSign className="mr-1 h-3 w-3" />
                            {formatRate(speaker.hourly_rate)}
                          </div>
                        </div>

                        {speaker.profile.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {speaker.profile.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchTerm.length >= 2 &&
              speakers.length === 0 &&
              !searchLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  No speakers found matching your search.
                </div>
              )}
          </div>
        ) : (
          // Invitation Form Phase
          <div className="space-y-4">
            {/* Selected Speaker Info */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center space-x-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedSpeaker.profile.avatar_url || ""} />
                  <AvatarFallback>
                    {selectedSpeaker.profile.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">
                    {selectedSpeaker.profile.full_name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedSpeaker.profile.email}
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSpeaker(null)}
              >
                Choose Different Speaker
              </Button>
            </div>

            {/* Invitation Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Invitation Message</Label>
                <Textarea
                  id="message"
                  value={invitationForm.message}
                  onChange={(e) =>
                    setInvitationForm({
                      ...invitationForm,
                      message: e.target.value,
                    })
                  }
                  placeholder="Write a personalized invitation message..."
                  className="min-h-[120px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proposed-rate">
                    Proposed Rate (USD/hour)
                  </Label>
                  <Input
                    id="proposed-rate"
                    type="number"
                    min="0"
                    value={invitationForm.proposed_rate}
                    onChange={(e) =>
                      setInvitationForm({
                        ...invitationForm,
                        proposed_rate: e.target.value,
                      })
                    }
                    placeholder="e.g., 500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires-in">Expires In (Days)</Label>
                  <Input
                    id="expires-in"
                    type="number"
                    min="1"
                    max="30"
                    value={invitationForm.expires_in_days}
                    onChange={(e) =>
                      setInvitationForm({
                        ...invitationForm,
                        expires_in_days: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSpeaker(null)}
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSendInvitation}
                  disabled={loading || !invitationForm.message.trim()}
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invitation
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteSpeaker;
