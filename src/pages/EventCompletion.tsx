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

// Function to update speaker statistics when event is completed
const updateSpeakerStatistics = async (
  bookingId: string,
  speakerId: string,
  paymentAmount: number
) => {
  console.log(
    `🔄 Attempting to update speaker statistics for speaker ${speakerId}`
  );
  console.log(`💰 Payment amount: $${paymentAmount / 100}`);

  try {
    // Get current speaker data
    const { data: speakerData, error: speakerError } = await supabase
      .from("speakers")
      .select("*")
      .eq("id", speakerId)
      .single();

    if (speakerError) {
      console.error("❌ Error fetching speaker data:", speakerError);
      return;
    }

    if (speakerData) {
      console.log("📊 Current speaker data:", speakerData);

      // Use type assertion to access potentially missing columns
      const speaker = speakerData as any;

      // Update the fields that exist
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Always update total_talks since it exists in the database
      const currentTalks = speaker.total_talks || 0;
      const newTotalTalks = Number(currentTalks) + 1;
      updateData.total_talks = newTotalTalks;

      // Update other fields if they exist
      if ("total_events_completed" in speaker) {
        const currentEvents = speaker.total_events_completed || 0;
        updateData.total_events_completed = Number(currentEvents) + 1;
      }

      if ("total_earnings" in speaker) {
        const currentEarnings = speaker.total_earnings || 0;
        updateData.total_earnings = Number(currentEarnings) + paymentAmount;
      }

      console.log(`📈 Updating speaker with:`, updateData);

      const { error: updateError } = await supabase
        .from("speakers")
        .update(updateData)
        .eq("id", speakerId);

      if (updateError) {
        console.error("❌ Error updating speaker statistics:", updateError);
      } else {
        console.log(`✅ Speaker ${speakerId} statistics updated successfully`);
      }
    }
  } catch (error) {
    console.error("❌ Error in updateSpeakerStatistics:", error);
  }
};

// Function to update speaker average rating when a rating is submitted
const updateSpeakerRating = async (speakerId: string, newRating: number) => {
  try {
    // Try to get ratings - if the column doesn't exist, this will fail gracefully
    const { data: allRatings, error: ratingsError } = await supabase
      .from("bookings")
      .select("*")
      .eq("speaker_id", speakerId);

    if (ratingsError) {
      console.error("Error fetching speaker ratings:", ratingsError);
      return;
    }

    if (allRatings && allRatings.length > 0) {
      // Check if organizer_rating column exists
      const firstBooking = allRatings[0] as any;

      if ("organizer_rating" in firstBooking) {
        // Calculate new average rating from existing ratings
        const existingRatings = allRatings
          .map((booking: any) => booking.organizer_rating)
          .filter((rating: any) => rating !== null && rating !== undefined);

        existingRatings.push(newRating); // Add the new rating

        const totalRatings = existingRatings.length;
        const averageRating =
          existingRatings.reduce(
            (sum: number, rating: number) => sum + rating,
            0
          ) / totalRatings;

        // Update speaker average rating
        const { error: updateError } = await supabase
          .from("speakers")
          .update({
            average_rating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
            total_ratings: totalRatings,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", speakerId);

        if (updateError) {
          console.error("Error updating speaker rating:", updateError);
        } else {
          console.log(
            `Speaker ${speakerId} rating updated: ${averageRating.toFixed(
              2
            )} average from ${totalRatings} ratings`
          );
        }
      } else {
        console.log(
          "Rating columns not available yet - migration needs to be applied"
        );
      }
    }
  } catch (error) {
    console.error("Error in updateSpeakerRating:", error);
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

      setBooking(data as unknown as BookingDetail);

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

      // For now, we'll update the status directly to 'completed' since the new columns don't exist yet
      // This will be replaced with proper completion tracking once migrations are applied
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (error) throw error;

      // Check if all paid bookings for this event are now completed
      await checkAndUpdateEventStatus(booking.event_id);

      // Update speaker statistics when event is completed
      const calculatedAmount =
        (booking.speaker.hourly_rate || 0) * booking.event.duration_hours;
      const paymentAmount = booking.agreed_rate
        ? booking.agreed_rate * 100
        : calculatedAmount;
      await updateSpeakerStatistics(
        booking.id,
        booking.speaker_id,
        paymentAmount
      );

      toast({
        title: "Success",
        description: `Event marked as completed and speaker statistics updated`,
      });

      fetchBookingDetails(); // Refresh data
    } catch (error: any) {
      console.error("Error marking completion:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to mark event as completed`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

      // For now, we'll store the rating in a simple way
      // This will be enhanced once the rating system is fully implemented
      const { error } = await supabase
        .from("bookings")
        .update({
          // We'll add rating fields later - for now just update a note
          reviewer_notes: `Rating: ${rating}/5 stars. Feedback: ${feedback}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (error) throw error;

      // Update speaker average rating
      if (booking.speaker_id && rating) {
        await updateSpeakerRating(booking.speaker_id, rating);
      }

      toast({
        title: "Success",
        description: "Speaker rating submitted successfully",
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

  const isEventPassed = booking
    ? new Date(booking.event.date_time).getTime() + 2 * 60 * 60 * 1000 <
      Date.now()
    : false;
  const canMarkComplete = booking?.status === "paid" && isEventPassed;
  const canRate =
    isOrganizer &&
    booking?.status === "completed" &&
    !booking?.reviewer_notes?.includes("Rating:");
  const hasRating = booking?.reviewer_notes?.includes("Rating:");

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
    (booking.speaker.hourly_rate || 0) * booking.event.duration_hours;

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
                ${(calculatedAmount / 100).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">
                ${(booking.speaker.hourly_rate / 100).toFixed(2)}/hour ×{" "}
                {booking.event.duration_hours} hours
              </p>
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
                  {submitting ? "Processing..." : "Mark Event as Completed"}
                </Button>
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
      {hasRating && booking.reviewer_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Speaker Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">{booking.reviewer_notes}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
