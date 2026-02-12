# Root Layout Architecture

This document explains the structure and design decisions behind the root `layout.tsx` file, specifically why conditional navigation is used instead of secondary layouts with dedicated navigation components.

## Table of Contents

1. [Overview](#overview)
2. [Layout Structure](#layout-structure)
3. [Conditional Navigation Pattern](#conditional-navigation-pattern)
4. [Why Conditional Navigation?](#why-conditional-navigation)
5. [Alternative Approach: Secondary Layouts](#alternative-approach-secondary-layouts)
6. [Comparison](#comparison)
7. [Implementation Details](#implementation-details)
8. [Trade-offs and Considerations](#trade-offs-and-considerations)

---

## Overview

The root layout (`src/app/layout.tsx`) serves as the single source of truth for the application's HTML structure, global providers, and navigation. Instead of using multiple nested layouts with different navigation components, this application uses a **conditional navigation pattern** that dynamically shows or hides the navigation bar based on the current route.

**Key Design Principle**: One layout, conditional rendering based on route context.

---

## Layout Structure

### Root Layout (`src/app/layout.tsx`)

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalNavigation } from "@/components/ConditionalNavigation";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SeedInitializer } from "@/components/SeedInitializer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            <SeedInitializer />
            <ConditionalNavigation />
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Component Hierarchy

```
RootLayout
├── ThemeProvider (Theme context)
├── QueryProvider (React Query context)
├── SeedInitializer (Database initialization)
├── ConditionalNavigation (Conditionally rendered)
└── {children} (Page content)
```

**Key Components:**

1. **ThemeProvider**: Manages dark/light theme state
2. **QueryProvider**: Provides React Query client for data fetching
3. **SeedInitializer**: Ensures database is initialized on app load
4. **ConditionalNavigation**: Renders navigation bar conditionally
5. **{children}**: The actual page content (varies by route)

---

## Conditional Navigation Pattern

### ConditionalNavigation Component

```typescript
"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/NavigationBar";

export function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Hide navigation on full-screen media pages
  const isMoviePlayerPage = pathname?.match(/^\/movie-library\/\d+$/);
  const isTvEpisodePage = pathname?.match(/^\/tv-library\/[^/]+\/\d+$/);
  const isEbookReaderPage = pathname?.match(/^\/ebook-library\/\d+$/);
  
  if (isMoviePlayerPage || isTvEpisodePage || isEbookReaderPage) {
    return null; // No navigation on full-screen media pages
  }
  
  return <Navigation />; // Show navigation on all other pages
}
```

### How It Works

1. **Client-Side Route Detection**: Uses `usePathname()` hook to get current route
2. **Pattern Matching**: Checks if current route matches full-screen media page patterns
3. **Conditional Rendering**: Returns `null` for media pages, `<Navigation />` for others

**Pages Without Navigation:**
- `/movie-library/[movieId]` - Movie player page
- `/tv-library/[tvShowId]/[episodeId]` - TV episode player page
- `/ebook-library/[ebookId]` - Ebook reader page

**Pages With Navigation:**
- `/` - Home page
- `/comic-library` - Comic library
- `/movie-library` - Movie library (list view)
- `/tv-library` - TV library (list view)
- `/ebook-library` - Ebook library (list view)
- `/settings/*` - Settings pages
- All other pages

---

## Why Conditional Navigation?

### 1. **Simpler Architecture**

**Single Source of Truth**: One layout file manages the entire application structure. This eliminates the need to:
- Create multiple layout files
- Duplicate provider setup
- Maintain consistency across layouts
- Remember which layout applies to which route

**Example**: With conditional navigation, you only need to update one file to change global structure. With multiple layouts, you'd need to update several files.

### 2. **Less Code Duplication**

**Shared Providers**: All providers (Theme, Query, etc.) are defined once in the root layout. With secondary layouts, you'd need to:
- Duplicate provider setup in each layout
- Ensure providers are in the correct order
- Risk inconsistent provider configuration

**Example**:
```typescript
// ❌ With secondary layouts (duplication)
// app/layout.tsx
<ThemeProvider><QueryProvider>{children}</QueryProvider></ThemeProvider>

// app/media/layout.tsx (duplicate providers)
<ThemeProvider><QueryProvider>{children}</QueryProvider></ThemeProvider>

// ✅ With conditional navigation (single definition)
// app/layout.tsx
<ThemeProvider><QueryProvider><ConditionalNavigation />{children}</QueryProvider></ThemeProvider>
```

### 3. **Easier Maintenance**

**Single Navigation Component**: The navigation bar is defined once and conditionally rendered. Changes to navigation (adding links, styling, etc.) only need to be made in one place.

**Example**: If you want to add a new navigation item:
- **Conditional Navigation**: Update `navItems` in `site-vars.ts` → done
- **Secondary Layouts**: Update navigation in multiple layout files → error-prone

### 4. **Flexible Route Matching**

**Pattern-Based Logic**: The conditional navigation uses regex patterns to match routes. This makes it easy to:
- Add new full-screen pages without creating new layouts
- Handle complex route patterns
- Group similar pages (all media players)

**Example**: Adding a new full-screen page type:
```typescript
// Just add one pattern check
const isNewMediaPage = pathname?.match(/^\/new-media\/\d+$/);
if (isMoviePlayerPage || isTvEpisodePage || isEbookReaderPage || isNewMediaPage) {
  return null;
}
```

### 5. **Better Performance (In Some Cases)**

**Single Layout Render**: Next.js only needs to render one layout tree. With multiple layouts, Next.js needs to:
- Render parent layout
- Render child layout
- Merge layout trees

**Note**: The performance difference is minimal, but conditional navigation has slightly less overhead.

### 6. **Consistent User Experience**

**Unified Navigation**: The same navigation component is used everywhere (when visible), ensuring:
- Consistent styling
- Consistent behavior
- Consistent accessibility features
- Consistent mobile responsiveness

---

## Alternative Approach: Secondary Layouts

### How It Would Work

With secondary layouts, you'd create nested layout files:

```
app/
├── layout.tsx                    # Root layout (providers only)
├── (with-nav)/
│   ├── layout.tsx                # Layout with navigation
│   ├── page.tsx
│   ├── comic-library/
│   └── settings/
└── (no-nav)/
    ├── layout.tsx                # Layout without navigation
    ├── movie-library/
    │   └── [movie]/
    │       └── page.tsx
    ├── tv-library/
    │   └── [tv-show]/
    │       └── [episode]/
    │           └── page.tsx
    └── ebook-library/
        └── [ebook]/
            └── page.tsx
```

### Secondary Layout Structure

```typescript
// app/(with-nav)/layout.tsx
export default function WithNavLayout({ children }) {
  return (
    <>
      <Navigation />
      {children}
    </>
  );
}

// app/(no-nav)/layout.tsx
export default function NoNavLayout({ children }) {
  return <>{children}</>;
}
```

### Problems with This Approach

1. **Route Group Complexity**: Requires route groups `(with-nav)` and `(no-nav)`, which can be confusing
2. **Provider Duplication**: Still need providers in root layout, but navigation logic is split
3. **Harder to Maintain**: Navigation changes require updating the layout file
4. **Less Flexible**: Adding a new page type might require restructuring route groups
5. **More Files**: More layout files to manage and understand

---

## Comparison

| Aspect | Conditional Navigation | Secondary Layouts |
|--------|----------------------|-------------------|
| **Files** | 1 layout file | 2+ layout files |
| **Code Duplication** | Minimal | Moderate (providers) |
| **Maintenance** | Single place to update | Multiple places to update |
| **Flexibility** | Easy to add new patterns | Requires route restructuring |
| **Complexity** | Simple conditional logic | Route group organization |
| **Performance** | Slight client-side check | Slight layout nesting overhead |
| **Type Safety** | Full TypeScript support | Full TypeScript support |
| **Route Matching** | Pattern-based (flexible) | File-based (rigid) |

---

## Implementation Details

### Navigation Component

The actual navigation bar (`NavigationBar.tsx`) handles:

1. **Responsive Design**: Different layouts for mobile vs desktop
2. **Navigation Items**: Rendered from `navItems` array in `site-vars.ts`
3. **Theme Toggle**: Integrated theme switcher
4. **Mobile Menu**: Sheet/drawer component for mobile navigation

```typescript
export function Navigation() {
  const isMobile = useMobile();
  
  if (isMobile) {
    // Mobile: Hamburger menu with sheet
    return <MobileNavigation />;
  }
  
  // Desktop: Horizontal navigation bar
  return <DesktopNavigation />;
}
```

### Pathname Matching Logic

The conditional navigation uses regex patterns to match routes:

```typescript
// Movie player: /movie-library/123
const isMoviePlayerPage = pathname?.match(/^\/movie-library\/\d+$/);

// TV episode: /tv-library/tv-show-slug/456
const isTvEpisodePage = pathname?.match(/^\/tv-library\/[^/]+\/\d+$/);

// Ebook reader: /ebook-library/789
const isEbookReaderPage = pathname?.match(/^\/ebook-library\/\d+$/);
```

**Why Regex?**
- Flexible: Can match dynamic route patterns
- Precise: Only matches exact patterns (not list pages)
- Maintainable: Easy to add new patterns

**Alternative Approaches:**
- Array of paths: `['/movie-library/123', ...]` - Not scalable
- String includes: `pathname.includes('/movie-library/')` - Too broad (matches list pages)
- Route groups: File-based - Less flexible

### Client-Side Rendering

The `ConditionalNavigation` component is marked with `"use client"` because:
- `usePathname()` is a client-side hook
- Navigation visibility is determined at runtime
- No server-side rendering needed for this logic

**Impact**: Minimal - the component is small and only runs on route changes.

---

## Trade-offs and Considerations

### Advantages ✅

1. **Simplicity**: One layout, one navigation component, easy to understand
2. **Maintainability**: Changes in one place affect the entire app
3. **Flexibility**: Easy to add new page types or change patterns
4. **Consistency**: Same navigation everywhere (when visible)
5. **Less Boilerplate**: No need for route groups or multiple layouts

### Disadvantages ⚠️

1. **Client-Side Check**: Requires `usePathname()` hook (client component)
2. **Pattern Maintenance**: Regex patterns need to be kept in sync with routes
3. **Slight Overhead**: Small performance cost of checking pathname on each render

### When to Use Conditional Navigation

**Good for:**
- Applications with mostly similar layouts
- When you want to hide/show navigation based on route patterns
- When you want to minimize file structure complexity
- When navigation logic is simple (show/hide)

**Consider Secondary Layouts when:**
- You have fundamentally different layouts (not just navigation)
- You need different providers for different route groups
- You want strict file-based organization
- Navigation logic is complex (different navs for different sections)

---

## Best Practices

### 1. Keep Patterns Maintainable

```typescript
// ✅ Good: Clear, documented patterns
const FULL_SCREEN_PAGE_PATTERNS = [
  /^\/movie-library\/\d+$/,           // Movie player
  /^\/tv-library\/[^/]+\/\d+$/,       // TV episode
  /^\/ebook-library\/\d+$/,           // Ebook reader
];

const isFullScreenPage = FULL_SCREEN_PAGE_PATTERNS.some(
  pattern => pattern.test(pathname || '')
);

// ❌ Bad: Inline, undocumented patterns
if (pathname?.match(/^\/movie-library\/\d+$/) || pathname?.match(/^\/tv-library\/[^/]+\/\d+$/)) {
  return null;
}
```

### 2. Use Constants for Route Patterns

```typescript
// lib/route-patterns.ts
export const ROUTE_PATTERNS = {
  MOVIE_PLAYER: /^\/movie-library\/\d+$/,
  TV_EPISODE: /^\/tv-library\/[^/]+\/\d+$/,
  EBOOK_READER: /^\/ebook-library\/\d+$/,
} as const;

// In ConditionalNavigation:
import { ROUTE_PATTERNS } from '@/lib/route-patterns';

const isFullScreenPage = Object.values(ROUTE_PATTERNS).some(
  pattern => pattern.test(pathname || '')
);
```

### 3. Consider Type Safety

```typescript
// Define route types for better type safety
type FullScreenRoute = 
  | `/movie-library/${number}`
  | `/tv-library/${string}/${number}`
  | `/ebook-library/${number}`;

// Use type guards
function isFullScreenRoute(pathname: string): pathname is FullScreenRoute {
  return ROUTE_PATTERNS.MOVIE_PLAYER.test(pathname) ||
         ROUTE_PATTERNS.TV_EPISODE.test(pathname) ||
         ROUTE_PATTERNS.EBOOK_READER.test(pathname);
}
```

### 4. Document Route Patterns

```typescript
/**
 * Routes that should hide the main navigation bar.
 * These are full-screen media viewing pages where navigation would be distracting.
 * 
 * Patterns:
 * - Movie player: /movie-library/[movieId]
 * - TV episode: /tv-library/[tvShowSlug]/[episodeId]
 * - Ebook reader: /ebook-library/[ebookId]
 */
const FULL_SCREEN_ROUTES = [/* ... */];
```

---

## Future Considerations

### Potential Improvements

1. **Route Configuration File**: Move route patterns to a configuration file for easier maintenance
2. **Type-Safe Routes**: Use Next.js route types for better type safety
3. **Performance Optimization**: Memoize pathname checks if needed
4. **Accessibility**: Ensure navigation hiding doesn't break keyboard navigation
5. **Analytics**: Track which pages hide navigation for UX insights

### When to Refactor

Consider refactoring to secondary layouts if:
- You add more than 5-6 different layout types
- Navigation logic becomes complex (different navs for different sections)
- You need different providers for different route groups
- File-based organization becomes more important than flexibility

---

## Summary

The root layout uses **conditional navigation** instead of secondary layouts because:

1. **Simpler**: One layout file, one navigation component
2. **Maintainable**: Changes in one place
3. **Flexible**: Easy to add new page types
4. **Consistent**: Same navigation everywhere (when visible)
5. **Less Code**: No duplication of providers or navigation logic

The pattern works well for this application because:
- Most pages share the same layout structure
- Only a few pages (media players) need to hide navigation
- Navigation logic is simple (show/hide based on route)
- Flexibility is more important than strict file organization

This approach prioritizes **developer experience** and **maintainability** over strict file-based organization, which is appropriate for a media library application where route patterns are predictable and navigation needs are straightforward.

