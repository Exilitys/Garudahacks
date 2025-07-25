import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Star,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  User,
  Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface BookingDetail {
  id: string;
  event_id: string;
  speaker_id: string;
  status: string;
  agreed_rate: number | null;
  organizer_rating: number | null;
  reviewer_notes: string | null;
  event: {
    title: string;
    date_time: string;
    duration_hours: number;
    location: string;
    description: string;
    organizer_id: string;
    organizer: {
      full_name: string;
    };
  };
  speaker: {
    id: string;
    profile_id: string;
    hourly_rate: number;
    profile: {
      full_name: string;
    };
  };
}

// Function to check if all paid bookings are completed and update event status
const checkAndUpdateEventStatus = async (eventId: string) => {
  try {
    // Get all bookings for this event that were originally paid (now either paid or completed)
    const { data: allEventBookings, error: allBookingsError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("event_id", eventId)
      .in("status", ["paid", "completed"]);

    if (allBookingsError) {
      console.error("Error fetching event bookings:", allBookingsError);
      return;
    }

    // If there are no paid/completed bookings, don't update event status
    if (!allEventBookings || allEventBookings.length === 0) {
      return;
    }

    // Count bookings by status
    const paidBookings = allEventBookings.filter(
      (booking) => booking.status === "paid"
    );
    const completedBookings = allEventBookings.filter(
      (booking) => booking.status === "completed"
    );

    console.log(
      `Event ${eventId}: ${paidBookings.length} paid, ${completedBookings.length} completed, ${allEventBookings.length} total`
    );

    // If all bookings that were paid are now completed, update event status to "finished"
    if (
      allEventBookings.length > 0 &&
      paidBookings.length === 0 &&
      completedBookings.length > 0
    ) {
      const { error: updateError } = await supabase
        .from("events")
        .update({
          status: "finished",
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (updateError) {
        console.error("Error updating event status:", updateError);
      } else {
        console.log(`Event ${eventId} status updated to 'finished'`);
      }
    }
  } catch (error) {
    console.error("Error in checkAndUpdateEventStatus:", error);
  }
};

export default function EventCompletion() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (bookingId && user) {
      fetchBookingDetails();
    }
  }, [bookingId, user]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);

      // Get user profile first
      const { data: userProfileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      setUserProfile(userProfileData);

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          event:events (
            title,
            date_time,
            duration_hours,
            location,
            description,
            organizer_id,
            organizer:profiles!events_organizer_id_fkey (full_name)
          ),
          speaker:speakers (
            id,
            profile_id,
            hourly_rate,
            profile:profiles!speakers_profile_id_fkey (full_name)
          )
        `
        )
        .eq("id", bookingId)
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Error",
          description: "Booking not found",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      console.log("🔍 Raw booking data from database:", data);
      console.log("🔍 Speaker data from booking:", data.speaker);
      console.log("🔍 Speaker ID from booking:", data.speaker_id);

      setBooking(data as unknown as BookingDetail);

      // Verify speaker ID consistency
      if (
        data.speaker &&
        data.speaker.id &&
        data.speaker_id !== data.speaker.id
      ) {
        console.warn("⚠️ Speaker ID mismatch detected!");
        console.warn(`Booking speaker_id: ${data.speaker_id}`);
        console.warn(`Speaker object id: ${data.speaker.id}`);
        console.warn("This might be the source of the update issue.");
      } else {
        console.log("✅ Speaker ID consistency check passed");
      }

      // Check user permissions
      setIsOrganizer(data.event?.organizer_id === userProfileData?.id);

      // Check if user is the speaker
      const speakerProfileId = (data.speaker as any)?.profile_id;
      setIsSpeaker(speakerProfileId === userProfileData?.id);
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async (userType: "organizer" | "speaker") => {
    if (!booking) return;

    try {
      setSubmitting(true);
      setLastError(null); // Clear previous errors

      // Check if event has passed (with some buffer time)
      const eventDate = new Date(booking.event.date_time);
      const now = new Date();
      if (eventDate.getTime() + 2 * 60 * 60 * 1000 > now.getTime()) {
        throw new Error("Event has not yet concluded");
      }

      // Check if booking is in paid status
      if (booking.status !== "paid") {
        throw new Error("Event must be in paid status before completion");
      }

      // First update speaker profile to ensure it succeeds before marking event as completed
      console.log(
        `🔄 About to update speaker profile. Booking speaker_id: ${booking.speaker_id}`
      );
      console.log(`🔄 Booking object:`, booking);
      console.log(`🔄 Booking speaker object:`, booking.speaker);

      // Let's also check what speaker IDs exist in the database
      const { data: allSpeakers, error: allSpeakersError } = await supabase
        .from("speakers")
        .select("id, profile_id")
        .limit(10);

      if (!allSpeakersError) {
        console.log(`🔍 Available speakers in database:`, allSpeakers);
      }

      // Use speaker.id if available and different from speaker_id
      const speakerIdToUse = booking.speaker?.id || booking.speaker_id;
      console.log(`🔄 Using speaker ID: ${speakerIdToUse}`);

      // Update speaker profile first - if this fails, don't mark event as completed
      await updateSpeakerProfileAfterCompletion(speakerIdToUse);

      // Only update booking status to completed if speaker profile update succeeded
      const { error: bookingUpdateError } = await supabase
        .from("bookings")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (bookingUpdateError) {
        console.error("❌ Error updating booking status:", bookingUpdateError);
        throw new Error("Failed to mark booking as completed");
      }

      // Check if all paid bookings for this event are now completed
      await checkAndUpdateEventStatus(booking.event_id);

      console.log(`✅ Event marked as completed. Speaker profile updated.`);

      // Clear any previous errors
      setLastError(null);

      toast({
        title: "Success",
        description: `Event marked as completed. Speaker profile updated.`,
      });

      fetchBookingDetails(); // Refresh data
    } catch (error: any) {
      console.error("Error marking completion:", error);

      // Provide specific error messages based on the error type
      let errorMessage = "Failed to mark event as completed";

      if (error.message?.includes("Speaker")) {
        errorMessage =
          "Failed to update speaker statistics. Event remains incomplete.";
      } else if (error.message?.includes("booking")) {
        errorMessage = "Failed to update event status. Please try again.";
      } else if (error.message?.includes("not yet concluded")) {
        errorMessage =
          "Event has not yet concluded. Please wait until after the event ends.";
      } else if (error.message?.includes("paid status")) {
        errorMessage = "Event must be in paid status before completion.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Store the error to display in UI
      setLastError(errorMessage);

      // Refresh booking details to ensure UI shows correct status
      await fetchBookingDetails();
    } finally {
      setSubmitting(false);
    }
  };

  // Function to update speaker profile after event completion
  const updateSpeakerProfileAfterCompletion = async (speakerId: string) => {
    try {
      console.log(
        `🔄 Updating speaker profile for ${speakerId} after event completion`
      );
      console.log(
        `🔄 Speaker ID type: ${typeof speakerId}, value: ${speakerId}`
      );

      // First verify the speaker exists
      const { data: speakerExists, error: existsError } = await supabase
        .from("speakers")
        .select("id, total_talks, total_events_completed, profile_id")
        .eq("id", speakerId)
        .single();

      if (existsError || !speakerExists) {
        console.error(
          "❌ Speaker not found or error checking existence:",
          existsError
        );
        console.error("❌ Speaker ID used:", speakerId);

        // Try to find speaker by profile_id if direct ID lookup fails
        console.log("🔍 Trying to find speaker by other methods...");

        // Get all speakers to see what's available
        const { data: allSpeakers, error: allError } = await supabase
          .from("speakers")
          .select("*");

        if (!allError) {
          console.log("🔍 All speakers in database:", allSpeakers);

          // Try to find speaker by profile_id if we have speaker data from booking
          if (booking.speaker && booking.speaker.profile_id) {
            const { data: speakerByProfile, error: profileError } =
              await supabase
                .from("speakers")
                .select("*")
                .eq("profile_id", booking.speaker.profile_id)
                .single();

            if (speakerByProfile && !profileError) {
              console.log("✅ Found speaker by profile_id:", speakerByProfile);
              // Update speakerId to use the correct one
              const correctSpeakerId = speakerByProfile.id;
              console.log(
                `🔄 Using correct speaker ID: ${correctSpeakerId} instead of ${speakerId}`
              );

              // Recursively call with correct ID
              return await updateSpeakerProfileAfterCompletion(
                correctSpeakerId
              );
            }
          }
        }

        console.error("❌ Cannot find speaker in database");
        throw new Error(`Speaker with ID ${speakerId} not found in database`);
      }

      console.log("✅ Speaker found:", speakerExists);

      // Get current speaker data
      const { data: currentSpeaker, error: speakerError } = await supabase
        .from("speakers")
        .select("*")
        .eq("id", speakerId)
        .single();

      if (speakerError) {
        console.error("❌ Error fetching current speaker data:", speakerError);
        throw new Error(
          `Failed to fetch speaker data: ${speakerError.message}`
        );
      }

      // Count total completed events for this speaker (including the current one being completed)
      const { count: totalCompletedEvents, error: countError } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("speaker_id", speakerId)
        .eq("status", "completed");

      if (countError) {
        console.error("❌ Error counting completed events:", countError);
        throw new Error(
          `Failed to count completed events: ${countError.message}`
        );
      }

      console.log(
        `📊 Speaker ${speakerId} current completed events: ${totalCompletedEvents}`
      );

      // Prepare update data
      const updateData: any = {
        total_events_completed: totalCompletedEvents || 0,
        total_talks: totalCompletedEvents || 0, // Keep total_talks in sync with total_events_completed
        updated_at: new Date().toISOString(),
      };

      console.log(`🔄 Updating speaker ${speakerId} with data:`, updateData);

      // Update the speaker profile
      console.log(
        `🔄 Attempting to update speaker profile for ID: ${speakerId}`
      );

      const { data: updateResult, error: updateError } = await supabase
        .from("speakers")
        .update(updateData)
        .eq("id", speakerId)
        .select("*"); // Return the updated data to verify the update

      if (updateError) {
        console.error("❌ Error updating speaker profile:", updateError);
        console.error("❌ Update data that failed:", updateData);
        console.error("❌ Speaker ID used:", speakerId);
        throw updateError;
      }

      if (!updateResult || updateResult.length === 0) {
        console.error("❌ No speaker found with ID:", speakerId);
        throw new Error(`Speaker with ID ${speakerId} not found`);
      }

      console.log("✅ Speaker profile update successful:", updateResult[0]);

      console.log(`✅ Speaker profile updated after completion:
        - Total events completed: ${totalCompletedEvents}
        - Total talks: ${totalCompletedEvents}`);
    } catch (error) {
      console.error("❌ Error in updateSpeakerProfileAfterCompletion:", error);
      throw error;
    }
  };

  const handleSubmitRating = async () => {
    if (!booking) return;

    try {
      setSubmitting(true);

      // Check if event is completed
      if (booking.status !== "completed") {
        throw new Error("Event must be completed before rating");
      }

      // Update the booking with rating and feedback
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          organizer_rating: rating, // Store the numeric rating
          reviewer_notes: `Rating: ${rating}/5 stars. Feedback: ${feedback}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (bookingError) throw bookingError;

      // Now update speaker profile with new rating and total events
      // Use speaker.id if available and different from speaker_id
      const speakerIdToUse = booking.speaker?.id || booking.speaker_id;
      console.log(`🔄 Using speaker ID for rating update: ${speakerIdToUse}`);

      await updateSpeakerProfileAfterRating(speakerIdToUse, rating);

      console.log(`✅ Rating submitted. Speaker profile updated.`);

      toast({
        title: "Success",
        description:
          "Speaker rating submitted successfully. Speaker profile updated.",
      });

      fetchBookingDetails(); // Refresh data
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Function to update speaker profile after rating submission
  const updateSpeakerProfileAfterRating = async (
    speakerId: string,
    newRating: number
  ) => {
    try {
      console.log(
        `🔄 Updating speaker profile for ${speakerId} with new rating: ${newRating}`
      );

      // Get current speaker data
      const { data: currentSpeaker, error: speakerError } = await supabase
        .from("speakers")
        .select("*")
        .eq("id", speakerId)
        .single();

      if (speakerError) {
        console.error("❌ Error fetching current speaker data:", speakerError);
        return;
      }

      // Get all completed bookings for this speaker
      const { count: totalCompletedEvents, error: countError } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("speaker_id", speakerId)
        .eq("status", "completed");

      if (countError) {
        console.error("❌ Error counting completed events:", countError);
        return;
      }

      // Get all ratings for this speaker from bookings
      const { data: allRatings, error: ratingsError } = await supabase
        .from("bookings")
        .select("organizer_rating")
        .eq("speaker_id", speakerId)
        .not("organizer_rating", "is", null);

      if (ratingsError) {
        console.error("❌ Error fetching ratings:", ratingsError);
        return;
      }

      // Extract ratings from organizer_rating column
      const ratings: number[] = [];
      allRatings?.forEach((booking: any) => {
        if (booking.organizer_rating) {
          ratings.push(booking.organizer_rating);
        }
      });

      // Calculate new average rating
      const totalRatings = ratings.length;
      const averageRating =
        totalRatings > 0
          ? Math.round(
              (ratings.reduce((sum, r) => sum + r, 0) / totalRatings) * 100
            ) / 100
          : 0;

      // Prepare update data
      const updateData: any = {
        total_talks: totalCompletedEvents || 0,
        total_events_completed: totalCompletedEvents || 0, // Keep in sync with total_talks
        average_rating: averageRating,
        updated_at: new Date().toISOString(),
      };

      console.log(
        `🔄 Updating speaker ${speakerId} rating with data:`,
        updateData
      );

      // Update the speaker profile
      const { data: updateResult, error: updateError } = await supabase
        .from("speakers")
        .update(updateData)
        .eq("id", speakerId)
        .select("*"); // Return the updated data to verify the update

      if (updateError) {
        console.error("❌ Error updating speaker profile:", updateError);
        console.error("❌ Update data that failed:", updateData);
        console.error("❌ Speaker ID used:", speakerId);
        throw updateError;
      }

      if (!updateResult || updateResult.length === 0) {
        console.error("❌ No speaker found with ID:", speakerId);
        throw new Error(`Speaker with ID ${speakerId} not found`);
      }

      console.log(
        "✅ Speaker profile rating update successful:",
        updateResult[0]
      );

      console.log(`✅ Speaker profile updated: 
        - Total events completed: ${totalCompletedEvents}
        - Total talks: ${totalCompletedEvents}
        - Average rating: ${averageRating} (from ${totalRatings} ratings)`);
    } catch (error) {
      console.error("❌ Error in updateSpeakerProfileAfterRating:", error);
      throw error;
    }
  };

  const isEventPassed = booking
    ? new Date(booking.event.date_time).getTime() + 2 * 60 * 60 * 1000 <
      Date.now()
    : false;
  const canMarkComplete = booking?.status === "paid" && isEventPassed;
  const canRate =
    isOrganizer &&
    booking?.status === "completed" &&
    !booking?.organizer_rating;
  const hasRating = booking?.organizer_rating !== null;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Booking Not Found
          </h1>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  const calculatedAmount =
    booking.agreed_rate !== null && booking.agreed_rate > 0
      ? booking.agreed_rate * booking.event.duration_hours
      : (booking.speaker.hourly_rate || 0) * booking.event.duration_hours;

  const hourlyRate =
    booking.agreed_rate !== null && booking.agreed_rate > 0
      ? booking.agreed_rate
      : booking.speaker.hourly_rate;

  const isUsingProposedRate =
    booking.agreed_rate !== null && booking.agreed_rate > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
          ← Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Event Completion
        </h1>
        <p className="text-gray-600">Manage event completion and ratings</p>
      </div>

      {/* Event Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {booking.event.title}
          </CardTitle>
          <CardDescription>
            {new Date(booking.event.date_time).toLocaleString()} •{" "}
            {booking.event.duration_hours} hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Speaker</p>
              <p className="text-lg">{booking.speaker.profile.full_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Payment Amount
              </p>
              <p className="text-lg font-bold text-green-600">
                Rp{calculatedAmount.toLocaleString("id-ID")}
              </p>
              <div className="text-sm text-gray-600 space-y-1">
                {isUsingProposedRate ? (
                  <>
                    <p className="text-blue-600 font-medium">
                      Proposed Rate: Rp
                      {booking.agreed_rate!.toLocaleString("id-ID")}/hour ×{" "}
                      {booking.event.duration_hours} hours
                    </p>
                    <p className="text-gray-500">
                      Speaker's Default Rate: Rp
                      {booking.speaker.hourly_rate.toLocaleString("id-ID")}/hour
                    </p>
                  </>
                ) : (
                  <p>
                    Rp{booking.speaker.hourly_rate.toLocaleString("id-ID")}/hour
                    × {booking.event.duration_hours} hours
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant={booking.status === "completed" ? "default" : "secondary"}
            >
              {booking.status}
            </Badge>
            <Badge
              variant={booking.status === "paid" ? "default" : "secondary"}
            >
              {booking.status === "paid"
                ? "Payment Complete"
                : "Payment Pending"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Completion Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Event Completion Status
          </CardTitle>
          <CardDescription>
            Mark event as completed after it has finished
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEventPassed && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                <Clock className="h-4 w-4 inline mr-2" />
                Event completion will be available 2 hours after the event ends.
              </p>
            </div>
          )}

          {booking.status === "completed" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                <CheckCircle className="h-4 w-4 inline mr-2" />
                Event completed successfully!
              </p>
            </div>
          )}

          {/* Error Display */}
          {lastError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                <span className="font-medium">Error: </span>
                {lastError}
              </p>
              <button
                onClick={() => setLastError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Action Buttons */}
          {canMarkComplete && (
            <div className="space-y-3">
              {(isOrganizer || isSpeaker) && (
                <Button
                  onClick={() =>
                    handleMarkCompleted(isOrganizer ? "organizer" : "speaker")
                  }
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing completion...</span>
                    </div>
                  ) : (
                    "Mark Event as Completed"
                  )}
                </Button>
              )}
              {submitting && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>
                        Updating speaker statistics and marking event as
                        completed...
                      </span>
                    </div>
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating Card (Organizer Only) */}
      {canRate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Rate Speaker Performance
            </CardTitle>
            <CardDescription>
              Share your experience with this speaker
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rating">Rating (1-5 stars)</Label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {rating} star{rating !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Share your thoughts about the speaker's performance..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>

            <Button
              onClick={handleSubmitRating}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Submitting..." : "Submit Rating"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rating Display (If Already Rated) */}
      {hasRating && booking.organizer_rating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Speaker Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              {/* Star Rating Display */}
              <div className="flex items-center gap-2">
                <span className="font-medium">Rating:</span>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= booking.organizer_rating!
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {booking.organizer_rating}/5 stars
                  </span>
                </div>
              </div>

              {/* Feedback Display */}
              {booking.reviewer_notes && (
                <div>
                  <span className="font-medium">Feedback:</span>
                  <p className="text-gray-700 mt-1">
                    {booking.reviewer_notes.replace(
                      /Rating: \d+\/5 stars\. Feedback: /,
                      ""
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
