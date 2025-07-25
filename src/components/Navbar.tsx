import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import {
  UserCircle,
  LogOut,
  Settings,
  Calendar,
  Mic2,
  Mail,
} from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar-utils";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<{
    user_type: string;
    avatar_url?: string;
    full_name?: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();

      // Subscribe to profile updates for real-time avatar changes
      const profileSubscription = supabase
        .channel("profile_changes")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            console.log("Profile updated, refreshing navbar...");
            fetchUserProfile();
          }
        )
        .subscribe();

      // Listen for custom avatar update events
      const handleAvatarUpdate = () => {
        console.log("Avatar updated event received, refreshing navbar...");
        fetchUserProfile();
      };

      window.addEventListener("avatarUpdated", handleAvatarUpdate);

      return () => {
        profileSubscription.unsubscribe();
        window.removeEventListener("avatarUpdated", handleAvatarUpdate);
      };
    } else {
      setUserProfile(null);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_type, avatar_url, full_name")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const canManageEvents =
    userProfile?.user_type === "organizer" || userProfile?.user_type === "both";

  const canViewInvitations =
    userProfile?.user_type === "speaker" || userProfile?.user_type === "both";

  const canViewSpeakerEvents =
    userProfile?.user_type === "speaker" || userProfile?.user_type === "both";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Mic2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">SpeakBridge</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/events">
                  <Button variant="ghost" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Events
                  </Button>
                </Link>
                <Link to="/speakers">
                  <Button variant="ghost" size="sm">
                    <Mic2 className="h-4 w-4 mr-2" />
                    Speakers
                  </Button>
                </Link>
                {canViewInvitations && (
                  <Link to="/invitations">
                    <Button variant="ghost" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Invitations
                    </Button>
                  </Link>
                )}
                {canViewSpeakerEvents && (
                  <Link to="/speaker-events">
                    <Button variant="ghost" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      My Applications
                    </Button>
                  </Link>
                )}
                {canManageEvents && (
                  <Link to="/my-events">
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      My Events
                    </Button>
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar
                        key={userProfile?.avatar_url || user.id}
                        className="h-8 w-8"
                      >
                        <AvatarImage
                          src={getAvatarUrl(userProfile?.avatar_url, user.id)}
                          alt={userProfile?.full_name || user.email}
                        />
                        <AvatarFallback>
                          {userProfile?.full_name?.charAt(0).toUpperCase() ||
                            user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <UserCircle className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth">
                <Button>Get Started</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
