import { db } from "@/lib/db";
import {
  tagTypes,
  genreTypes,
  movies,
  tvShows,
  tvEpisodes,
  comics,
  comicChapters,
  chapterImages,
  ebooks,
  ebookBookmarks,
  users,
} from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Try to import exported data, fallback to demo data
let exportedData: any = null;
const exportedDataPath = path.join(process.cwd(), "scripts", "exported-data.ts");
if (fs.existsSync(exportedDataPath)) {
  try {
    // Use dynamic require for the exported data (tsx supports this)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const exportedModule = require("./exported-data");
    exportedData = exportedModule.exportedData;
    console.log("📦 Using exported data from database");
  } catch (error) {
    console.log("⚠️  Could not load exported data, using demo data");
  }
} else {
  console.log("⚠️  No exported data found, using demo data");
}

// ============================================================================
// Tags and Genres
// ============================================================================

const tags = exportedData?.tags || [
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

const genres = exportedData?.genres || [
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

// ============================================================================
// Movies
// ============================================================================

const demoMovies = exportedData?.movies || [
  {
    title: "The Matrix",
    thumbnailAddress: "https://via.placeholder.com/300x450?text=The+Matrix",
    spriteAddress: "https://via.placeholder.com/120x68?text=Sprite",
    masterPlaylistAddress: "https://via.placeholder.com/playlist.m3u8",
    tags: ["magic", "supernatural", "psychological"],
    genres: ["Action", "Science Fiction"],
    views: 1250,
  },
  {
    title: "Inception",
    thumbnailAddress: "https://via.placeholder.com/300x450?text=Inception",
    spriteAddress: "https://via.placeholder.com/120x68?text=Sprite",
    masterPlaylistAddress: "https://via.placeholder.com/playlist.m3u8",
    tags: ["psychological", "time-travel", "supernatural"],
    genres: ["Science Fiction", "Thriller"],
    views: 980,
  },
  {
    title: "Interstellar",
    thumbnailAddress: "https://via.placeholder.com/300x450?text=Interstellar",
    spriteAddress: "https://via.placeholder.com/120x68?text=Sprite",
    masterPlaylistAddress: "https://via.placeholder.com/playlist.m3u8",
    tags: ["time-travel"],
    genres: ["Science Fiction", "Drama"],
    views: 2100,
  },
];

// ============================================================================
// TV Shows
// ============================================================================

const demoTvShows = exportedData?.tvShows || [
  {
    title: "Breaking Bad",
    thumbnailAddress: "https://via.placeholder.com/300x450?text=Breaking+Bad",
    description: "A high school chemistry teacher turned methamphetamine manufacturer.",
    tags: ["anti-hero", "psychological", "revenge"],
    views: 3500,
    episodes: [
      {
        seasonNumber: 1,
        episodeNumber: 1,
        episodeTitle: "Pilot",
        spriteAddress: "https://via.placeholder.com/120x68?text=Sprite",
        masterPlaylistAddress: "https://via.placeholder.com/playlist.m3u8",
        views: 450,
      },
      {
        seasonNumber: 1,
        episodeNumber: 2,
        episodeTitle: "Cat's in the Bag...",
        spriteAddress: "https://via.placeholder.com/120x68?text=Sprite",
        masterPlaylistAddress: "https://via.placeholder.com/playlist.m3u8",
        views: 420,
      },
      {
        seasonNumber: 2,
        episodeNumber: 1,
        episodeTitle: "Seven Thirty-Seven",
        spriteAddress: "https://via.placeholder.com/120x68?text=Sprite",
        masterPlaylistAddress: "https://via.placeholder.com/playlist.m3u8",
        views: 380,
      },
    ],
  },
  {
    title: "Stranger Things",
    thumbnailAddress: "https://via.placeholder.com/300x450?text=Stranger+Things",
    description: "A group of kids face supernatural forces and secret government experiments.",
    tags: ["supernatural", "psychological"],
    views: 5200,
    episodes: [
      {
        seasonNumber: 1,
        episodeNumber: 1,
        episodeTitle: "Chapter One: The Vanishing of Will Byers",
        spriteAddress: "https://via.placeholder.com/120x68?text=Sprite",
        masterPlaylistAddress: "https://via.placeholder.com/playlist.m3u8",
        views: 680,
      },
      {
        seasonNumber: 1,
        episodeNumber: 2,
        episodeTitle: "Chapter Two: The Weirdo on Maple Street",
        spriteAddress: "https://via.placeholder.com/120x68?text=Sprite",
        masterPlaylistAddress: "https://via.placeholder.com/playlist.m3u8",
        views: 650,
      },
    ],
  },
];

// ============================================================================
// Comics
// ============================================================================

const demoComics = exportedData?.comics || [
  {
    comicTitle: "One Piece",
    thumbnailAddress: "https://via.placeholder.com/300x450?text=One+Piece",
    comicDescription: "Follow Monkey D. Luffy and his pirate crew as they search for the ultimate treasure.",
    comicType: "manga" as const,
    status: "ongoing" as const,
    tags: ["adventure", "action"],
    views: 15000,
    chapters: [
      {
        chapterNumber: 1,
        favorite: true,
        images: [
          {
            imageOrdering: 1,
            imagePath: "https://via.placeholder.com/800x1200?text=Page+1",
          },
          {
            imageOrdering: 2,
            imagePath: "https://via.placeholder.com/800x1200?text=Page+2",
          },
          {
            imageOrdering: 3,
            imagePath: "https://via.placeholder.com/800x1200?text=Page+3",
          },
        ],
      },
      {
        chapterNumber: 2,
        favorite: false,
        images: [
          {
            imageOrdering: 1,
            imagePath: "https://via.placeholder.com/800x1200?text=Page+1",
          },
          {
            imageOrdering: 2,
            imagePath: "https://via.placeholder.com/800x1200?text=Page+2",
          },
        ],
      },
    ],
  },
  {
    comicTitle: "Attack on Titan",
    thumbnailAddress: "https://via.placeholder.com/300x450?text=Attack+on+Titan",
    comicDescription: "Humanity fights for survival against man-eating Titans.",
    comicType: "manga" as const,
    status: "completed" as const,
    tags: ["revenge", "post-apocalyptic"],
    views: 12000,
    chapters: [
      {
        chapterNumber: 1,
        favorite: false,
        images: [
          {
            imageOrdering: 1,
            imagePath: "https://via.placeholder.com/800x1200?text=Page+1",
          },
          {
            imageOrdering: 2,
            imagePath: "https://via.placeholder.com/800x1200?text=Page+2",
          },
        ],
      },
    ],
  },
];

// ============================================================================
// Ebooks
// ============================================================================

const demoEbooks = exportedData?.ebooks || [
  {
    ebookTitle: "1984",
    ebookAuthor: "George Orwell",
    ebookAddress: "https://via.placeholder.com/epub/1984.epub",
    bookmarks: [
      {
        bookmarkName: "Chapter 1 Start",
        chapterTitle: "Chapter 1",
        cfi: "epubcfi(/6/2[titlepage]!/4/2/1:0)",
        positionPercentage: 0,
      },
      {
        bookmarkName: "Important Quote",
        chapterTitle: "Chapter 3",
        cfi: "epubcfi(/6/4[chap03ref]!/4/2/2[chap03]!/10/2/1:0)",
        positionPercentage: 45,
      },
    ],
  },
  {
    ebookTitle: "The Great Gatsby",
    ebookAuthor: "F. Scott Fitzgerald",
    ebookAddress: "https://via.placeholder.com/epub/gatsby.epub",
    bookmarks: [],
  },
  {
    ebookTitle: "To Kill a Mockingbird",
    ebookAuthor: "Harper Lee",
    ebookAddress: "https://via.placeholder.com/epub/mockingbird.epub",
    bookmarks: [
      {
        bookmarkName: "Favorite Scene",
        chapterTitle: "Chapter 15",
        cfi: "epubcfi(/6/8[chap15ref]!/4/2/2[chap15]!/6/2/1:0)",
        positionPercentage: 30,
      },
    ],
  },
];

// ============================================================================
// Seed Functions
// ============================================================================

async function seedTagsAndGenres() {
  console.log("Seeding tags and genres...");

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
}

async function seedMovies() {
  console.log("\nSeeding movies...");

  for (const movie of demoMovies) {
    try {
      await db.insert(movies).values({
        title: movie.title,
        thumbnailAddress: movie.thumbnailAddress,
        spriteAddress: movie.spriteAddress,
        masterPlaylistAddress: movie.masterPlaylistAddress,
        tags: JSON.stringify(movie.tags),
        genres: JSON.stringify(movie.genres),
        views: movie.views,
      });
      console.log(`  ✓ Added movie: ${movie.title}`);
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint")) {
        console.log(`  ⊙ Movie already exists: ${movie.title}`);
      } else {
        console.error(`  ✗ Error adding movie ${movie.title}:`, error);
      }
    }
  }
}

async function seedTvShows() {
  console.log("\nSeeding TV shows...");

  for (const tvShow of demoTvShows) {
    try {
      const [insertedShow] = await db
        .insert(tvShows)
        .values({
          title: tvShow.title,
          thumbnailAddress: tvShow.thumbnailAddress,
          description: tvShow.description,
          tags: JSON.stringify(tvShow.tags),
          views: tvShow.views,
        })
        .returning();

      console.log(`  ✓ Added TV show: ${tvShow.title}`);

      // Insert episodes
      for (const episode of tvShow.episodes) {
        try {
          await db.insert(tvEpisodes).values({
            tvShowId: insertedShow.tvShowId,
            seasonNumber: episode.seasonNumber,
            episodeNumber: episode.episodeNumber,
            episodeTitle: episode.episodeTitle,
            spriteAddress: episode.spriteAddress,
            masterPlaylistAddress: episode.masterPlaylistAddress,
            views: episode.views,
          });
          console.log(
            `    ✓ Added episode: S${episode.seasonNumber}E${episode.episodeNumber} - ${episode.episodeTitle}`
          );
        } catch (error: any) {
          console.error(
            `    ✗ Error adding episode ${episode.episodeTitle}:`,
            error
          );
        }
      }
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint")) {
        console.log(`  ⊙ TV show already exists: ${tvShow.title}`);
      } else {
        console.error(`  ✗ Error adding TV show ${tvShow.title}:`, error);
      }
    }
  }
}

