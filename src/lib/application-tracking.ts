import { supabase } from "@/integrations/supabase/client";

// Application status types
export type ApplicationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";
export type ApplicationPriority = "low" | "medium" | "high";
export type NotificationType =
  | "submitted"
  | "reviewed"
  | "accepted"
  | "rejected"
  | "reminder"
  | "deadline";

// Enhanced application interface
export interface EnhancedApplication {
  id: string;
  event_id: string;
  speaker_id: string;
  organizer_id: string;
  status: ApplicationStatus;
  status_reason?: string;
  agreed_rate?: number;
  message?: string;
  application_priority: ApplicationPriority;
  notification_sent: boolean;
  reminder_sent: boolean;
  responded_at?: string;
  reviewer_notes?: string;
  created_at: string;
  updated_at: string;
}

// Application status history interface
export interface ApplicationStatusHistory {
  id: string;
  booking_id: string;
  previous_status?: string;
  new_status: string;
  changed_by: string;
  reason?: string;
  notes?: string;
  created_at: string;
}

// Application notification interface
export interface ApplicationNotification {
  id: string;
  booking_id: string;
  notification_type: NotificationType;
  recipient_id: string;
  sent_at: string;
  read_at?: string;
  message?: string;
  metadata?: Record<string, any>;
}

// Application statistics interface
export interface ApplicationStats {
  total_applications: number;
  pending_applications: number;
  accepted_applications: number;
  rejected_applications: number;
  completed_applications: number;
  response_rate: number;
  avg_response_time_hours: number;
}

/**
 * Update application status with tracking
 */
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  statusReason?: string,
  reviewerNotes?: string
) {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .update({
        status: newStatus,
        status_reason: statusReason,
        reviewer_notes: reviewerNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error updating application status:", error);
    return { data: null, error };
  }
}

/**
 * Get application status history
 */
export async function getApplicationHistory(applicationId: string) {
  try {
    const { data, error } = await supabase
      .from("application_status_history")
      .select(
        `
        *,
        changed_by_profile:profiles!changed_by(full_name, avatar_url)
      `
      )
      .eq("booking_id", applicationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching application history:", error);
    return { data: null, error };
  }
}

/**
 * Get user application statistics
 */
export async function getUserApplicationStats(
  userId: string
): Promise<ApplicationStats | null> {
  try {
    const { data, error } = await supabase.rpc("get_application_stats", {
      user_id_param: userId,
    });

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error fetching application stats:", error);
    return null;
  }
}

/**
 * Create application notification
 */
export async function createApplicationNotification(
  bookingId: string,
  notificationType: NotificationType,
  recipientId: string,
  message?: string,
  metadata?: Record<string, any>
) {
  try {
    const { data, error } = await supabase
      .from("application_notifications")
      .insert({
        booking_id: bookingId,
        notification_type: notificationType,
        recipient_id: recipientId,
        message,
        metadata,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { data: null, error };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { data, error } = await supabase
      .from("application_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { data: null, error };
  }
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  unreadOnly: boolean = false
) {
  try {
    let query = supabase
      .from("application_notifications")
      .select(
        `
        *,
        booking:bookings!booking_id(
          id,
          event:events!event_id(title, date_time)
        )
      `
      )
      .eq("recipient_id", userId)
      .order("sent_at", { ascending: false });

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { data: null, error };
  }
}

/**
 * Update application priority
 */
export async function updateApplicationPriority(
  applicationId: string,
  priority: ApplicationPriority
) {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .update({ application_priority: priority })
      .eq("id", applicationId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error updating application priority:", error);
    return { data: null, error };
  }
}

/**
 * Get applications with enhanced data
 */
export async function getEnhancedApplications(filters?: {
  eventId?: string;
  speakerId?: string;
  organizerId?: string;
  status?: ApplicationStatus;
  priority?: ApplicationPriority;
}) {
  try {
    let query = supabase.from("bookings").select(`
        *,
        event:events!event_id(
          title,
          date_time,
          format,
          event_type
        ),
        speaker:speakers!speaker_id(
          experience_level,
          average_rating,
          profile:profiles!profile_id(full_name, avatar_url)
        ),
        organizer:profiles!organizer_id(full_name)
      `);

    if (filters?.eventId) query = query.eq("event_id", filters.eventId);
    if (filters?.speakerId) query = query.eq("speaker_id", filters.speakerId);
    if (filters?.organizerId)
      query = query.eq("organizer_id", filters.organizerId);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.priority)
      query = query.eq("application_priority", filters.priority);

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching enhanced applications:", error);
    return { data: null, error };
  }
}

/**
 * Get applications that need attention (pending for too long, etc.)
 */
export async function getApplicationsNeedingAttention(organizerId: string) {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        event:events!event_id(
          title,
          date_time,
          format,
          event_type
        ),
        speaker:speakers!speaker_id(
          experience_level,
          average_rating,
          profile:profiles!profile_id(full_name, avatar_url)
        )
      `
      )
      .eq("organizer_id", organizerId)
      .eq("status", "pending")
      .lt(
        "created_at",
        new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      ) // More than 48 hours ago
      .order("created_at", { ascending: true }); // Oldest first

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching applications needing attention:", error);
    return { data: null, error };
  }
}

export default {
  updateApplicationStatus,
  getApplicationHistory,
  getUserApplicationStats,
  createApplicationNotification,
  markNotificationAsRead,
  getUserNotifications,
  updateApplicationPriority,
  getEnhancedApplications,
  getApplicationsNeedingAttention,
};
