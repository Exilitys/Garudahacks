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
import { useAuth } from "@/contexts/AuthContext";
import {
  MapPin,
  Star,
  DollarSign,
  Search,
  Verified,
  Award,
  ExternalLink,
} from "lucide-react";

interface Speaker {
  id: string;
  experience_level: string;
  hourly_rate?: number;
  available: boolean;
  verified: boolean;
  total_talks: number;
  average_rating: number;
  occupation?: string;
  company?: string;
  primary_topic?: string;
  portfolio_url?: string;
  secondary_location?: string;
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
  const [userProfile, setUserProfile] = useState<{ user_type: string } | null>(
    null
  );
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchSpeakers();
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

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

  const filteredSpeakers = speakers.filter((speaker) => {
    const matchesSearch =
      speaker.profile?.full_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      speaker.profile?.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      speaker.occupation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      speaker.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      speaker.primary_topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const canContactSpeakers =
    userProfile?.user_type === "organizer" || userProfile?.user_type === "both";

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
              <Card
                key={speaker.id}
                className="h-full flex flex-col hover:shadow-lg transition-shadow"
              >
                <Link
                  to={`/speakers/${speaker.id}`}
                  className="flex-1 flex flex-col"
                >
                  <CardHeader>
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={speaker.profile?.avatar_url} />
                        <AvatarFallback className="text-lg">
                          {speaker.profile?.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <CardTitle className="truncate hover:text-primary transition-colors">
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
                        {(speaker.occupation || speaker.company) && (
                          <div className="text-sm text-muted-foreground">
                            {speaker.occupation && speaker.company
                              ? `${speaker.occupation} at ${speaker.company}`
                              : speaker.occupation || speaker.company}
                          </div>
                        )}
                        {speaker.profile?.location && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-1 h-3 w-3" />
                            {speaker.profile.location}
                            {speaker.secondary_location &&
                              ` • ${speaker.secondary_location}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col justify-between">
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
                      {(speaker.primary_topic || speaker.topics.length > 0) && (
                        <div>
                          <p className="text-sm font-medium mb-2">Expertise:</p>
                          <div className="flex flex-wrap gap-1">
                            {speaker.primary_topic && (
                              <Badge variant="default" className="text-xs">
                                {speaker.primary_topic} (Primary)
                              </Badge>
                            )}
                            {speaker.topics
                              .slice(0, speaker.primary_topic ? 3 : 4)
                              .map((topic, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {topic.topic.name}
                                </Badge>
                              ))}
                            {speaker.topics.length >
                              (speaker.primary_topic ? 3 : 4) && (
                              <Badge variant="outline" className="text-xs">
                                +
                                {speaker.topics.length -
                                  (speaker.primary_topic ? 3 : 4)}{" "}
                                more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Link>

                {/* Action buttons outside the link to prevent nested links */}
                <CardContent className="pt-0">
                  <div className="pt-4 border-t space-y-2">
                    {speaker.portfolio_url && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(speaker.portfolio_url, "_blank");
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Portfolio
                      </Button>
                    )}
                    {user && canContactSpeakers ? (
                      <Button
                        className="w-full"
                        disabled={!speaker.available}
                        onClick={(e) => {
                          e.stopPropagation();
                          // This would eventually open a contact modal or redirect to contact form
                          window.location.href = `/speakers/${speaker.id}`;
                        }}
                      >
                        {speaker.available
                          ? "Contact Speaker"
                          : "Currently Unavailable"}
                      </Button>
                    ) : !user ? (
                      <Button
                        className="w-full"
                        disabled
                        onClick={(e) => e.stopPropagation()}
                      >
                        Sign in to contact speakers
                      </Button>
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

export default Speakers;
