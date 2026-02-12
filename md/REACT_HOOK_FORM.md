# React Hook Form Guide

This document explains how to use React Hook Form in this project, with practical examples and best practices.

## Table of Contents

1. [What is React Hook Form?](#what-is-react-hook-form)
2. [Why Use React Hook Form?](#why-use-react-hook-form)
3. [Basic Setup](#basic-setup)
4. [Simple Examples](#simple-examples)
5. [Using with Project Components](#using-with-project-components)
6. [Validation](#validation)
7. [Advanced Patterns](#advanced-patterns)
8. [Migration from useState](#migration-from-usestate)

---

## What is React Hook Form?

React Hook Form is a performant, flexible library for building forms in React with minimal re-renders and easy validation.

**Key Features:**
- ✅ Minimal re-renders (only touched fields re-render)
- ✅ Built-in validation
- ✅ Easy integration with UI libraries
- ✅ TypeScript support
- ✅ Small bundle size (~9KB)

---

## Why Use React Hook Form?

### Current Approach (useState)

```typescript
// ❌ Current: Manual state management
const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // Manual validation
  if (!username || !password) {
    setError("All fields required");
    return;
  }
  // Submit...
};
```

**Problems:**
- Manual validation logic
- Multiple useState calls
- Manual error handling
- More boilerplate code

### React Hook Form Approach

```typescript
// ✅ Better: Declarative form management
const { register, handleSubmit, formState: { errors } } = useForm({
  defaultValues: {
    username: "",
    password: "",
  },
});

const onSubmit = async (data) => {
  // data is already validated and typed
  // Submit...
};
```

**Benefits:**
- Automatic validation
- Less boilerplate
- Better performance
- Type-safe with TypeScript

---

## Basic Setup

### Installation

React Hook Form is already installed in this project:

```json
{
  "dependencies": {
    "react-hook-form": "^7.63.0"
  }
}
```

### Basic Import

```typescript
import { useForm } from "react-hook-form";
```

### Project Form Components

This project has a custom form component wrapper (`src/components/ui/form.tsx`) that integrates React Hook Form with shadcn/ui components:

```typescript
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from "@/components/ui/form";
```

---

## Simple Examples

### Example 1: Basic Login Form

**Before (useState):**
```typescript
const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!username || !password) {
    setError("All fields required");
    return;
  }
  // Submit...
};
```

**After (React Hook Form):**
```typescript
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type LoginFormData = {
  username: string;
  password: string;
};

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    // data.username and data.password are already validated
    console.log(data);
    // Submit to API...
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          {...register("username", {
            required: "Username is required",
            minLength: {
              value: 3,
              message: "Username must be at least 3 characters",
            },
          })}
        />
        {errors.username && (
          <p className="text-sm text-destructive">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          })}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}
```

### Example 2: Using Project Form Components

**With shadcn/ui Form components:**
```typescript
import { useForm } from "react-hook-form";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type LoginFormData = {
  username: string;
  password: string;
};

export function LoginForm() {
  const form = useForm<LoginFormData>({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log(data);
    // Submit...
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </Form>
  );
}
```

---

## Using with Project Components

### Example 3: Ebook Upload Form

**Current approach (useState):**
```typescript
const [ebookTitle, setEbookTitle] = useState("");
const [ebookAuthor, setEbookAuthor] = useState("");
const [file, setFile] = useState<File | null>(null);
```

**With React Hook Form:**
```typescript
import { useForm } from "react-hook-form";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type EbookFormData = {
  ebookTitle: string;
  ebookAuthor: string;
  ebookFile: FileList;
};

export function CreateEbookForm() {
  const form = useForm<EbookFormData>({
    defaultValues: {
      ebookTitle: "",
      ebookAuthor: "",
      ebookFile: undefined,
    },
  });

  const onSubmit = async (data: EbookFormData) => {
    const formData = new FormData();
    formData.append("ebook_title", data.ebookTitle);
    formData.append("ebook_author", data.ebookAuthor);
    formData.append("ebook_file", data.ebookFile[0]);

    const response = await fetch("/api/settings/manage-ebooks/create-ebook", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      form.reset(); // Reset form on success
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="ebookTitle"
          rules={{
            required: "Ebook title is required",
            minLength: {
              value: 1,
              message: "Title cannot be empty",
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ebook Title *</FormLabel>
              <FormControl>
                <Input placeholder="Enter ebook title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ebookAuthor"
          rules={{
            required: "Ebook author is required",
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author *</FormLabel>
              <FormControl>
                <Input placeholder="Enter author name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ebookFile"
          rules={{
            required: "Ebook file is required",
            validate: (files) => {
              if (!files || files.length === 0) {
                return "Please select a file";
              }
              const file = files[0];
              const allowedTypes = ["epub", "pdf", "mobi", "azw", "azw3"];
              const extension = file.name.split(".").pop()?.toLowerCase();
              if (!extension || !allowedTypes.includes(extension)) {
                return "Invalid file type. Only EPUB, PDF, MOBI, AZW, and AZW3 are allowed.";
              }
              return true;
            },
          }}
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Ebook File *</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept=".epub,.pdf,.mobi,.azw,.azw3"
                  onChange={(e) => {
                    onChange(e.target.files);
                  }}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Uploading..." : "Create Ebook"}
        </Button>
      </form>
    </Form>
  );
}
```

### Example 4: Select Dropdown

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ComicFormData = {
  comicType: "manga" | "webtoon" | "western";
  status: "ongoing" | "completed" | "hiatus" | "cancelled";
};

export function CreateComicForm() {
  const form = useForm<ComicFormData>({
    defaultValues: {
      comicType: "manga",
      status: "ongoing",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="comicType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comic Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select comic type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="manga">Manga</SelectItem>
                  <SelectItem value="webtoon">Webtoon</SelectItem>
                  <SelectItem value="western">Western</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

### Example 5: Checkboxes (Tags)

```typescript
import { Checkbox } from "@/components/ui/checkbox";

type ComicFormData = {
  tags: string[];
};

export function CreateComicForm() {
  const form = useForm<ComicFormData>({
    defaultValues: {
      tags: [],
    },
  });

  const availableTags = ["action", "comedy", "drama", "romance"];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <FormField
                    key={tag}
                    control={form.control}
                    name="tags"
                    render={({ field: checkboxField }) => {
                      return (
                        <FormItem
                          key={tag}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={checkboxField.value?.includes(tag)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? checkboxField.onChange([
                                      ...checkboxField.value,
                                      tag,
                                    ])
                                  : checkboxField.onChange(
                                      checkboxField.value?.filter(
                                        (value) => value !== tag
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">{tag}</FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

### Example 6: Textarea

```typescript
import { Textarea } from "@/components/ui/textarea";

type ComicFormData = {
  description: string;
};

export function CreateComicForm() {
  const form = useForm<ComicFormData>();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter comic description"
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

---

## Validation

### Built-in Validation Rules

```typescript
const form = useForm({
  defaultValues: {
    email: "",
    age: 0,
    website: "",
  },
});

// In FormField or register()
<FormField
  control={form.control}
  name="email"
  rules={{
    required: "Email is required",
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: "Invalid email address",
    },
  }}
/>

<FormField
  control={form.control}
  name="age"
  rules={{
    required: "Age is required",
    min: {
      value: 18,
      message: "Must be at least 18 years old",
    },
    max: {
      value: 120,
      message: "Invalid age",
    },
  }}
/>

<FormField
  control={form.control}
  name="website"
  rules={{
    pattern: {
      value: /^https?:\/\/.+/,
      message: "Must be a valid URL starting with http:// or https://",
    },
  }}
/>
```

### Custom Validation

```typescript
<FormField
  control={form.control}
  name="password"
  rules={{
    required: "Password is required",
    validate: {
      minLength: (value) =>
        value.length >= 8 || "Password must be at least 8 characters",
      hasUpperCase: (value) =>
        /[A-Z]/.test(value) || "Password must contain an uppercase letter",
      hasNumber: (value) =>
        /[0-9]/.test(value) || "Password must contain a number",
    },
  }}
/>
```

### Async Validation

```typescript
<FormField
  control={form.control}
  name="username"
  rules={{
    required: "Username is required",
    validate: async (value) => {
      // Check if username is available
      const response = await fetch(`/api/check-username?username=${value}`);
      const data = await response.json();
      return data.available || "Username already taken";
    },
  }}
/>
```

### Using Zod for Validation

**Install Zod resolver:**
```bash
npm install @hookform/resolvers zod
```

**Example:**
```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const ebookSchema = z.object({
  ebookTitle: z.string().min(1, "Title is required"),
  ebookAuthor: z.string().min(1, "Author is required"),
  ebookFile: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, "File is required")
    .refine(
      (files) => {
        const file = files[0];
        const allowedTypes = ["epub", "pdf", "mobi"];
        const extension = file.name.split(".").pop()?.toLowerCase();
        return extension && allowedTypes.includes(extension);
      },
      "Invalid file type"
    ),
});

type EbookFormData = z.infer<typeof ebookSchema>;

export function CreateEbookForm() {
  const form = useForm<EbookFormData>({
    resolver: zodResolver(ebookSchema),
    defaultValues: {
      ebookTitle: "",
      ebookAuthor: "",
      ebookFile: undefined,
    },
  });

  // Validation is automatically handled by Zod
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

---

## Advanced Patterns

### Example 7: Conditional Fields

```typescript
type FormData = {
  hasAccount: boolean;
  username?: string;
  email?: string;
};

export function SignupForm() {
  const form = useForm<FormData>({
    defaultValues: {
      hasAccount: false,
    },
  });

  const hasAccount = form.watch("hasAccount");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="hasAccount"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>I already have an account</FormLabel>
            </FormItem>
          )}
        />

        {hasAccount ? (
          <FormField
            control={form.control}
            name="username"
            rules={{ required: "Username is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="email"
            rules={{
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email",
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </form>
    </Form>
  );
}
```

### Example 8: Form Arrays (Dynamic Fields)

```typescript
import { useFieldArray } from "react-hook-form";

type FormData = {
  chapters: { title: string; number: number }[];
};

export function ComicChaptersForm() {
  const form = useForm<FormData>({
    defaultValues: {
      chapters: [{ title: "", number: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "chapters",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <FormField
              control={form.control}
              name={`chapters.${index}.title`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Chapter title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`chapters.${index}.number`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="destructive"
              onClick={() => remove(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ title: "", number: fields.length + 1 })}
        >
          Add Chapter
        </Button>
      </form>
    </Form>
  );
}
```

### Example 9: Reset and Set Values

```typescript
export function CreateEbookForm() {
  const form = useForm<EbookFormData>();

  const onSubmit = async (data: EbookFormData) => {
    const response = await fetch("/api/create-ebook", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.ok) {
      // Reset form after successful submission
      form.reset();
      // Or set specific values
      form.setValue("ebookTitle", "");
      form.setValue("ebookAuthor", "");
    }
  };

  // Pre-fill form with existing data
  const loadEbookData = (ebook: Ebook) => {
    form.reset({
      ebookTitle: ebook.title,
      ebookAuthor: ebook.author,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

### Example 10: Error Handling

```typescript
export function CreateEbookForm() {
  const form = useForm<EbookFormData>();

  const onSubmit = async (data: EbookFormData) => {
    try {
      const response = await fetch("/api/create-ebook", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Set form-level error
        form.setError("root", {
          type: "server",
          message: error.message || "Failed to create ebook",
        });
        
        // Or set field-specific errors
        if (error.field === "title") {
          form.setError("ebookTitle", {
            type: "server",
            message: error.message,
          });
        }
        
        return;
      }

      form.reset();
    } catch (error) {
      form.setError("root", {
        type: "server",
        message: "An unexpected error occurred",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Display root error */}
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

---

## Migration from useState

### Step-by-Step Migration

**Step 1: Replace useState with useForm**

```typescript
// Before
const [title, setTitle] = useState("");
const [author, setAuthor] = useState("");

// After
const form = useForm({
  defaultValues: {
    title: "",
    author: "",
  },
});
```

**Step 2: Replace onChange handlers**

```typescript
// Before
<Input
  value={title}
  onChange={(e) => setTitle(e.target.value)}
/>

// After (with register)
<Input {...register("title")} />

// Or (with FormField)
<FormField
  control={form.control}
  name="title"
  render={({ field }) => <Input {...field} />}
/>
```

**Step 3: Replace onSubmit handler**

```typescript
// Before
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // Manual validation
  if (!title || !author) return;
  // Submit...
};

// After
const onSubmit = async (data: FormData) => {
  // data is already validated
  // Submit...
};

// In JSX
<form onSubmit={form.handleSubmit(onSubmit)}>
```

**Step 4: Add validation**

```typescript
// Add validation rules
<FormField
  control={form.control}
  name="title"
  rules={{
    required: "Title is required",
    minLength: {
      value: 1,
      message: "Title cannot be empty",
    },
  }}
  render={({ field }) => <Input {...field} />}
/>
```

**Step 5: Replace error handling**

```typescript
// Before
{error && <p>{error}</p>}

// After
<FormMessage /> // Automatically shows field errors
```

### Complete Migration Example

**Before:**
```typescript
export function CreateEbookForm() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title || !author || !file) {
      setError("All fields are required");
      return;
    }

    const formData = new FormData();
    formData.append("ebook_title", title);
    formData.append("ebook_author", author);
    formData.append("ebook_file", file);

    const response = await fetch("/api/create-ebook", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      setError("Failed to create ebook");
      return;
    }

    // Reset
    setTitle("");
    setAuthor("");
    setFile(null);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p>{error}</p>}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Input
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
      />
      <Input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <Button type="submit">Create</Button>
    </form>
  );
}
```

**After:**
```typescript
import { useForm } from "react-hook-form";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormField,
} from "@/components/ui/form";

type EbookFormData = {
  title: string;
  author: string;
  file: FileList;
};

export function CreateEbookForm() {
  const form = useForm<EbookFormData>({
    defaultValues: {
      title: "",
      author: "",
      file: undefined,
    },
  });

  const onSubmit = async (data: EbookFormData) => {
    const formData = new FormData();
    formData.append("ebook_title", data.title);
    formData.append("ebook_author", data.author);
    formData.append("ebook_file", data.file[0]);

    const response = await fetch("/api/create-ebook", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      form.setError("root", {
        message: "Failed to create ebook",
      });
      return;
    }

    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {form.formState.errors.root && (
          <Alert variant="destructive">
            {form.formState.errors.root.message}
          </Alert>
        )}

        <FormField
          control={form.control}
          name="title"
          rules={{ required: "Title is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="author"
          rules={{ required: "Author is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="file"
          rules={{
            required: "File is required",
            validate: (files) =>
              files.length > 0 || "Please select a file",
          }}
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>File</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept=".epub,.pdf"
                  onChange={(e) => onChange(e.target.files)}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Creating..." : "Create"}
        </Button>
      </form>
    </Form>
  );
}
```

---

## Best Practices

### 1. Use TypeScript

Always define form data types:

```typescript
type FormData = {
  title: string;
  author: string;
};

const form = useForm<FormData>();
```

### 2. Set Default Values

```typescript
const form = useForm({
  defaultValues: {
    title: "",
    author: "",
  },
});
```

### 3. Use Form Components for Consistency

Use the project's Form components for consistent styling and error handling:

```typescript
<Form {...form}>
  <FormField
    control={form.control}
    name="title"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Title</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

### 4. Validate on Submit, Not on Change

By default, React Hook Form validates on submit. This is better for UX:

```typescript
const form = useForm({
  mode: "onSubmit", // Default - validates on submit
  // mode: "onChange", // Validates on every change (can be annoying)
  // mode: "onBlur", // Validates when field loses focus
});
```

### 5. Handle Loading States

```typescript
<Button
  type="submit"
  disabled={form.formState.isSubmitting}
>
  {form.formState.isSubmitting ? "Submitting..." : "Submit"}
</Button>
```

### 6. Reset Form After Success

```typescript
const onSubmit = async (data: FormData) => {
  const response = await fetch("/api/submit", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (response.ok) {
    form.reset(); // Clear form
  }
};
```

### 7. Use watch() for Conditional Rendering

```typescript
const hasAccount = form.watch("hasAccount");

{hasAccount && (
  <FormField name="username" />
)}
```

### 8. Access Form State

```typescript
const {
  isDirty, // Form has been modified
  isValid, // Form is valid
  isSubmitting, // Form is submitting
  errors, // All errors
  touchedFields, // Fields that have been touched
} = form.formState;
```

---

## Common Patterns in This Project

### Pattern 1: File Upload

```typescript
<FormField
  control={form.control}
  name="file"
  rules={{
    required: "File is required",
    validate: (files) => {
      if (!files || files.length === 0) return "Please select a file";
      const file = files[0];
      // Validate file type, size, etc.
      return true;
    },
  }}
  render={({ field: { value, onChange, ...field } }) => (
    <FormItem>
      <FormLabel>File</FormLabel>
      <FormControl>
        <Input
          type="file"
          onChange={(e) => onChange(e.target.files)}
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Pattern 2: Multiple Checkboxes

```typescript
<FormField
  control={form.control}
  name="tags"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Tags</FormLabel>
      {availableTags.map((tag) => (
        <FormField
          key={tag}
          control={form.control}
          name="tags"
          render={({ field: checkboxField }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox
                  checked={checkboxField.value?.includes(tag)}
                  onCheckedChange={(checked) => {
                    const current = checkboxField.value || [];
                    checkboxField.onChange(
                      checked
                        ? [...current, tag]
                        : current.filter((t) => t !== tag)
                    );
                  }}
                />
              </FormControl>
              <FormLabel>{tag}</FormLabel>
            </FormItem>
          )}
        />
      ))}
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Summary

React Hook Form provides:

- ✅ **Less Boilerplate**: No need for multiple useState calls
- ✅ **Automatic Validation**: Built-in validation with clear error messages
- ✅ **Better Performance**: Minimal re-renders
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Easy Integration**: Works seamlessly with project's Form components

**Key Takeaways:**

1. Use `useForm()` hook to initialize form
2. Use `FormField` component for each input (with project's Form components)
3. Add validation rules in `rules` prop
4. Access form state via `form.formState`
5. Handle submission with `form.handleSubmit(onSubmit)`

**Next Steps:**

- Start migrating simple forms (login, setup) to React Hook Form
- Gradually migrate complex forms (ebook upload, comic creation)
- Add validation rules as you migrate
- Use Zod for complex validation schemas

