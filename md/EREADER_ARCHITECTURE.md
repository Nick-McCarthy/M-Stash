# E-Reader Architecture Documentation

This document explains how the e-reader system works, focusing on the interaction between the client-side React component and the server-side API routes that serve EPUB content.

## Overview

The e-reader system uses **epub.js** library to render EPUB files in the browser. EPUB files are ZIP archives containing HTML, CSS, images, and metadata files. The architecture consists of:

1. **Client-side React component** (`page.tsx`) - Renders the EPUB using epub.js
2. **Proxy route** (`proxy/route.ts`) - Serves the complete EPUB file from S3
3. **Resource routes** (`[...path]/route.ts`) - Serve individual files from within the EPUB archive

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  page.tsx (React Component)                          │   │
│  │  - Initializes epub.js Book object                   │   │
│  │  - Creates Rendition for display                     │   │
│  │  - Handles navigation, bookmarks, UI                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP Requests
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Server)                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/ebook-library/[ebook]/proxy                    │  │
│  │  - Serves complete EPUB file                          │  │
│  │  - Supports Range requests (partial content)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/ebook-library/[ebook]/[...path]                 │  │
│  │  - Serves internal EPUB resources                    │  │
│  │  - Unpacks EPUB with JSZip                            │  │
│  │  - Returns individual files (XML, HTML, CSS, images) │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /ebook-library/[...path]                              │  │
│  │  - Fallback route for relative resource requests      │  │
│  │  - Extracts ebook ID from referer header             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Fetches from S3
                            ▼
                    ┌───────────────┐
                    │  S3 Storage   │
                    │  (EPUB files) │
                    └───────────────┘