async function seedComics() {
  console.log("\nSeeding comics...");

  for (const comic of demoComics) {
    try {
      const [insertedComic] = await db
        .insert(comics)
        .values({
          comicTitle: comic.comicTitle,
          thumbnailAddress: comic.thumbnailAddress,
          comicDescription: comic.comicDescription,
          comicType: comic.comicType,
          status: comic.status,
          tags: JSON.stringify(comic.tags),
          numberOfChapters: comic.chapters.length,
          views: comic.views,
        })
        .returning();

      console.log(`  ✓ Added comic: ${comic.comicTitle}`);

      // Insert chapters and images
      for (const chapter of comic.chapters) {
        try {
          const [insertedChapter] = await db
            .insert(comicChapters)
            .values({
              comicId: insertedComic.comicId,
              chapterNumber: chapter.chapterNumber,
              favorite: chapter.favorite,
            })
            .returning();

          console.log(`    ✓ Added chapter: ${chapter.chapterNumber}`);

          // Insert chapter images
          for (const image of chapter.images) {
            try {
              await db.insert(chapterImages).values({
                chapterId: insertedChapter.chapterId,
                imageOrdering: image.imageOrdering,
                imagePath: image.imagePath,
              });
            } catch (error: any) {
              console.error(
                `      ✗ Error adding image ${image.imageOrdering}:`,
                error
              );
            }
          }
        } catch (error: any) {
          console.error(
            `    ✗ Error adding chapter ${chapter.chapterNumber}:`,
            error
          );
        }
      }
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint")) {
        console.log(`  ⊙ Comic already exists: ${comic.comicTitle}`);
      } else {
        console.error(`  ✗ Error adding comic ${comic.comicTitle}:`, error);
      }
    }
  }
}

