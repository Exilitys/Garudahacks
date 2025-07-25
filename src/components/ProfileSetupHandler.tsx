import React, { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PendingSpeakerData {
  userType: "speaker" | "organizer" | "both";
  speakerForm?: {
    bio: string;
    location: string;
    occupation: string;
    company: string;
    primaryTopic: string;
    portfolioUrl: string;
    secondaryLocation: "remote" | "on-site" | "both";
    experienceLevel: "beginner" | "intermediate" | "expert";
    hourlyRate: string;
  };
}

const ProfileSetupHandler: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const completePendingSetup = async () => {
      if (!user) return;

      const pendingSpeakerData = localStorage.getItem("pendingSpeakerData");
      const pendingUserData = localStorage.getItem("pendingUserData");

      if (pendingSpeakerData) {
        try {
          const data: PendingSpeakerData = JSON.parse(pendingSpeakerData);

          // Update the profile with user type and speaker info
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              user_type: data.userType,
              bio: data.speakerForm?.bio || null,
              location: data.speakerForm?.location || null,
            })
            .eq("user_id", user.id);

          if (profileError) throw profileError;

          // Create speaker profile
          if (
            (data.userType === "speaker" || data.userType === "both") &&
            data.speakerForm
          ) {
            const profileResult = await supabase
              .from("profiles")
              .select("id")
              .eq("user_id", user.id)
              .single();

            if (profileResult.data) {
              const { error: speakerError } = await supabase
                .from("speakers")
                .insert({
                  profile_id: profileResult.data.id,
                  experience_level: data.speakerForm.experienceLevel,
                  hourly_rate: data.speakerForm.hourlyRate
                    ? parseInt(data.speakerForm.hourlyRate)
                    : null,
                  occupation: data.speakerForm.occupation || null,
                  company: data.speakerForm.company || null,
                  primary_topic: data.speakerForm.primaryTopic || null,
                  portfolio_url: data.speakerForm.portfolioUrl || null,
                  secondary_location:
                    data.speakerForm.secondaryLocation || null,
                  available: true,
                  verified: false,
                });

              if (speakerError) throw speakerError;
            }
          }

          localStorage.removeItem("pendingSpeakerData");

          toast({
            title: "Speaker Profile Created!",
            description: "Your speaker profile has been successfully set up.",
          });
        } catch (error: any) {
          console.error("Error setting up speaker profile:", error);
          toast({
            title: "Profile Setup Error",
            description:
              "There was an issue setting up your profile. Please contact support.",
            variant: "destructive",
          });
        }
      } else if (pendingUserData) {
        try {
          const data: PendingSpeakerData = JSON.parse(pendingUserData);

          // Update the profile with user type
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ user_type: data.userType })
            .eq("user_id", user.id);

          if (profileError) throw profileError;

          localStorage.removeItem("pendingUserData");

          toast({
            title: "Profile Updated!",
            description: "Your account has been successfully set up.",
          });
        } catch (error: any) {
          console.error("Error updating profile:", error);
          toast({
            title: "Profile Setup Error",
            description:
              "There was an issue setting up your profile. Please contact support.",
            variant: "destructive",
          });
        }
      }
    };

    completePendingSetup();
  }, [user, toast]);

  return null; // This component doesn't render anything
};

export default ProfileSetupHandler;
