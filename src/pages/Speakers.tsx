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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Star,
  DollarSign,
  Search,
  Verified,
  Award,
} from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar-utils";

interface Speaker {
  id: string;
  experience_level: string;
  hourly_rate?: number;
  available: boolean;
  verified: boolean;
  total_talks: number;
  average_rating: number;
  total_ratings?: number;
  profile: {
    full_name: string;
    bio?: string;
    location?: string;
    avatar_url?: string;
  };
  topics: Array<{
    topic: {
      name: string;
    };
  }>;
}

const Speakers = () => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterAvailable, setFilterAvailable] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchSpeakers();

    // Set up real-time subscription to speakers table
    // This will refresh the speakers list when speaker statistics are updated
    const speakersSubscription = supabase
      .channel("speakers-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "speakers",
          filter: "total_talks=neq.null",
        },
        () => {
          console.log(
            "Speaker statistics updated, refreshing speakers list..."
          );
          fetchSpeakers();
        }
      )
      .subscribe();

    // Add subscription for profile updates (including avatar changes)
    const profilesSubscription = supabase
      .channel("profiles-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        () => {
          console.log(
            "Profile updated (including avatar), refreshing speakers list..."
          );
          fetchSpeakers();
        }
      )
      .subscribe();

    // Listen for custom avatar update events
    const handleAvatarUpdate = () => {
      console.log("Avatar updated event received, refreshing speakers list...");
      fetchSpeakers();
    };

    window.addEventListener("avatarUpdated", handleAvatarUpdate);

    return () => {
      speakersSubscription.unsubscribe();
      profilesSubscription.unsubscribe();
      window.removeEventListener("avatarUpdated", handleAvatarUpdate);
    };
  }, []);

  const fetchSpeakers = async () => {
    try {
      const { data, error } = await supabase
        .from("speakers")
        .select(
          `
          *,
          profile:profiles!profile_id(full_name, bio, location, avatar_url),
          topics:speaker_topics(topic:topics(name))
        `
        )
        .order("average_rating", { ascending: false });

      if (error) throw error;

      setSpeakers(data || []);
    } catch (error) {
      toast({
        title: "Error loading speakers",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSpeakers = speakers.filter((speaker) => {
    const matchesSearch =
      speaker.profile?.full_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      speaker.profile?.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      speaker.topics.some((t) =>
        t.topic.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesLevel =
      filterLevel === "all" || speaker.experience_level === filterLevel;
    const matchesAvailable =
      filterAvailable === "all" ||
      (filterAvailable === "available" && speaker.available) ||
      (filterAvailable === "unavailable" && !speaker.available);

    return matchesSearch && matchesLevel && matchesAvailable;
  });

  const formatRate = (rate?: number) => {
    if (!rate) return "Rate not specified";
    return `$${rate / 100}/hour`;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < Math.floor(rating)
            ? "text-yellow-400 fill-current"
            : "text-gray-300"
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading speakers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Expert Speakers</h1>
          <p className="text-muted-foreground">
            Discover talented speakers for your next event
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search speakers or topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Experience Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAvailable} onValueChange={setFilterAvailable}>
            <SelectTrigger>
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Speakers</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Not Available</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground flex items-center">
            {filteredSpeakers.length} speakers found
          </div>
        </div>

        {/* Speakers Grid */}
        {filteredSpeakers.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No speakers found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria to find more speakers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpeakers.map((speaker) => (
              <Card key={speaker.id} className="h-full flex flex-col">
                <Link to={`/speakers/${speaker.id}`} className="flex-1">
                  <CardHeader className="hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-4">
                      <Avatar
                        key={speaker.profile?.avatar_url || speaker.id}
                        className="h-16 w-16"
                      >
                        <AvatarImage
                          src={getAvatarUrl(
                            speaker.profile?.avatar_url,
                            speaker.id
                          )}
                          alt={speaker.profile?.full_name}
                        />
                        <AvatarFallback className="text-lg">
                          {speaker.profile?.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <CardTitle className="truncate">
                            {speaker.profile?.full_name}
                          </CardTitle>
                          {speaker.verified && (
                            <Verified className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge
                            variant={
                              speaker.available ? "default" : "secondary"
                            }
                          >
                            {speaker.available ? "Available" : "Busy"}
                          </Badge>
                          <Badge variant="outline">
                            {speaker.experience_level}
                          </Badge>
                        </div>
                        {speaker.profile?.location && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-1 h-3 w-3" />
                            {speaker.profile.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col justify-between hover:bg-gray-50 transition-colors">
                    <div className="space-y-4 mb-4">
                      {speaker.profile?.bio && (
                        <CardDescription className="line-clamp-3">
                          {speaker.profile.bio}
                        </CardDescription>
                      )}

                      {/* Rating and Stats */}
                      <div className="space-y-2">
                        {speaker.average_rating > 0 && (
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              {renderStars(speaker.average_rating)}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {speaker.average_rating.toFixed(1)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Award className="mr-1 h-3 w-3" />
                            {speaker.total_talks} talks
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="mr-1 h-3 w-3" />
                            {formatRate(speaker.hourly_rate)}
                          </div>
                        </div>
                      </div>

                      {/* Topics */}
                      {speaker.topics.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Expertise:</p>
                          <div className="flex flex-wrap gap-1">
                            {speaker.topics.slice(0, 4).map((topic, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {topic.topic.name}
                              </Badge>
                            ))}
                            {speaker.topics.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{speaker.topics.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Link>

                {/* Action button outside the link to prevent nested interactive elements */}
                <CardContent className="pt-0">
                  <div className="pt-4 border-t">
                    <Button
                      className="w-full"
                      disabled={!speaker.available}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Navigate to contact/booking page or open contact modal
                        window.location.href = `/speakers/${speaker.id}`;
                      }}
                    >
                      {speaker.available
                        ? "Contact Speaker"
                        : "Currently Unavailable"}
                    </Button>
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

export default Speakers;
