# How epub.js Extracts Navigation from EPUB Files

## 📚 EPUB File Structure

An EPUB file is essentially a ZIP archive containing:

```
your-book.epub (ZIP archive)
├── META-INF/
│   └── container.xml          ← Points to the OPF file location
├── OEBPS/ (or similar folder)
│   ├── content.opf            ← The "spine" - defines reading order and navigation
│   ├── nav.xhtml              ← HTML5 navigation document (EPUB 3)
│   ├── toc.ncx                ← NCX navigation (EPUB 2, or fallback)
│   └── text/
│       ├── titlepage.xhtml
│       ├── act-1.xhtml
│       ├── act-2.xhtml
│       └── ...
```

## 🔍 The Navigation Extraction Process

### Step 1: epub.js Loads the EPUB
When you call `new Book(ebookUrl)`, epub.js:

1. **Downloads the EPUB** from your proxy endpoint (`/api/ebook-library/2/proxy`)
2. **Unzips it in memory** using JSZip
3. **Reads `META-INF/container.xml`** to find the OPF file location:
   ```xml
   <container>
     <rootfiles>
       <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
     </rootfiles>
   </container>
   ```

### Step 2: Reading the OPF (Package) File
The OPF file (`content.opf`) contains:

```xml
<package>
  <manifest>
    <!-- Lists all files in the EPUB -->
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="titlepage" href="text/titlepage.xhtml" media-type="application/xhtml+xml"/>
    <item id="act1" href="text/act-1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  
  <spine>
    <!-- Defines the reading order -->
    <itemref idref="titlepage"/>
    <itemref idref="act1"/>
  </spine>
</package>
```

### Step 3: Reading the Navigation Document

epub.js looks for navigation in this order:

#### Option A: EPUB 3 Navigation Document (`nav.xhtml`)
This is an HTML5 file with a `<nav>` element:

```html
<nav epub:type="toc">
  <ol>
    <li><a href="text/titlepage.xhtml">Titlepage</a></li>
    <li><a href="text/imprint.xhtml">Imprint</a></li>
    <li>
      <a href="text/halftitlepage.xhtml">Julius Caesar</a>
      <ol>
        <li>
          <a href="text/act-1.xhtml">Act I</a>
          <ol>
            <li><a href="text/act-1.xhtml#scene-1-1">Scene I</a></li>
            <li><a href="text/act-1.xhtml#scene-1-2">Scene II</a></li>
          </ol>
        </li>
      </ol>
    </li>
  </ol>
</nav>
```

**This is what creates your nested structure!** The `<ol>` lists create the parent-child relationships:
- "Julius Caesar" is a parent
  - "Act I" is a child of "Julius Caesar"
    - "Scene I" is a child of "Act I"

#### Option B: EPUB 2 NCX File (`toc.ncx`)
Older format using XML:

```xml
<ncx>
  <navMap>
    <navPoint>
      <navLabel><text>Titlepage</text></navLabel>
      <content src="text/titlepage.xhtml"/>
      <navPoint>
        <navLabel><text>Scene I</text></navLabel>
        <content src="text/act-1.xhtml#scene-1-1"/>
      </navPoint>
    </navPoint>
  </navMap>
</ncx>
```

### Step 4: epub.js Parses the Navigation

In your code at line 239:
```typescript
const nav = await newBook.navigation;
```

This returns an object with:
```typescript
{
  toc: NavItem[],           // Table of Contents (hierarchical)
  landmarks: NavItem[],     // Semantic navigation points
  pageList: NavItem[],      // Page numbers (if available)
  links: NavItem[]          // Internal links
}
```

### Step 5: The `NavItem` Structure

Each `NavItem` looks like:
```typescript
{
  id: "unique-id",
  label: "Titlepage",           // What you see in the UI
  href: "text/titlepage.xhtml", // Path to the content file
  subitems: [                   // Nested chapters (creates hierarchy)
    {
      id: "...",
      label: "Act I",
      href: "text/act-1.xhtml",
      subitems: [
        {
          label: "Scene I",
          href: "text/act-1.xhtml#scene-1-1"  // Note the #anchor
        }
      ]
    }
  ]
}
```

## 🎯 Understanding Your Console Output

Your console output shows the parsed TOC structure:

```
"Titlepage": "text/titlepage.xhtml"
"Imprint": "text/imprint.xhtml"
"Dramatis Personae": "text/dramatis-personae.xhtml"
"Julius Caesar": "text/halftitlepage.xhtml"
  "Act I": "text/act-1.xhtml"              ← Indented = nested under "Julius Caesar"
    "Scene I": "text/act-1.xhtml#scene-1-1"  ← Indented = nested under "Act I"
    "Scene II": "text/act-1.xhtml#scene-1-2"
```

**Breaking it down:**
- The **label** ("Titlepage", "Act I", etc.) comes from the `<a>` text or `<navLabel>` in the navigation document
- The **href** ("text/titlepage.xhtml") comes from the `href` attribute
- The **indentation** shows the hierarchy from nested `<ol>` or `<navPoint>` elements
- The **#scene-1-1** is an HTML anchor/fragment - it points to a specific section within the XHTML file

## 🔗 How Hrefs Work

1. **File paths**: `"text/act-1.xhtml"` → Points to a file in the EPUB archive
2. **Fragments**: `"text/act-1.xhtml#scene-1-1"` → Points to an element with `id="scene-1-1"` in that file

When you navigate to a chapter, epub.js:
1. Reads the href (e.g., `"text/act-1.xhtml"`)
2. Requests it from your proxy: `/api/ebook-library/2/text/act-1.xhtml`
3. Your route extracts it from the ZIP and serves it
4. If there's a fragment (`#scene-1-1`), epub.js scrolls to that element

## 📝 Key Takeaways

1. **EPUB is a ZIP** - epub.js unzips it and reads XML/HTML files inside
2. **Navigation comes from `nav.xhtml` or `toc.ncx`** - parsed from the EPUB's navigation document
3. **Hierarchy comes from nesting** - nested `<ol>` lists create parent-child relationships
4. **Hrefs are relative paths** - they point to files within the EPUB archive
5. **Fragments (#anchor)** - allow jumping to specific sections within a file

## 🔍 Your Code's Role

In your implementation:
- Line 239: `const nav = await newBook.navigation` - Gets parsed navigation
- Line 449-456: Recursively logs nested items with indentation
- The indentation you see (`"  "` repeat depth) visually represents the hierarchy

The actual hierarchy comes from the EPUB's navigation document structure, which epub.js has already parsed for you!

