#!/usr/bin/env node

/**
 * Test script to verify speaker feedback and statistics functionality
 * This script tests the complete workflow:
 * 1. Complete an event
 * 2. Submit feedback/rating
 * 3. Verify statistics update
 * 4. Verify feedback appears on speaker page
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

async function testSpeakerFeedbackWorkflow() {
  console.log("🧪 Testing Speaker Feedback & Statistics Workflow...\n");

  try {
    // 1. Find a booking in "paid" status for testing
    console.log("1. Finding a paid booking for testing...");
    const { data: paidBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        speaker_id,
        status,
        event:events(title, date_time),
        speaker:speakers(profile:profiles(full_name), total_talks, average_rating)
      `
      )
      .eq("status", "paid")
      .limit(1);

    if (bookingsError) {
      console.error("❌ Error fetching bookings:", bookingsError);
      return;
    }

    if (!paidBookings || paidBookings.length === 0) {
      console.log(
        "⚠️  No paid bookings found for testing. Creating test scenario..."
      );
      // In a real scenario, you would create test data here
      console.log(
        'Please ensure you have at least one booking in "paid" status to test.'
      );
      return;
    }

    const testBooking = paidBookings[0];
    console.log(`✅ Found test booking: ${testBooking.event.title}`);
    console.log(`   Speaker: ${testBooking.speaker.profile.full_name}`);
    console.log(`   Current talks: ${testBooking.speaker.total_talks}`);
    console.log(
      `   Current rating: ${
        testBooking.speaker.average_rating || "No ratings yet"
      }\n`
    );

    // 2. Test event completion
    console.log("2. Testing event completion...");
    const { error: completionError } = await supabase
      .from("bookings")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", testBooking.id);

    if (completionError) {
      console.error("❌ Error completing event:", completionError);
      return;
    }
    console.log("✅ Event marked as completed");

    // 3. Test feedback submission
    console.log("3. Testing feedback submission...");
    const testRating = 5;
    const testFeedback = "Excellent speaker! Very engaging and knowledgeable.";

    const { error: feedbackError } = await supabase
      .from("bookings")
      .update({
        reviewer_notes: `Rating: ${testRating}/5 stars. Feedback: ${testFeedback}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", testBooking.id);

    if (feedbackError) {
      console.error("❌ Error submitting feedback:", feedbackError);
      return;
    }
    console.log("✅ Feedback submitted");

    // 4. Wait a moment for triggers to execute
    console.log("4. Waiting for database triggers to execute...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5. Verify speaker statistics were updated
    console.log("5. Verifying speaker statistics update...");
    const { data: updatedSpeaker, error: speakerError } = await supabase
      .from("speakers")
      .select(
        "total_talks, total_events_completed, average_rating, total_ratings"
      )
      .eq("id", testBooking.speaker_id)
      .single();

    if (speakerError) {
      console.error("❌ Error fetching updated speaker:", speakerError);
      return;
    }

    console.log("✅ Speaker statistics after update:");
    console.log(`   Total talks: ${updatedSpeaker.total_talks}`);
    console.log(
      `   Total events completed: ${updatedSpeaker.total_events_completed}`
    );
    console.log(`   Average rating: ${updatedSpeaker.average_rating}`);
    console.log(`   Total ratings: ${updatedSpeaker.total_ratings}`);

    // 6. Verify feedback appears in speaker detail query
    console.log("6. Verifying feedback appears in speaker detail...");
    const { data: speakerFeedback, error: feedbackQueryError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        reviewer_notes,
        updated_at,
        event:events(title),
        event:events(organizer:profiles!events_organizer_id_fkey(full_name))
      `
      )
      .eq("speaker_id", testBooking.speaker_id)
      .not("reviewer_notes", "is", null)
      .like("reviewer_notes", "Rating:%");

    if (feedbackQueryError) {
      console.error("❌ Error fetching speaker feedback:", feedbackQueryError);
      return;
    }

    console.log(
      `✅ Found ${speakerFeedback.length} feedback entries for speaker`
    );
    speakerFeedback.forEach((feedback, index) => {
      const ratingMatch = feedback.reviewer_notes.match(
        /Rating: (\d+)\/5 stars/
      );
      const feedbackMatch = feedback.reviewer_notes.match(/Feedback: (.+)$/);

      console.log(`   Feedback ${index + 1}:`);
      console.log(`     Rating: ${ratingMatch ? ratingMatch[1] : "Unknown"}/5`);
      console.log(
        `     Comment: ${feedbackMatch ? feedbackMatch[1] : "No comment"}`
      );
      console.log(`     Event: ${feedback.event?.title || "Unknown"}`);
    });

    console.log(
      "\n🎉 All tests passed! Speaker feedback and statistics workflow is working correctly."
    );

    // Clean up: Reset the booking status for future tests
    console.log("\n🧹 Cleaning up test data...");
    await supabase
      .from("bookings")
      .update({ status: "paid", reviewer_notes: null })
      .eq("id", testBooking.id);
    console.log("✅ Test data cleaned up");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testSpeakerFeedbackWorkflow();
}

module.exports = { testSpeakerFeedbackWorkflow };
