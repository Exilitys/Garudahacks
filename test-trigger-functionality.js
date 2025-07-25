// Test script to verify database triggers are working
// This script will help debug trigger functionality

const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "your-supabase-url";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTriggerFunctionality() {
  console.log("🔍 Testing database trigger functionality...\n");

  try {
    // 1. Check if trigger functions exist
    console.log("1. Checking if trigger functions exist...");
    const { data: functions, error: functionsError } = await supabase.rpc(
      "exec",
      {
        sql: `
          SELECT routine_name, routine_type 
          FROM information_schema.routines 
          WHERE routine_name IN ('update_speaker_stats_on_completion', 'update_speaker_rating_on_feedback')
          AND routine_schema = 'public';
        `,
      }
    );

    if (functionsError) {
      console.log("⚠️  Could not check functions (this might be normal)");
    } else {
      console.log("✅ Functions check result:", functions);
    }

    // 2. Check if triggers exist
    console.log("\n2. Checking if triggers exist...");
    const { data: triggers, error: triggersError } = await supabase.rpc(
      "exec",
      {
        sql: `
          SELECT trigger_name, event_manipulation, event_object_table 
          FROM information_schema.triggers 
          WHERE trigger_name IN ('trigger_update_speaker_stats', 'trigger_update_speaker_rating');
        `,
      }
    );

    if (triggersError) {
      console.log("⚠️  Could not check triggers (this might be normal)");
    } else {
      console.log("✅ Triggers check result:", triggers);
    }

    // 3. Get a sample speaker and their current stats
    console.log("\n3. Getting sample speaker data...");
    const { data: speakers, error: speakersError } = await supabase
      .from("speakers")
      .select("id, total_talks, average_rating, total_ratings")
      .limit(1);

    if (speakersError) {
      console.error("❌ Error fetching speakers:", speakersError);
      return;
    }

    if (speakers && speakers.length > 0) {
      const speaker = speakers[0];
      console.log("📊 Sample speaker stats:", {
        id: speaker.id,
        total_talks: speaker.total_talks,
        average_rating: speaker.average_rating,
        total_ratings: speaker.total_ratings,
      });

      // 4. Count actual completed bookings for this speaker
      const { count, error: countError } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("speaker_id", speaker.id)
        .eq("status", "completed");

      if (countError) {
        console.error("❌ Error counting bookings:", countError);
      } else {
        console.log(`📈 Actual completed bookings: ${count}`);

        if (speaker.total_talks !== count) {
          console.log(
            "⚠️  MISMATCH: Speaker total_talks does not match completed bookings!"
          );
          console.log(`   Expected: ${count}, Actual: ${speaker.total_talks}`);
        } else {
          console.log("✅ Speaker stats match completed bookings");
        }
      }

      // 5. Count actual ratings for this speaker
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("bookings")
        .select("reviewer_notes")
        .eq("speaker_id", speaker.id)
        .not("reviewer_notes", "is", null);

      if (ratingsError) {
        console.error("❌ Error fetching ratings:", ratingsError);
      } else {
        const ratings = [];
        ratingsData?.forEach((booking) => {
          const ratingMatch = booking.reviewer_notes?.match(
            /Rating: (\d+)\/5 stars/
          );
          if (ratingMatch) {
            ratings.push(parseInt(ratingMatch[1]));
          }
        });

        console.log(`📊 Actual ratings found: ${ratings.length}`);
        if (ratings.length > 0) {
          const avgRating =
            ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
          console.log(`📊 Calculated average: ${avgRating.toFixed(2)}`);

          if (Math.abs(speaker.average_rating - avgRating) > 0.01) {
            console.log(
              "⚠️  MISMATCH: Speaker average_rating does not match calculated average!"
            );
            console.log(
              `   Expected: ${avgRating.toFixed(2)}, Actual: ${
                speaker.average_rating
              }`
            );
          } else {
            console.log("✅ Speaker rating matches calculated average");
          }
        }
      }
    } else {
      console.log("⚠️  No speakers found in database");
    }
  } catch (error) {
    console.error("❌ Error testing triggers:", error);
  }
}

// Run the test
testTriggerFunctionality().then(() => {
  console.log("\n🔍 Trigger functionality test completed");
  process.exit(0);
});
