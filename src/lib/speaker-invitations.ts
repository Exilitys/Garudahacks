import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type SpeakerInvitation = Tables<"speaker_invitations">;
export type SpeakerInvitationInsert = TablesInsert<"speaker_invitations">;
export type InvitationDetails = Tables<"invitation_details">;

export interface InvitationStats {
  total_invitations: number;
  pending_invitations: number;
  accepted_invitations: number;
  declined_invitations: number;
  expired_invitations: number;
}

/**
 * Check if speaker invitations table exists
 */
export async function checkInvitationTableExists() {
  try {
    const { data, error } = await supabase
      .from("speaker_invitations")
      .select("id")
      .limit(1);

    console.log("Table check result:", { data, error });
    return !error;
  } catch (error) {
    console.error("Table does not exist:", error);
    return false;
  }
}

/**
 * Get current user's profile ID (for debugging)
 */
export async function getCurrentUserProfile() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No user logged in" };

    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name")
      .eq("user_id", user.id)
      .single();

    console.log("Current user profile:", { user: user.id, profile: data });
    return { data, error };
  } catch (error) {
    console.error("Error getting current user profile:", error);
    return { data: null, error };
  }
}

/**
 * Create a new speaker invitation
 */
export async function createSpeakerInvitation(
  invitation: SpeakerInvitationInsert
) {
  try {
    console.log("Creating invitation with data:", invitation);

    // First, just insert the invitation without complex joins
    const { data, error } = await supabase
      .from("speaker_invitations")
      .insert(invitation)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    console.log("Invitation created successfully:", data);
    return { data, error: null };
  } catch (error) {
    console.error("Error creating speaker invitation:", error);
    return { data: null, error };
  }
}

/**
 * Get invitations sent by an organizer
 */
export async function getOrganizerInvitations(organizerId: string) {
  try {
    console.log("Fetching invitations for organizer:", organizerId);

    // Query the base table directly instead of the view
    const { data, error } = await supabase
      .from("speaker_invitations")
      .select(
        `
        *,
        event:events(
          title,
          description,
          date_time,
          location,
          event_type,
          format
        ),
        speaker:speakers(
          id,
          experience_level,
          hourly_rate,
          profile:profiles(
            full_name,
            email,
            avatar_url,
            bio
          )
        )
      `
      )
      .eq("organizer_id", organizerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching organizer invitations:", error);
      throw error;
    }

    console.log("Found organizer invitations:", data);

    // Transform the data to match the expected format
    const transformedData = data?.map((invitation) => ({
      id: invitation.id,
      event_id: invitation.event_id,
      organizer_id: invitation.organizer_id,
      speaker_id: invitation.speaker_id,
      message: invitation.message,
      proposed_rate: invitation.proposed_rate,
      status: invitation.status,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at,
      updated_at: invitation.updated_at,
      event_title: invitation.event?.title,
      event_description: invitation.event?.description,
      event_date: invitation.event?.date_time,
      event_location: invitation.event?.location,
      event_type: invitation.event?.event_type,
      event_format: invitation.event?.format,
      speaker_name: invitation.speaker?.profile?.full_name,
      speaker_email: invitation.speaker?.profile?.email,
      speaker_avatar: invitation.speaker?.profile?.avatar_url,
      speaker_bio: invitation.speaker?.profile?.bio,
      speaker_experience: invitation.speaker?.experience_level,
      speaker_hourly_rate: invitation.speaker?.hourly_rate,
    }));

    return { data: transformedData, error: null };
  } catch (error) {
    console.error("Error fetching organizer invitations:", error);
    return { data: null, error };
  }
}

/**
 * Get invitations received by a speaker
 */
export async function getSpeakerInvitations(speakerId: string) {
  try {
    console.log("Fetching invitations for speaker:", speakerId);

    // Query the base table directly instead of the view
    const { data, error } = await supabase
      .from("speaker_invitations")
      .select(
        `
        *,
        event:events(
          title,
          description,
          date_time,
          location,
          event_type,
          format
        ),
        organizer:profiles!organizer_id(
          full_name,
          email,
          avatar_url
        )
      `
      )
      .eq("speaker_id", speakerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching speaker invitations:", error);
      throw error;
    }

    console.log("Found invitations:", data);

    // Transform the data to match the expected format
    const transformedData = data?.map((invitation) => ({
      id: invitation.id,
      event_id: invitation.event_id,
      organizer_id: invitation.organizer_id,
      speaker_id: invitation.speaker_id,
      message: invitation.message,
      proposed_rate: invitation.proposed_rate,
      status: invitation.status,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at,
      updated_at: invitation.updated_at,
      event_title: invitation.event?.title,
      event_description: invitation.event?.description,
      event_date: invitation.event?.date_time,
      event_location: invitation.event?.location,
      event_type: invitation.event?.event_type,
      event_format: invitation.event?.format,
      organizer_name: invitation.organizer?.full_name,
      organizer_email: invitation.organizer?.email,
      organizer_avatar: invitation.organizer?.avatar_url,
    }));

    return { data: transformedData, error: null };
  } catch (error) {
    console.error("Error fetching speaker invitations:", error);
    return { data: null, error };
  }
}

