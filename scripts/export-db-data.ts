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
import { eq } from "drizzle-orm";
import { parseJsonArray } from "@/lib/db/sqlite-helpers";
import fs from "fs";
import path from "path";

async function exportAllData() {
  try {
    console.log("📤 Exporting all data from database...\n");

    // Export Tags
    console.log("Exporting tags...");
    const tagsData = await db.select().from(tagTypes);
    const tags = tagsData.map((t) => t.tagName);
    console.log(`  ✓ Exported ${tags.length} tags`);

    // Export Genres
    console.log("Exporting genres...");
    const genresData = await db.select().from(genreTypes);
    const genres = genresData.map((g) => g.genreName);
    console.log(`  ✓ Exported ${genres.length} genres`);

    // Export Movies
    console.log("Exporting movies...");
    const moviesData = await db.select().from(movies);
    const exportedMovies = moviesData.map((m) => ({
      title: m.title,
      thumbnailAddress: m.thumbnailAddress,
      spriteAddress: m.spriteAddress,
      masterPlaylistAddress: m.masterPlaylistAddress,
      tags: parseJsonArray(m.tags as string),
      genres: parseJsonArray(m.genres as string),
      views: m.views,
    }));
    console.log(`  ✓ Exported ${exportedMovies.length} movies`);

    // Export TV Shows with Episodes
    console.log("Exporting TV shows...");
    const tvShowsData = await db.select().from(tvShows);
    const exportedTvShows = [];
    for (const show of tvShowsData) {
      const episodesData = await db
        .select()
        .from(tvEpisodes)
        .where(eq(tvEpisodes.tvShowId, show.tvShowId));
      
      exportedTvShows.push({
        title: show.title,
        thumbnailAddress: show.thumbnailAddress,
        description: show.description,
        tags: parseJsonArray(show.tags as string),
        views: show.views,
        episodes: episodesData.map((ep) => ({
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          episodeTitle: ep.episodeTitle,
          spriteAddress: ep.spriteAddress,
          masterPlaylistAddress: ep.masterPlaylistAddress,
          views: ep.views,
        })),
      });
    }
    console.log(`  ✓ Exported ${exportedTvShows.length} TV shows`);

    // Export Comics with Chapters and Images
    console.log("Exporting comics...");
    const comicsData = await db.select().from(comics);
    const exportedComics = [];
    for (const comic of comicsData) {
      const chaptersData = await db
        .select()
        .from(comicChapters)
        .where(eq(comicChapters.comicId, comic.comicId));
      
      const chapters = [];
      for (const chapter of chaptersData) {
        const imagesData = await db
          .select()
          .from(chapterImages)
          .where(eq(chapterImages.chapterId, chapter.chapterId))
          .orderBy(chapterImages.imageOrdering);
        
        chapters.push({
          chapterNumber: parseFloat(chapter.chapterNumber.toString()),
          favorite: chapter.favorite,
          images: imagesData.map((img) => ({
            imageOrdering: img.imageOrdering,
            imagePath: img.imagePath,
          })),
        });
      }
      
      exportedComics.push({
        comicTitle: comic.comicTitle,
        thumbnailAddress: comic.thumbnailAddress,
        comicDescription: comic.comicDescription,
        comicType: comic.comicType,
        status: comic.status,
        tags: parseJsonArray(comic.tags as string),
        views: comic.views,
        chapters,
      });
    }
    console.log(`  ✓ Exported ${exportedComics.length} comics`);

    // Export Ebooks with Bookmarks
    console.log("Exporting ebooks...");
    const ebooksData = await db.select().from(ebooks);
    const exportedEbooks = [];
    for (const ebook of ebooksData) {
      const bookmarksData = await db
        .select()
        .from(ebookBookmarks)
        .where(eq(ebookBookmarks.ebookId, ebook.id));
      
      exportedEbooks.push({
        ebookTitle: ebook.ebookTitle,
        ebookAuthor: ebook.ebookAuthor,
        ebookAddress: ebook.ebookAddress,
        bookmarks: bookmarksData.map((bm) => ({
          bookmarkName: bm.bookmarkName,
          chapterTitle: bm.chapterTitle,
          cfi: bm.cfi,
          positionPercentage: bm.positionPercentage,
        })),
      });
    }
    console.log(`  ✓ Exported ${exportedEbooks.length} ebooks`);

    // Export Users (without password hashes for security)
    console.log("Exporting users...");
    const usersData = await db.select().from(users);
    const exportedUsers = usersData.map((u) => ({
      username: u.username,
      // Note: Password hash is NOT exported for security reasons
      // You'll need to manually add users or use a known password
    }));
    console.log(`  ✓ Exported ${exportedUsers.length} users (usernames only)`);

    // Create the exported data object
    const exportedData = {
      tags,
      genres,
      movies: exportedMovies,
      tvShows: exportedTvShows,
      comics: exportedComics,
      ebooks: exportedEbooks,
      users: exportedUsers,
    };

    // Write to a TypeScript file that can be imported
    const outputPath = path.join(process.cwd(), "scripts", "exported-data.ts");
    const fileContent = `// Auto-generated export from database
// Run: npm run db:export
// Generated: ${new Date().toISOString()}

export const exportedData = ${JSON.stringify(exportedData, null, 2)};
`;

    fs.writeFileSync(outputPath, fileContent, "utf-8");

    console.log("\n✅ Export completed successfully!");
    console.log(`📁 Data exported to: ${outputPath}`);
    console.log("\n📊 Summary:");
    console.log(`   - ${tags.length} tags`);
    console.log(`   - ${genres.length} genres`);
    console.log(`   - ${exportedMovies.length} movies`);
    console.log(`   - ${exportedTvShows.length} TV shows`);
    console.log(`   - ${exportedComics.length} comics`);
    console.log(`   - ${exportedEbooks.length} ebooks`);
    console.log(`   - ${exportedUsers.length} users`);
    console.log("\n⚠️  Note: User passwords are NOT exported for security reasons.");
    console.log("   You'll need to manually add users or use a known password in the seed script.");
  } catch (error) {
    console.error("❌ Error exporting data:", error);
    process.exit(1);
  }
}

exportAllData()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

