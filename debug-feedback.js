// Debug script to check what's in the bookings table
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ijjgxvqlzxilnhntgdkd.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqamd4dnFsenhpbG5obnRnZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MTE5MjQsImV4cCI6MjA1MzI4NzkyNH0.rVf3n6LTBmyECx5-PKF5L-KL9VV7lAIrjy_-3dQWHcI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFeedback() {
  console.log("Checking bookings with reviewer_notes...");

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      reviewer_notes,
      speaker_id,
      event:events(title, organizer:profiles!events_organizer_id_fkey(full_name))
    `
    )
    .not("reviewer_notes", "is", null)
    .limit(5);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Found bookings with feedback:", data?.length || 0);
  data?.forEach((booking, index) => {
    console.log(`\n--- Booking ${index + 1} ---`);
    console.log("ID:", booking.id);
    console.log("Speaker ID:", booking.speaker_id);
    console.log("Event:", booking.event?.title);
    console.log("Organizer:", booking.event?.organizer?.full_name);
    console.log("Reviewer Notes:", booking.reviewer_notes);
  });
}

debugFeedback()
  .then(() => {
    console.log("\nDebug complete");
    process.exit(0);
  })
  .catch(console.error);