```

## File-by-File Breakdown

### 1. `src/app/ebook-library/[ebook]/page.tsx`

**Purpose**: Client-side React component that renders the EPUB reader interface.

**Key Responsibilities**:
- Initializes the epub.js `Book` object pointing to the proxy route
- Creates a `Rendition` to display the EPUB content
- Manages UI state (chapters, bookmarks, current location)
- Handles navigation (next/previous page, chapter navigation)
- Implements bookmark creation and navigation
- Provides theme support (light/dark mode)

**How it works**:

1. **EPUB Initialization** (lines 216-692):
   ```typescript
   const ebookUrl = `/api/ebook-library/${ebookId}/proxy`;
   const newBook = new Book(ebookUrl);
   ```
   - Creates a new epub.js `Book` instance pointing to the proxy route
   - epub.js will fetch the EPUB file from this URL
   - When epub.js needs internal resources (like `META-INF/container.xml`, chapter HTML files, images), it makes relative requests that are intercepted by the `[...path]` routes

2. **Navigation Setup**:
   - Extracts navigation data from the EPUB (TOC, landmarks, spine)
   - Filters out frontmatter/backmatter to find actual chapters
   - Fixes navigation mismatches (some EPUBs have incorrect hrefs)
   - Determines initial reading location (skips to first chapter, not title page)

3. **Location Tracking**:
   - Listens to `locationChanged` events from the rendition
   - Tracks CFI (Canonical Fragment Identifier) - the standard way to reference EPUB locations
   - Tracks percentage progress through the book
   - Updates current chapter information

4. **Bookmark System**:
   - Uses CFI strings for precise bookmark positioning (recommended by epub.js)
   - Falls back to percentage-based navigation for backward compatibility
   - Stores bookmarks via API calls to `/api/ebook-library/[ebookId]/bookmarks`

5. **Navigation Methods**:
   - **Spine-based navigation** (preferred): Uses the EPUB's spine order (authoritative reading order)
   - **TOC-based navigation** (fallback): Uses table of contents order
   - **epub.js default** (final fallback): Uses epub.js built-in navigation

**Important**: epub.js automatically makes requests for internal EPUB resources. These requests are relative to the EPUB URL, so they need to be intercepted and routed through our API.

---

### 2. `src/app/api/ebook-library/[ebook]/proxy/route.ts`

**Purpose**: Serves the complete EPUB file from S3 storage.

**Key Responsibilities**:
- Validates the ebook ID parameter
- Fetches ebook metadata from the database
- Proxies the EPUB file from S3
- Supports HTTP Range requests (for efficient partial content loading)
- Sets appropriate CORS headers for cross-origin requests

**How it works**:

1. **Request Handling**:
   - **GET**: Fetches the full EPUB file or partial content (if Range header is present)
   - **HEAD**: Returns metadata about the EPUB file without the body
   - **OPTIONS**: Handles CORS preflight requests

2. **Range Request Support** (lines 31-88):
   - epub.js may request partial content using HTTP Range requests
   - Forwards the `Range` header to S3
   - Returns `206 Partial Content` status with `Content-Range` header
   - This allows epub.js to load the EPUB file efficiently without downloading the entire file upfront

3. **Response Headers**:
   - Sets `Content-Type: application/epub+zip`
   - Sets `Content-Disposition: inline` (so browser displays it, doesn't download)
   - Sets CORS headers to allow cross-origin requests
   - Sets cache headers for performance

**Why this route exists**: epub.js needs to load the EPUB file as a URL. Since EPUBs are stored in S3, we need a proxy route that:
- Validates access (checks database)
- Handles authentication/authorization
- Provides a consistent URL structure
- Supports Range requests for efficient loading

---

### 3. `src/app/api/ebook-library/[ebook]/[...path]/route.ts`

**Purpose**: Serves individual files from within the EPUB archive.

**Key Responsibilities**:
- Extracts the ebook ID from the URL path
- Fetches the EPUB file from S3
- Unpacks the EPUB using JSZip
- Locates and serves the requested internal file
- Handles path variations and case-insensitive matching
- Sets appropriate content types for different file types

**How it works**:

1. **Path Extraction**:
   - The `[...path]` catch-all route captures the internal EPUB file path
   - Example: `/api/ebook-library/123/META-INF/container.xml` → `path = ["META-INF", "container.xml"]`
   - Joins path segments: `internalPath = "META-INF/container.xml"`

2. **EPUB Unpacking**:
   ```typescript
   const arrayBuffer = await response.arrayBuffer();
   const zip = await JSZip.loadAsync(arrayBuffer);
   const file = zip.file(internalPath);
   ```
   - Fetches the complete EPUB from S3
   - Uses JSZip to unpack the ZIP archive
   - Locates the requested file within the archive

3. **Path Resolution** (lines 64-88):
   - Tries multiple path variations for compatibility:
     - Exact match: `META-INF/container.xml`
     - Without leading slash: `META-INF/container.xml` (if path had leading slash)
     - With leading slash: `/META-INF/container.xml`
     - Case-insensitive match (some EPUBs have inconsistent casing)

4. **Content Type Detection** (lines 122-145):
   - Determines MIME type based on file extension
   - Supports EPUB-specific types:
     - `.opf` → `application/oebps-package+xml`
     - `.ncx` → `application/x-dtbncx+xml`
     - `.xhtml` → `application/xhtml+xml`
   - Also handles images, fonts, CSS, etc.

5. **Optional File Handling** (lines 90-120):
   - Some EPUBs have optional files (like Apple iBooks metadata)
   - Returns empty XML response for missing optional metadata files
   - Prevents 404 errors that could break epub.js

**Why this route exists**: When epub.js loads the EPUB, it needs to access internal files like:
- `META-INF/container.xml` - EPUB container file
- `*.opf` - Package document (metadata and manifest)
- `*.xhtml` - Chapter content files
- `*.css` - Stylesheets
- Images, fonts, etc.

epub.js makes these requests relative to the EPUB URL, so `/api/ebook-library/123/proxy` + `META-INF/container.xml` becomes `/api/ebook-library/123/META-INF/container.xml`, which this route handles.

---

### 4. `src/app/ebook-library/[...path]/route.ts`

**Purpose**: Fallback route for EPUB resource requests that don't include the ebook ID in the path.

**Key Responsibilities**:
- Extracts ebook ID from the HTTP Referer header or URL parameters
- Serves internal EPUB resources (same functionality as route #3)
- Handles cases where epub.js makes requests relative to the page URL instead of the EPUB URL

**How it works**:

1. **Ebook ID Extraction** (lines 18-39):
   ```typescript
   const referer = request.headers.get("referer");
   const ebookIdMatch = referer?.match(/\/ebook-library\/(\d+)/);
   ```
   - Extracts ebook ID from the Referer header (e.g., `http://example.com/ebook-library/123`)
   - Fallback: checks URL search params (`?ebookId=123`)
   - This is necessary because epub.js sometimes makes requests relative to the page URL

2. **Resource Serving**:
   - Once ebook ID is determined, the logic is identical to route #3
   - Fetches EPUB from S3, unpacks with JSZip, serves the requested file

**Why this route exists**: epub.js can make resource requests in two ways:
1. Relative to the EPUB URL: `/api/ebook-library/123/proxy` + `META-INF/container.xml` → handled by route #3
2. Relative to the page URL: `/ebook-library/123` + `META-INF/container.xml` → handled by this route

This route ensures both patterns work correctly.

---

## Request Flow Examples

### Example 1: Loading an EPUB

1. User navigates to `/ebook-library/123`
2. `page.tsx` initializes:
   ```typescript
   const newBook = new Book('/api/ebook-library/123/proxy');
   ```
