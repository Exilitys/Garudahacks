import { supabase } from "@/integrations/supabase/client";

/**
 * Manually sync all speaker statistics with their actual completed bookings and ratings
 * This function serves as a backup to ensure data consistency when database triggers fail
 */
export async function syncAllSpeakerStatistics() {
  console.log("🔄 Starting manual sync of all speaker statistics...");

  try {
    // Get all speakers - select only columns that definitely exist
    const { data: speakers, error: speakersError } = await supabase
      .from("speakers")
      .select("id, total_talks, average_rating");

    if (speakersError) {
      console.error("❌ Error fetching speakers:", speakersError);
      return { success: false, error: speakersError };
    }

    if (!speakers || speakers.length === 0) {
      console.log("⚠️  No speakers found");
      return { success: true, updated: 0 };
    }

    let updatedCount = 0;
    const results = [];

    for (const speaker of speakers) {
      try {
        // Use type assertion to handle potentially missing columns
        const speakerData = speaker as any;
        console.log(`📊 Processing speaker ${speakerData.id}...`);

        // Count completed bookings
        const { count: completedBookings, error: countError } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("speaker_id", speakerData.id)
          .eq("status", "completed");

        if (countError) {
          console.error(
            `❌ Error counting bookings for speaker ${speakerData.id}:`,
            countError
          );
          continue;
        }

        // Get all ratings for this speaker
        const { data: ratingsData, error: ratingsError } = await supabase
          .from("bookings")
          .select("organizer_rating")
          .eq("speaker_id", speakerData.id)
          .not("organizer_rating", "is", null);

        if (ratingsError) {
          console.error(
            `❌ Error fetching ratings for speaker ${speakerData.id}:`,
            ratingsError
          );
          continue;
        }

        // Extract ratings from organizer_rating column
        const ratings: number[] = [];
        ratingsData?.forEach((booking: any) => {
          if (booking.organizer_rating) {
            ratings.push(booking.organizer_rating);
          }
        });

        // Calculate new values
        const newTotalTalks = completedBookings || 0;
        const newTotalRatings = ratings.length;
        const newAverageRating =
          ratings.length > 0
            ? Math.round(
                (ratings.reduce((sum, rating) => sum + rating, 0) /
                  ratings.length) *
                  100
              ) / 100
            : 0;

        // Check if update is needed (only check columns that exist)
        const needsUpdate =
          (speakerData.total_talks || 0) !== newTotalTalks ||
          Math.abs((speakerData.average_rating || 0) - newAverageRating) > 0.01;

        if (needsUpdate) {
          // Update speaker statistics
          const updateData: any = {
            total_talks: newTotalTalks,
            average_rating: newAverageRating,
            updated_at: new Date().toISOString(),
          };

          // Check if other columns exist and add them
          const { data: fullSpeakerData } = await supabase
            .from("speakers")
            .select("*")
            .eq("id", speakerData.id)
            .single();

          if (fullSpeakerData) {
            const fullData = fullSpeakerData as any;
            if ("total_events_completed" in fullData) {
              updateData.total_events_completed = newTotalTalks;
            }
            if ("total_ratings" in fullData) {
              updateData.total_ratings = newTotalRatings;
            }
          }

          const { error: updateError } = await supabase
            .from("speakers")
            .update(updateData)
            .eq("id", speakerData.id);

          if (updateError) {
            console.error(
              `❌ Error updating speaker ${speakerData.id}:`,
              updateError
            );
            results.push({
              speakerId: speakerData.id,
              success: false,
              error: updateError,
            });
          } else {
            console.log(
              `✅ Updated speaker ${speakerData.id}: talks=${newTotalTalks}, rating=${newAverageRating}`
            );
            updatedCount++;
            results.push({
              speakerId: speakerData.id,
              success: true,
              changes: {
                total_talks: {
                  old: speakerData.total_talks,
                  new: newTotalTalks,
                },
                average_rating: {
                  old: speakerData.average_rating,
                  new: newAverageRating,
                },
                total_ratings: {
                  old: speakerData.total_ratings,
                  new: newTotalRatings,
                },
              },
            });
          }
        } else {
          console.log(`✅ Speaker ${speakerData.id} already up to date`);
          results.push({
            speakerId: speakerData.id,
            success: true,
            changes: null,
          });
        }
      } catch (error) {
        console.error(
          `❌ Error processing speaker ${(speaker as any).id}:`,
          error
        );
        results.push({
          speakerId: (speaker as any).id,
          success: false,
          error,
        });
      }
    }

    console.log(
      `🎉 Sync completed! Updated ${updatedCount} out of ${speakers.length} speakers`
    );

    return {
      success: true,
      total: speakers.length,
      updated: updatedCount,
      results,
    };
  } catch (error) {
    console.error("❌ Error in syncAllSpeakerStatistics:", error);
    return { success: false, error };
  }
}

/**
 * Sync statistics for a single speaker
 */
export async function syncSpeakerStatistics(speakerId: string) {
  console.log(`🔄 Syncing statistics for speaker ${speakerId}...`);

  try {
    // Count completed bookings
    const { count: completedBookings, error: countError } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("speaker_id", speakerId)
      .eq("status", "completed");

    if (countError) {
      console.error("❌ Error counting bookings:", countError);
      return { success: false, error: countError };
    }

    // Get all ratings for this speaker
    const { data: ratingsData, error: ratingsError } = await supabase
      .from("bookings")
      .select("organizer_rating")
      .eq("speaker_id", speakerId)
      .not("organizer_rating", "is", null);

    if (ratingsError) {
      console.error("❌ Error fetching ratings:", ratingsError);
      return { success: false, error: ratingsError };
    }

    // Extract ratings from organizer_rating column
    const ratings: number[] = [];
    ratingsData?.forEach((booking: any) => {
      if (booking.organizer_rating) {
        ratings.push(booking.organizer_rating);
      }
    });

    // Calculate new values
    const newTotalTalks = completedBookings || 0;
    const newTotalRatings = ratings.length;
    const newAverageRating =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((sum, rating) => sum + rating, 0) /
              ratings.length) *
              100
          ) / 100
        : 0;

    // Update speaker statistics
    const updateData: any = {
      total_talks: newTotalTalks,
      total_ratings: newTotalRatings,
      average_rating: newAverageRating,
      updated_at: new Date().toISOString(),
    };

    // Also update total_events_completed if it exists
    const { data: fullSpeakerData } = await supabase
      .from("speakers")
      .select("*")
      .eq("id", speakerId)
      .single();

    if (fullSpeakerData && "total_events_completed" in fullSpeakerData) {
      updateData.total_events_completed = newTotalTalks;
    }

    const { error: updateError } = await supabase
      .from("speakers")
      .update(updateData)
      .eq("id", speakerId);

    if (updateError) {
      console.error("❌ Error updating speaker:", updateError);
      return { success: false, error: updateError };
    }

    console.log(
      `✅ Speaker ${speakerId} statistics synced: talks=${newTotalTalks}, rating=${newAverageRating}`
    );

    return {
      success: true,
      speakerId,
      updated: {
        total_talks: newTotalTalks,
        average_rating: newAverageRating,
        total_ratings: newTotalRatings,
      },
    };
  } catch (error) {
    console.error("❌ Error in syncSpeakerStatistics:", error);
    return { success: false, error };
  }
}