async function seedEbooks() {
  console.log("\nSeeding ebooks...");

  for (const ebook of demoEbooks) {
    try {
      const [insertedEbook] = await db
        .insert(ebooks)
        .values({
          ebookTitle: ebook.ebookTitle,
          ebookAuthor: ebook.ebookAuthor,
          ebookAddress: ebook.ebookAddress,
        })
        .returning();

      console.log(`  ✓ Added ebook: ${ebook.ebookTitle} by ${ebook.ebookAuthor}`);

      // Insert bookmarks
      for (const bookmark of ebook.bookmarks) {
        try {
          await db.insert(ebookBookmarks).values({
            ebookId: insertedEbook.id,
            bookmarkName: bookmark.bookmarkName,
            chapterTitle: bookmark.chapterTitle,
            cfi: bookmark.cfi,
            positionPercentage: bookmark.positionPercentage,
          });
          console.log(`    ✓ Added bookmark: ${bookmark.bookmarkName}`);
        } catch (error: any) {
          console.error(
            `    ✗ Error adding bookmark ${bookmark.bookmarkName}:`,
            error
          );
        }
      }
    } catch (error: any) {
      console.error(`  ✗ Error adding ebook ${ebook.ebookTitle}:`, error);
    }
  }
}

async function seedDemoUser() {
  console.log("\nSeeding demo user...");

  try {
    // Check if any user exists
    const existingUsers = await db.select().from(users).limit(1);

    if (existingUsers.length > 0) {
      console.log("  ⊙ User already exists, skipping demo user creation");
      return;
    }

    // Use exported users if available, otherwise create demo user
    if (exportedData?.users && exportedData.users.length > 0) {
      console.log("  ⚠️  Users found in exported data, but passwords are not exported.");
      console.log("  ⚠️  You'll need to manually create users or use the /setup page.");
      return;
    }

    // Create demo user with password: "demo123"
    const passwordHash = await bcrypt.hash("demo123", 10);

    await db.insert(users).values({
      username: "demo",
      passwordHash,
    });

    console.log("  ✓ Added demo user (username: demo, password: demo123)");
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint")) {
      console.log("  ⊙ Demo user already exists");
    } else {
      console.error("  ✗ Error adding demo user:", error);
    }
  }
}

// ============================================================================
// Main Seed Function
// ============================================================================

async function seedAll() {
  try {
    console.log("🌱 Starting database seeding...\n");

    await seedTagsAndGenres();
    await seedMovies();
    await seedTvShows();
    await seedComics();
    await seedEbooks();
    await seedDemoUser();

    console.log("\n✅ Seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - ${tags.length} tags`);
    console.log(`   - ${genres.length} genres`);
    console.log(`   - ${demoMovies.length} movies`);
    console.log(`   - ${demoTvShows.length} TV shows`);
    console.log(`   - ${demoComics.length} comics`);
    console.log(`   - ${demoEbooks.length} ebooks`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seed function
seedAll()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
