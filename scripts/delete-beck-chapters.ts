import { query } from "../src/lib/db";

async function deleteBeckChapters() {
  try {
    // Get the comic_id first to confirm
    const comicResult = await query(
      "SELECT comic_id, comic_title FROM comics WHERE comic_title = ?",
      ["Beck"]
    );

    if (comicResult.rows.length === 0) {
      console.log("Comic 'Beck' not found in the database.");
      return;
    }

    const comic = comicResult.rows[0] as { comic_id: number; comic_title: string };
    console.log(`Found comic: ${comic.comic_title} (ID: ${comic.comic_id})`);

    // Count chapters before deletion
    const countResult = await query(
      "SELECT COUNT(*) as count FROM comic_chapters WHERE comic_id = ?",
      [comic.comic_id]
    );
    const chapterCount = (countResult.rows[0] as { count: number }).count;
    console.log(`Found ${chapterCount} chapters to delete.`);

    if (chapterCount === 0) {
      console.log("No chapters found for 'Beck'.");
      return;
    }

    // Delete the chapters
    const deleteResult = await query(
      "DELETE FROM comic_chapters WHERE comic_id = ?",
      [comic.comic_id]
    );

    console.log(`✅ Successfully deleted ${deleteResult.rowCount} chapter(s) for 'Beck'.`);
    console.log(
      "Note: Associated chapter_images were also deleted due to CASCADE constraint."
    );
  } catch (error) {
    console.error("Error deleting chapters:", error);
    throw error;
  }
}

deleteBeckChapters()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });

