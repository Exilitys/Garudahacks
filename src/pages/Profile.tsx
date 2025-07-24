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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  MapPin,
  Globe,
  Briefcase,
  Star,
  Award,
  Calendar,
  Settings,
  Save,
  Loader2,
  Edit,
  CheckCircle,
  Camera,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  user_type: string;
  created_at: string;
  updated_at?: string;
}

interface SpeakerProfile {
  id: string;
  profile_id: string;
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
  created_at?: string;
  updated_at?: string;
}

interface Topic {
  id: string;
  name: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [speakerProfile, setSpeakerProfile] = useState<SpeakerProfile | null>(
    null
  );
  const [topics, setTopics] = useState<Topic[]>([]);
  const [speakerTopics, setSpeakerTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchTopics();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // If user is a speaker or both, fetch speaker profile
      if (
        profileData.user_type === "speaker" ||
        profileData.user_type === "both"
      ) {
        const { data: speakerData, error: speakerError } = await supabase
          .from("speakers")
          .select("*")
          .eq("profile_id", profileData.id)
          .single();

        if (speakerError && speakerError.code !== "PGRST116") {
          throw speakerError;
        }

        if (speakerData) {
          setSpeakerProfile(speakerData);

          // Fetch speaker topics
          const { data: topicData, error: topicError } = await supabase
            .from("speaker_topics")
            .select("topic:topics(name)")
            .eq("speaker_id", speakerData.id);

          if (topicError) throw topicError;
          setSpeakerTopics(topicData.map((t: any) => t.topic.name));
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error loading profile",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .order("name");

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error("Error fetching topics:", error);
    }
  };

  const handleProfileUpdate = async (updatedProfile: Partial<UserProfile>) => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updatedProfile)
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({ ...profile, ...updatedProfile });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error updating profile",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSpeakerProfileUpdate = async (
    updatedSpeaker: Partial<SpeakerProfile>
  ) => {
    if (!speakerProfile || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("speakers")
        .update(updatedSpeaker)
        .eq("id", speakerProfile.id);

      if (error) throw error;

      setSpeakerProfile({ ...speakerProfile, ...updatedSpeaker });
      toast({
        title: "Speaker profile updated",
        description: "Your speaker profile has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating speaker profile:", error);
      toast({
        title: "Error updating speaker profile",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTopicToggle = async (topicName: string) => {
    if (!speakerProfile) return;

    const isSelected = speakerTopics.includes(topicName);
    const topic = topics.find((t) => t.name === topicName);
    if (!topic) return;

    try {
      if (isSelected) {
        // Remove topic
        const { error } = await supabase
          .from("speaker_topics")
          .delete()
          .eq("speaker_id", speakerProfile.id)
          .eq("topic_id", topic.id);

        if (error) throw error;
        setSpeakerTopics((prev) => prev.filter((t) => t !== topicName));
      } else {
        // Add topic
        const { error } = await supabase.from("speaker_topics").insert({
          speaker_id: speakerProfile.id,
          topic_id: topic.id,
        });

        if (error) throw error;
        setSpeakerTopics((prev) => [...prev, topicName]);
      }

      toast({
        title: "Topics updated",
        description: "Your expertise topics have been updated.",
      });
    } catch (error) {
      console.error("Error updating topics:", error);
      toast({
        title: "Error updating topics",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const formatRate = (rate?: number) => {
    if (!rate) return "Not specified";
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
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Profile not found</h3>
          <p className="text-muted-foreground">
            Unable to load your profile information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {profile.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {editMode && (
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => {
                    toast({
                      title: "Avatar Upload",
                      description: "Avatar upload functionality coming soon!",
                    });
                  }}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{profile.full_name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">{profile.user_type}</Badge>
                {profile.user_type === "speaker" &&
                  speakerProfile?.verified && (
                    <Badge variant="default" className="bg-blue-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
              </div>
              {profile.location && (
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <MapPin className="mr-1 h-3 w-3" />
                  {profile.location}
                </div>
              )}
            </div>
          </div>
          <Button
            onClick={() => setEditMode(!editMode)}
            variant={editMode ? "outline" : "default"}
          >
            <Edit className="mr-2 h-4 w-4" />
            {editMode ? "Cancel" : "Edit Profile"}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            {(profile.user_type === "speaker" ||
              profile.user_type === "both") && (
              <TabsTrigger value="speaker">Speaker Profile</TabsTrigger>
            )}
            <TabsTrigger value="account">Account Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Your basic profile information visible to others
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) =>
                        editMode &&
                        setProfile({ ...profile, full_name: e.target.value })
                      }
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio || ""}
                    onChange={(e) =>
                      editMode &&
                      setProfile({ ...profile, bio: e.target.value })
                    }
                    disabled={!editMode}
                    placeholder="Tell others about yourself..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profile.location || ""}
                      onChange={(e) =>
                        editMode &&
                        setProfile({ ...profile, location: e.target.value })
                      }
                      disabled={!editMode}
                      placeholder="e.g., San Francisco, CA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={profile.website || ""}
                      onChange={(e) =>
                        editMode &&
                        setProfile({ ...profile, website: e.target.value })
                      }
                      disabled={!editMode}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>

                {editMode && (
                  <div className="flex space-x-3 pt-4">
                    <Button
                      onClick={() => handleProfileUpdate(profile)}
                      disabled={saving}
                    >
                      {saving && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {(profile.user_type === "speaker" ||
            profile.user_type === "both") && (
            <TabsContent value="speaker" className="space-y-6">
              {speakerProfile ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Speaker Statistics</CardTitle>
                      <CardDescription>
                        Your speaking performance and ratings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {speakerProfile.total_talks}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total Talks
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            {renderStars(speakerProfile.average_rating)}
                          </div>
                          <div className="text-lg font-semibold">
                            {speakerProfile.average_rating.toFixed(1)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Average Rating
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {formatRate(speakerProfile.hourly_rate)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Hourly Rate
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Professional Information</CardTitle>
                      <CardDescription>
                        Your professional background and expertise
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="occupation">Occupation</Label>
                          <Input
                            id="occupation"
                            value={speakerProfile.occupation || ""}
                            onChange={(e) =>
                              editMode &&
                              setSpeakerProfile({
                                ...speakerProfile,
                                occupation: e.target.value,
                              })
                            }
                            disabled={!editMode}
                            placeholder="e.g., Senior Software Engineer"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            value={speakerProfile.company || ""}
                            onChange={(e) =>
                              editMode &&
                              setSpeakerProfile({
                                ...speakerProfile,
                                company: e.target.value,
                              })
                            }
                            disabled={!editMode}
                            placeholder="e.g., Google"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="experience_level">
                            Experience Level
                          </Label>
                          <Select
                            value={speakerProfile.experience_level}
                            onValueChange={(value: any) =>
                              editMode &&
                              setSpeakerProfile({
                                ...speakerProfile,
                                experience_level: value,
                              })
                            }
                            disabled={!editMode}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">
                                Intermediate
                              </SelectItem>
                              <SelectItem value="expert">Expert</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hourly_rate">Hourly Rate (USD)</Label>
                          <Input
                            id="hourly_rate"
                            type="number"
                            value={
                              speakerProfile.hourly_rate
                                ? speakerProfile.hourly_rate / 100
                                : ""
                            }
                            onChange={(e) =>
                              editMode &&
                              setSpeakerProfile({
                                ...speakerProfile,
                                hourly_rate: e.target.value
                                  ? parseInt(e.target.value) * 100
                                  : undefined,
                              })
                            }
                            disabled={!editMode}
                            placeholder="e.g., 500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="primary_topic">Primary Topic</Label>
                          <Input
                            id="primary_topic"
                            value={speakerProfile.primary_topic || ""}
                            onChange={(e) =>
                              editMode &&
                              setSpeakerProfile({
                                ...speakerProfile,
                                primary_topic: e.target.value,
                              })
                            }
                            disabled={!editMode}
                            placeholder="e.g., AI & Machine Learning"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="portfolio_url">Portfolio URL</Label>
                          <Input
                            id="portfolio_url"
                            value={speakerProfile.portfolio_url || ""}
                            onChange={(e) =>
                              editMode &&
                              setSpeakerProfile({
                                ...speakerProfile,
                                portfolio_url: e.target.value,
                              })
                            }
                            disabled={!editMode}
                            placeholder="https://yourportfolio.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Speaking Preference</Label>
                        <Select
                          value={speakerProfile.secondary_location || ""}
                          onValueChange={(value) =>
                            editMode &&
                            setSpeakerProfile({
                              ...speakerProfile,
                              secondary_location: value,
                            })
                          }
                          disabled={!editMode}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select speaking preference" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="remote">Remote Only</SelectItem>
                            <SelectItem value="on-site">
                              On-site Only
                            </SelectItem>
                            <SelectItem value="both">
                              Both Remote & On-site
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="available"
                          checked={speakerProfile.available}
                          onCheckedChange={(checked) =>
                            editMode &&
                            setSpeakerProfile({
                              ...speakerProfile,
                              available: checked,
                            })
                          }
                          disabled={!editMode}
                        />
                        <Label htmlFor="available">
                          Available for speaking opportunities
                        </Label>
                      </div>

                      {editMode && (
                        <div className="flex space-x-3 pt-4">
                          <Button
                            onClick={() =>
                              handleSpeakerProfileUpdate(speakerProfile)
                            }
                            disabled={saving}
                          >
                            {saving && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            <Save className="mr-2 h-4 w-4" />
                            Save Speaker Profile
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Expertise Topics</CardTitle>
                      <CardDescription>
                        Select topics you can speak about
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {topics.map((topic) => (
                          <label
                            key={topic.id}
                            className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                              speakerTopics.includes(topic.name)
                                ? "bg-primary/10 border-primary"
                                : "bg-background border-border hover:bg-muted"
                            } ${!editMode ? "cursor-default" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={speakerTopics.includes(topic.name)}
                              onChange={() =>
                                editMode && handleTopicToggle(topic.name)
                              }
                              disabled={!editMode}
                              className="rounded"
                            />
                            <span className="text-sm">{topic.name}</span>
                          </label>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">
                      Speaker profile not found. Please contact support if you
                      believe this is an error.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Your account details and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>User Type</Label>
                    <div className="p-2 bg-muted rounded-md">
                      <Badge variant="outline" className="capitalize">
                        {profile.user_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <div className="p-2 bg-muted rounded-md text-sm">
                      {new Date(profile.created_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="p-2 bg-muted rounded-md text-sm">
                    {profile.email}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email address
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