/**
 * Update invitation status (accept, decline, etc.)
 */
export async function updateInvitationStatus(
  invitationId: string,
  status: "accepted" | "declined" | "expired",
  notes?: string
) {
  try {
    const { data, error } = await supabase
      .from("speaker_invitations")
      .update({ status })
      .eq("id", invitationId)
      .select("*")
      .single();

    if (error) throw error;

    // If invitation is accepted, create a booking only if one doesn't exist
    if (status === "accepted" && data) {
      // First check if a booking already exists for this event-speaker combination
      const { data: existingBooking, error: bookingCheckError } = await supabase
        .from("bookings")
        .select("id")
        .eq("event_id", data.event_id)
        .eq("speaker_id", data.speaker_id)
        .single();

      // Only create a booking if one doesn't already exist
      if (bookingCheckError && bookingCheckError.code === "PGRST116") {
        // No existing booking found, create a new one
        const bookingData = {
          event_id: data.event_id,
          speaker_id: data.speaker_id,
          organizer_id: data.organizer_id,
          status: "accepted" as const,
          agreed_rate: data.proposed_rate,
          message: data.message,
        };

        const { error: bookingError } = await supabase
          .from("bookings")
          .insert(bookingData);

        if (bookingError) {
          console.error("Error creating booking:", bookingError);
          // Revert invitation status
          await supabase
            .from("speaker_invitations")
            .update({ status: "pending" })
            .eq("id", invitationId);
          throw bookingError;
        }
      } else if (existingBooking) {
        // Booking already exists, just update its status if needed
        console.log(
          "Booking already exists for this event-speaker combination:",
          existingBooking.id
        );

        // Optionally update the existing booking status
        const { error: updateBookingError } = await supabase
          .from("bookings")
          .update({
            status: "accepted",
            agreed_rate: data.proposed_rate,
            message: data.message,
          })
          .eq("id", existingBooking.id);

        if (updateBookingError) {
          console.error("Error updating existing booking:", updateBookingError);
          // Don't throw error here, as the invitation was still accepted
        }
      } else if (bookingCheckError) {
        // Some other error occurred while checking for existing booking
        console.error(
          "Error checking for existing booking:",
          bookingCheckError
        );
        // Don't throw error here, as the invitation was still accepted
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error("Error updating invitation status:", error);
    return { data: null, error };
  }
}

/**
 * Get invitation statistics for an event
 */
export async function getEventInvitationStats(eventId: string): Promise<{
  data: InvitationStats | null;
  error: any;
}> {
  try {
    const { data, error } = await supabase.rpc("get_invitation_stats", {
      event_uuid: eventId,
    });

    if (error) throw error;
    return { data: data?.[0] || null, error: null };
  } catch (error) {
    console.error("Error fetching invitation stats:", error);
    return { data: null, error };
  }
}

/**
 * Check if a speaker has already been invited to an event
 */
export async function checkExistingInvitation(
  eventId: string,
  speakerId: string
) {
  try {
    const { data, error } = await supabase
      .from("speaker_invitations")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("speaker_id", speakerId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error checking existing invitation:", error);
    return { data: null, error };
  }
}

/**
 * Expire old pending invitations
 */
export async function expireOldInvitations() {
  try {
    const { data, error } = await supabase.rpc("expire_old_invitations");
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error expiring old invitations:", error);
    return { data: null, error };
  }
}

/**
 * Get invitation details by ID
 */
export async function getInvitationDetails(invitationId: string) {
  try {
    const { data, error } = await supabase
      .from("invitation_details")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching invitation details:", error);
    return { data: null, error };
  }
}

/**
 * Search speakers for invitation
 */
export async function searchSpeakersForInvitation(
  searchTerm: string,
  experienceLevel?: string,
  limit: number = 10
) {
  try {
    let query = supabase
      .from("speakers")
      .select(
        `
        id,
        experience_level,
        hourly_rate,
        average_rating,
        available,
        profile:profiles(
          full_name,
          email,
          bio,
          location,
          avatar_url
        )
      `
      )
      .eq("available", true);

    if (experienceLevel) {
      query = query.eq("experience_level", experienceLevel);
    }

    if (searchTerm) {
      query = query.or(
        `profile.full_name.ilike.%${searchTerm}%,profile.bio.ilike.%${searchTerm}%`
      );
    }

    const { data, error } = await query.limit(limit);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error searching speakers:", error);
    return { data: null, error };
  }
}

/**
 * Get invitation history for an invitation
 */
export async function getInvitationHistory(invitationId: string) {
  try {
    const { data, error } = await supabase
      .from("speaker_invitation_history")
      .select(
        `
        *,
        changed_by_profile:profiles(full_name)
      `
      )
      .eq("invitation_id", invitationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching invitation history:", error);
    return { data: null, error };
  }
}