3. epub.js requests the EPUB file:
   ```
   GET /api/ebook-library/123/proxy
   → proxy/route.ts fetches from S3
   → Returns EPUB file with 206 Partial Content (if Range request)
   ```
4. epub.js parses the EPUB and needs `META-INF/container.xml`:
   ```
   GET /api/ebook-library/123/META-INF/container.xml
   → [...path]/route.ts unpacks EPUB, finds file, returns it
   ```
5. epub.js needs chapter files, images, CSS, etc.:
   ```
   GET /api/ebook-library/123/OEBPS/chapter1.xhtml
   GET /api/ebook-library/123/OEBPS/styles.css
   GET /api/ebook-library/123/OEBPS/images/cover.jpg
   → All handled by [...path]/route.ts
   ```

### Example 2: Navigation

1. User clicks "Next Page" button
2. `handleNextPage()` is called (line 942)
3. Tries spine-based navigation first (most reliable)
4. Falls back to TOC-based navigation if spine fails
5. Calls `rendition.display(nextHref)` to show the next chapter
6. epub.js requests the new chapter file:
   ```
   GET /api/ebook-library/123/OEBPS/chapter2.xhtml
   → [...path]/route.ts serves the file
   ```
7. `locationChanged` event fires, updating current location state

### Example 3: Creating a Bookmark

1. User clicks "Add Bookmark" button
2. `handleCreateBookmark()` is called (line 701)
3. Gets current CFI from `rendition.currentLocation()`
4. Calls API to create bookmark:
   ```
   POST /api/ebook-library/123/bookmarks
   Body: { bookmark_name, chapter_title, cfi, position_percentage }
   ```
5. Bookmark is saved to database
6. UI updates to show the new bookmark

---

## Key Concepts

### CFI (Canonical Fragment Identifier)

CFI is the EPUB standard way to reference specific locations in a book. It's more reliable than percentage or page numbers because:
- It's based on the document structure, not rendering
- It works across different screen sizes and font sizes
- It's the recommended method by epub.js

Example CFI: `epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10)`

### Spine vs TOC

- **Spine**: The authoritative reading order defined in the EPUB's OPF file. This is the "correct" order.
- **TOC (Table of Contents)**: A navigational structure that may not match the spine exactly. Some EPUBs have TOC entries that don't follow reading order.

The code prioritizes spine-based navigation but falls back to TOC if needed.

### Range Requests

HTTP Range requests allow clients to request specific byte ranges of a file:
```
Range: bytes=0-1023
```
This is useful for:
- Streaming large files
- Resuming downloads
- Efficient loading (epub.js may only need the beginning of the EPUB to parse metadata)

The proxy route supports this by forwarding Range headers to S3.

---

## Security Considerations

1. **Ebook ID Validation**: All routes validate ebook IDs using Zod schema
2. **Database Lookup**: Routes check the database to ensure the ebook exists before serving
3. **No Direct S3 Access**: Clients never access S3 directly; all requests go through the API
4. **Scripted Content Disabled**: `allowScriptedContent: false` in epub.js prevents XSS attacks
5. **CORS Headers**: Properly configured CORS headers allow cross-origin requests while maintaining security

---

## Performance Optimizations

1. **Caching**: Resource routes set `Cache-Control: public, max-age=3600` headers
2. **Range Requests**: Supports partial content loading for efficient EPUB loading
3. **Lazy Location Generation**: EPUB locations are generated on-demand, not all at once
4. **Path Matching**: Multiple path resolution strategies ensure files are found quickly

---

## Troubleshooting

### epub.js can't find resources

- Check that both `[...path]` routes are working
- Verify ebook ID is being extracted correctly from referer
- Check browser console for 404 errors
- Ensure EPUB file structure is valid (some EPUBs have malformed paths)

### Navigation doesn't work

- Ensure locations are generated: `await book.locations.generate(200)`
- Check that spine/TOC data is available
- Verify hrefs in navigation match actual files in EPUB

### Bookmarks don't navigate correctly

- Ensure CFI is being saved (check database)
- Verify `rendition.display(cfi)` is being called with valid CFI
- Check that locations are generated before navigating

---

## Dependencies

- **epub.js**: EPUB rendering library
- **JSZip**: ZIP file extraction (for unpacking EPUBs)
- **Next.js**: Framework for API routes and React components
- **React Query**: Data fetching and caching
- **Drizzle ORM**: Database queries

---

## Future Improvements

1. **Caching**: Cache unpacked EPUBs in memory or Redis to avoid re-fetching from S3
2. **Streaming**: Stream EPUB resources instead of loading entire file
3. **Progressive Loading**: Load chapters on-demand as user navigates
4. **Offline Support**: Service worker for offline reading
5. **Search**: Full-text search within EPUBs

