import { db } from "@/lib/db";
import { tagTypes } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

async function removeTags() {
  try {
    console.log("Removing all existing tags...");

    // Delete all tags
    const result = await db.delete(tagTypes);
    
    console.log("✅ All tags removed successfully!");
    console.log(`   Deleted all entries from tag_types table`);
  } catch (error) {
    console.error("❌ Error removing tags:", error);
    process.exit(1);
  }
}

// Run the removal function
removeTags()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

