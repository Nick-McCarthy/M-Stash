import { db } from "@/lib/db";
import { tagTypes, genreTypes } from "@/lib/db/schema";

// 10 detailed tags for media library
const tags = [
  "female-lead",
  "revenge",
  "magic",
  "supernatural",
  "time-travel",
  "post-apocalyptic",
  "psychological",
  "slice-of-life",
  "isekai",
  "anti-hero",
];

// 10 common genres for media library
const genres = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Romance",
  "Science Fiction",
  "Thriller",
  "Mystery",
];

async function seedTagsAndGenres() {
  try {
    console.log("Starting to seed tags and genres...");

    // Insert tags
    console.log("Inserting tags...");
    for (const tag of tags) {
      try {
        await db.insert(tagTypes).values({
          tagName: tag,
          isActive: true,
        });
        console.log(`  ✓ Added tag: ${tag}`);
      } catch (error: any) {
        if (error.message?.includes("UNIQUE constraint")) {
          console.log(`  ⊙ Tag already exists: ${tag}`);
        } else {
          console.error(`  ✗ Error adding tag ${tag}:`, error);
        }
      }
    }

    // Insert genres
    console.log("Inserting genres...");
    for (const genre of genres) {
      try {
        await db.insert(genreTypes).values({
          genreName: genre,
          isActive: true,
        });
        console.log(`  ✓ Added genre: ${genre}`);
      } catch (error: any) {
        if (error.message?.includes("UNIQUE constraint")) {
          console.log(`  ⊙ Genre already exists: ${genre}`);
        } else {
          console.error(`  ✗ Error adding genre ${genre}:`, error);
        }
      }
    }

    console.log("\n✅ Seeding completed successfully!");
    console.log(`   - ${tags.length} tags processed`);
    console.log(`   - ${genres.length} genres processed`);
  } catch (error) {
    console.error("❌ Error seeding tags and genres:", error);
    process.exit(1);
  }
}

// Run the seed function
seedTagsAndGenres()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

