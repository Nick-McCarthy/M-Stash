# Bookmark Implementation - Research Summary

## Research Sources
- epub.js GitHub: https://github.com/futurepress/epub.js
- react-reader GitHub: https://github.com/gerhardsletten/react-reader
- EPUB CFI Specification: https://idpf.org/epub/linking/cfi/

## Best Practices from epub.js and react-reader

### 1. **CFI (Canonical Fragment Identifier) - The Standard Approach**
Both epub.js and react-reader recommend using CFI for bookmarks because:
- ✅ **Precise**: CFIs point to exact locations in the EPUB
- ✅ **Reliable**: Works regardless of screen size, font size, or device
- ✅ **Standardized**: Part of the EPUB specification
- ✅ **Persistent**: CFIs remain valid even if the EPUB is updated

### 2. **Getting Current Location**

**epub.js recommends two approaches:**

#### Option A: `rendition.currentLocation()` (Direct method)
```javascript
const location = rendition.currentLocation();
const cfi = location.start.cfi;
```
- ✅ Best for getting location at a specific moment (e.g., when creating bookmark)
- ✅ Synchronous - returns immediately
- ✅ Recommended for bookmark creation

#### Option B: `locationChanged` Event (Reactive)
```javascript
rendition.on('locationChanged', (location) => {
  const cfi = location.start.cfi;
  // Update UI, save last position, etc.
});
```
- ✅ Best for tracking location as user reads
- ✅ Automatically fires on navigation
- ✅ Good for displaying current position

**Our Implementation:**
- ✅ We use both: `locationChanged` event for tracking + `rendition.currentLocation()` for bookmark creation
- ✅ This follows best practices from both libraries

### 3. **Navigating to Bookmarks**

**Standard Approach:**
```javascript
rendition.display(cfi); // Navigate to stored CFI
```

**Our Implementation:**
- ✅ We use `rendition.display(cfi)` as recommended
- ✅ Has fallback to percentage-based navigation for backward compatibility

### 4. **Storing Bookmarks**

**Recommended Structure:**
```javascript
{
  cfi: "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/2/1:3)", // Required
  label: "Bookmark name", // User-defined
  chapterTitle: "Chapter 1", // Optional, for display
  positionPercentage: 25.5, // Optional, for display/progress
  createdAt: "2024-01-01T00:00:00Z" // Timestamp
}
```

**Our Implementation:**
- ✅ Stores CFI (primary method)
- ✅ Stores optional percentage (for display/fallback)
- ✅ Stores chapter title (for context)
- ✅ Stores timestamp (for sorting)

### 5. **React-Reader Specific Recommendations**

React-reader adds:
- `locationChanged` callback to track position
- `location` prop to navigate programmatically
- `getRendition` callback to access underlying epub.js instance

**Key Difference:**
- react-reader manages location state internally
- epub.js (direct) requires manual state management
- Our implementation uses epub.js directly, so we manage state ourselves

## Current Implementation Status

### ✅ What We're Doing Right

1. **Using CFI as primary bookmark identifier**
   - Stored in database
   - Used for navigation

2. **Proper navigation method**
   - Using `rendition.display(cfi)` as recommended

3. **Event-based location tracking**
   - Using `locationChanged` event to update UI

4. **Direct location retrieval for bookmarks**
   - Using `rendition.currentLocation()` when creating bookmarks (newly improved)

5. **Fallback mechanisms**
   - Percentage-based fallback for older bookmarks
   - Error handling for invalid CFIs

6. **Metadata storage**
   - Storing chapter title, percentage, timestamp
   - User-defined bookmark names

### 📝 Improvements Made

1. **Direct CFI retrieval on bookmark creation**
   - Changed from using state (`currentLocation`) to `rendition.currentLocation()`
   - Ensures we get the most up-to-date location at creation time
   - Follows epub.js documentation recommendations

## Implementation Details

### Creating a Bookmark
```javascript
// Get location directly from rendition (recommended)
const location = rendition.currentLocation();
const cfi = location.start.cfi;
const percentage = location.start.percentage * 100;

// Store in database
await createBookmark({
  cfi: cfi,
  bookmarkName: "Important section",
  chapterTitle: "Chapter 1",
  positionPercentage: percentage
});
```

### Navigating to a Bookmark
```javascript
// Primary method: Use CFI directly
await rendition.display(bookmark.cfi);

// Fallback: Convert percentage to CFI if CFI missing
if (!cfi && percentage) {
  await book.locations.generate(200);
  const cfi = book.locations.cfiFromPercentage(percentage / 100);
  await rendition.display(cfi);
}
```

## Key Takeaways

1. **CFI is the gold standard** - Both libraries recommend it
2. **Direct location retrieval** - Use `currentLocation()` when creating bookmarks
3. **Event tracking** - Use `locationChanged` for UI updates
4. **Store metadata** - Chapter titles and percentages improve UX
5. **Error handling** - Always have fallbacks for invalid CFIs

## Resources

- [epub.js GitHub](https://github.com/futurepress/epub.js)
- [epub.js Reader Example](https://github.com/futurepress/epubjs-reader)
- [react-reader GitHub](https://github.com/gerhardsletten/react-reader)
- [EPUB CFI Specification](https://idpf.org/epub/linking/cfi/)

## Notes

- Our implementation aligns with best practices from both libraries
- The improvement to use `rendition.currentLocation()` directly ensures more reliable bookmark creation
- The fallback mechanisms ensure backward compatibility with older bookmarks

