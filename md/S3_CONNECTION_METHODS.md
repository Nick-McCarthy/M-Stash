# S3 Connection Methods for Upload Forms

This document explains different methods to connect to AWS S3 for file uploads in the settings pages, compares their security and usability, and provides recommendations for improvement.

## Table of Contents

1. [Current Implementation](#current-implementation)
2. [Connection Methods](#connection-methods)
3. [Method Comparison](#method-comparison)
4. [Recommended Approach](#recommended-approach)
5. [Implementation Guide](#implementation-guide)
6. [Security Best Practices](#security-best-practices)

---

## Current Implementation

### How It Works Now

The application currently uses **Static Access Keys** (Access Key ID and Secret Access Key) stored in environment variables:

```typescript
// Example from src/app/api/settings/manage-ebooks/create-ebook/route.ts
const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});
```

**Environment Variables Required:**
- `S3_ACCESS_KEY_ID` - AWS Access Key ID
- `S3_SECRET_ACCESS_KEY` - AWS Secret Access Key
- `S3_REGION` - AWS Region (defaults to `us-east-1`)
- `S3_BUCKET_NAME` - S3 Bucket Name

### Current Flow

```
User uploads file via form
    ↓
Form submits to API route (e.g., /api/settings/manage-ebooks/create-ebook)
    ↓
API route receives file
    ↓
Server creates S3Client with static credentials
    ↓
Server uploads file directly to S3 using PutObjectCommand
    ↓
Server stores S3 URL in database
    ↓
Returns success response
```

### Problems with Current Approach

1. **Security Risk**: Static credentials stored in environment variables
   - If environment variables leak, credentials are exposed
   - Credentials have long-lived access (until rotated)
   - No automatic rotation

2. **Credential Management**: 
   - Manual credential creation and rotation
   - Credentials must be stored securely in all environments
   - Risk of committing credentials to version control

3. **Limited Flexibility**:
   - All uploads go through server (increases server load)
   - No direct client-to-S3 upload option
   - Server bandwidth used for all file transfers

4. **Scalability Issues**:
   - Large files consume server resources
   - Server must handle file buffering
   - No parallel upload support

---

## Connection Methods

### 1. Static Access Keys (Current Method)

**What it is**: Long-lived AWS Access Key ID and Secret Access Key stored in environment variables.

**How it works**:
```typescript
const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});
```

**Pros:**
- ✅ Simple to implement
- ✅ Works in all environments
- ✅ No additional AWS setup required
- ✅ Easy to test locally

**Cons:**
- ❌ Security risk if credentials leak
- ❌ Manual rotation required
- ❌ Long-lived credentials
- ❌ Must be stored securely in all environments
- ❌ Risk of committing to version control

**Use Case**: Development, small projects, or when other methods aren't available.

**Security Rating**: ⚠️ **Medium Risk**

---

### 2. IAM Roles (Recommended for Production)

**What it is**: AWS IAM roles that provide temporary credentials automatically. The application assumes a role, and AWS provides temporary credentials.

**How it works**:
- On Vercel/AWS Lambda: Use execution role
- On EC2: Use instance profile
- Credentials are automatically provided by AWS

**Implementation**:

```typescript
// No credentials needed - AWS SDK uses default credential provider chain
// which automatically picks up IAM role credentials
const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  // No credentials object - uses IAM role
});
```

**For Vercel Deployment**:

1. Create IAM Role in AWS
2. Attach S3 access policy to role
3. Configure Vercel to use the role (via AWS integration or environment variables)

**Vercel Configuration**:
```bash
# In Vercel dashboard, add AWS integration
# Or set these environment variables:
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/vercel-s3-role
AWS_WEB_IDENTITY_TOKEN_FILE=/var/task/.aws/token
```

**Pros:**
- ✅ **Most Secure**: Credentials are temporary and automatically rotated
- ✅ **No Secret Storage**: No need to store long-lived credentials
- ✅ **Automatic Rotation**: AWS handles credential rotation
- ✅ **Least Privilege**: Role can have minimal permissions
- ✅ **Audit Trail**: All actions logged to CloudTrail
- ✅ **Best Practice**: AWS recommended approach

**Cons:**
- ❌ Requires AWS infrastructure setup
- ❌ More complex initial configuration
- ❌ May not work in all deployment environments
- ❌ Requires AWS account and IAM knowledge

**Use Case**: Production deployments, especially on Vercel, AWS Lambda, or EC2.

**Security Rating**: ✅ **Low Risk (Best)**

---

### 3. Presigned URLs (Recommended for Large Files)

**What it is**: Temporary, signed URLs that allow direct client-to-S3 uploads without exposing credentials.

**How it works**:
1. Client requests upload permission from server
2. Server generates presigned URL with temporary permissions
3. Client uploads directly to S3 using presigned URL
4. Server is notified of completion (optional)

**Implementation**:

**Server-side (API route)**:
```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Create S3 client (using IAM role or static credentials)
const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  // Credentials from IAM role or env vars
});

// API route to generate presigned URL
export async function POST(request: NextRequest) {
  const { fileName, contentType, s3Key } = await request.json();
  
  // Generate presigned URL (valid for 15 minutes)
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: s3Key,
    ContentType: contentType,
  });
  
  const presignedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 900, // 15 minutes
  });
  
  return NextResponse.json({ presignedUrl, s3Key });
}
```

**Client-side (Upload form)**:
```typescript
// 1. Request presigned URL from server
const response = await fetch('/api/settings/manage-ebooks/get-upload-url', {
  method: 'POST',
  body: JSON.stringify({
    fileName: file.name,
    contentType: file.type,
    s3Key: `ebook/${author}/${title}.${extension}`,
  }),
});

const { presignedUrl, s3Key } = await response.json();

// 2. Upload directly to S3
const uploadResponse = await fetch(presignedUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': file.type,
  },
});

if (uploadResponse.ok) {
  // 3. Notify server of successful upload
  await fetch('/api/settings/manage-ebooks/confirm-upload', {
    method: 'POST',
    body: JSON.stringify({ s3Key }),
  });
}
```

**Pros:**
- ✅ **No Server Bandwidth**: Files upload directly to S3
- ✅ **Scalable**: Handles large files efficiently
- ✅ **Secure**: No credentials exposed to client
- ✅ **Temporary**: URLs expire after set time
- ✅ **Flexible**: Can set specific permissions per upload
- ✅ **Parallel Uploads**: Can upload multiple files simultaneously

**Cons:**
- ❌ More complex implementation
- ❌ Requires two API calls (get URL, confirm upload)
- ❌ Client must handle upload directly
- ❌ Need to handle upload failures on client

**Use Case**: Large file uploads, high-traffic applications, or when reducing server load is important.

**Security Rating**: ✅ **Low Risk (Excellent)**

---

### 4. AWS SDK Default Credential Provider Chain

**What it is**: AWS SDK automatically searches for credentials in a specific order.

**Credential Chain Order**:
1. Explicit credentials (in code)
2. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
3. AWS credentials file (`~/.aws/credentials`)
4. IAM role (if running on EC2/Lambda)
5. ECS task role (if running on ECS)
6. Other AWS services

**Implementation**:

```typescript
// No credentials specified - uses default provider chain
const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  // Credentials automatically resolved from chain
});
```

**Pros:**
- ✅ **Flexible**: Works in different environments
- ✅ **Automatic**: Picks up credentials from environment
- ✅ **Development Friendly**: Can use local AWS credentials file
- ✅ **Production Ready**: Falls back to IAM roles in AWS

**Cons:**
- ❌ Less explicit (harder to debug)
- ❌ May pick up wrong credentials if multiple sources exist
- ❌ Still uses static credentials if from env vars

**Use Case**: Development environments, or when you want flexibility across different deployment scenarios.

**Security Rating**: ⚠️ **Depends on credential source**

---

### 5. Temporary Credentials (STS)

**What it is**: Use AWS Security Token Service (STS) to generate temporary credentials with limited permissions.

**How it works**:
1. Application has long-lived credentials (or IAM role)
2. Application calls STS to get temporary credentials
3. Temporary credentials used for S3 operations
4. Credentials expire after set time (default: 1 hour)

**Implementation**:

```typescript
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { S3Client } from "@aws-sdk/client-s3";

// Get temporary credentials
const stsClient = new STSClient({
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    // Use IAM role or static credentials to assume role
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const assumeRoleResponse = await stsClient.send(
  new AssumeRoleCommand({
    RoleArn: "arn:aws:iam::ACCOUNT_ID:role/S3UploadRole",
    RoleSessionName: "upload-session",
    DurationSeconds: 3600, // 1 hour
  })
);

// Use temporary credentials for S3
const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: assumeRoleResponse.Credentials!.AccessKeyId!,
    secretAccessKey: assumeRoleResponse.Credentials!.SecretAccessKey!,
    sessionToken: assumeRoleResponse.Credentials!.SessionToken!,
  },
});
```

**Pros:**
- ✅ **Temporary**: Credentials expire automatically
- ✅ **Limited Scope**: Can restrict to specific S3 operations
- ✅ **Audit Trail**: All actions logged
- ✅ **Rotation**: Credentials automatically rotated

**Cons:**
- ❌ More complex setup
- ❌ Requires STS permissions
- ❌ Additional API call overhead
- ❌ Still need initial credentials to assume role

**Use Case**: When you need temporary credentials with specific permissions, or when using cross-account access.

**Security Rating**: ✅ **Low Risk (Good)**

---

## Method Comparison

| Method | Security | Complexity | Scalability | Use Case |
|--------|----------|------------|-------------|----------|
| **Static Access Keys** | ⚠️ Medium | ✅ Simple | ⚠️ Limited | Development, small projects |
| **IAM Roles** | ✅ Excellent | ⚠️ Medium | ✅ Excellent | Production (Vercel, Lambda, EC2) |
| **Presigned URLs** | ✅ Excellent | ⚠️ Medium | ✅ Excellent | Large files, high traffic |
| **Default Provider Chain** | ⚠️ Varies | ✅ Simple | ✅ Good | Development, flexible deployments |
| **Temporary Credentials (STS)** | ✅ Good | ❌ Complex | ✅ Good | Cross-account, specific permissions |

---

## Recommended Approach

### For Production (Vercel Deployment)

**Primary Method: IAM Roles + Presigned URLs**

1. **Use IAM Roles** for server-side S3 client initialization
   - Most secure
   - Automatic credential rotation
   - No secret storage needed

2. **Use Presigned URLs** for file uploads
   - Reduces server load
   - Better scalability
   - Direct client-to-S3 upload

**Implementation Strategy**:

```typescript
// lib/s3-client.ts - Centralized S3 client
import { S3Client } from "@aws-sdk/client-s3";

// Uses IAM role automatically on Vercel
// Falls back to env vars for local development
export const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  // No credentials - uses default provider chain
  // In production: IAM role
  // In development: Environment variables
});

// lib/s3-presigner.ts - Presigned URL generator
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./s3-client";

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 900 // 15 minutes
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
}
```

### For Development

**Use Default Credential Provider Chain** with local AWS credentials file:

```bash
# ~/.aws/credentials
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

This allows developers to use their own AWS credentials without sharing secrets.

---

## Implementation Guide

### Step 1: Create Centralized S3 Client

**File: `src/lib/s3-client.ts`**

```typescript
import { S3Client } from "@aws-sdk/client-s3";

/**
 * Centralized S3 client that uses the default credential provider chain.
 * 
 * In production (Vercel/AWS):
 * - Automatically uses IAM role credentials
 * 
 * In development:
 * - Uses environment variables (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)
 * - Or AWS credentials file (~/.aws/credentials)
 */
export const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  // Credentials resolved automatically via default provider chain
});

export const BUCKET_NAME = process.env.S3_BUCKET_NAME!;
```

### Step 2: Create Presigned URL Helper

**File: `src/lib/s3-presigner.ts`**

```typescript
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "./s3-client";

export interface PresignedUrlOptions {
  key: string;
  contentType: string;
  expiresIn?: number; // seconds, default 15 minutes
  metadata?: Record<string, string>;
}

/**
 * Generate a presigned URL for direct S3 upload
 */
export async function generatePresignedUploadUrl(
  options: PresignedUrlOptions
): Promise<string> {
  const { key, contentType, expiresIn = 900, metadata } = options;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    Metadata: metadata,
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
}
```

### Step 3: Create Presigned URL API Route

**File: `src/app/api/settings/manage-ebooks/get-upload-url/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUploadUrl } from "@/lib/s3-presigner";
import { z } from "zod";

const RequestSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string(),
  s3Key: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, contentType, s3Key } = RequestSchema.parse(body);
    
    // Validate file type
    const allowedTypes = [
      "application/epub+zip",
      "application/pdf",
      "application/x-mobipocket-ebook",
    ];
    
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }
    
    // Generate presigned URL
    const presignedUrl = await generatePresignedUploadUrl({
      key: s3Key,
      contentType,
      expiresIn: 900, // 15 minutes
    });
    
    return NextResponse.json({
      presignedUrl,
      s3Key,
      expiresIn: 900,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
```

### Step 4: Update Upload Form to Use Presigned URLs

**File: `src/app/settings/manage-ebooks/page.tsx`** (example)

```typescript
const handleUpload = async (file: File, title: string, author: string) => {
  try {
    // 1. Generate S3 key
    const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const sanitizedAuthor = author.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const extension = file.name.split(".").pop();
    const s3Key = `ebook/${sanitizedAuthor}/${sanitizedTitle}.${extension}`;
    
    // 2. Get presigned URL from server
    const urlResponse = await fetch("/api/settings/manage-ebooks/get-upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        s3Key,
      }),
    });
    
    if (!urlResponse.ok) {
      throw new Error("Failed to get upload URL");
    }
    
    const { presignedUrl } = await urlResponse.json();
    
    // 3. Upload directly to S3
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });
    
    if (!uploadResponse.ok) {
      throw new Error("Upload failed");
    }
    
    // 4. Confirm upload with server (save to database)
    const confirmResponse = await fetch("/api/settings/manage-ebooks/create-ebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ebook_title: title,
        ebook_author: author,
        s3_key: s3Key,
      }),
    });
    
    if (!confirmResponse.ok) {
      throw new Error("Failed to save ebook record");
    }
    
    return await confirmResponse.json();
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};
```

### Step 5: Update API Routes to Use Centralized Client

**File: `src/app/api/settings/manage-ebooks/create-ebook/route.ts`** (updated)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ebooks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
// Remove direct S3Client import
// import { s3Client, BUCKET_NAME } from "@/lib/s3-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ebook_title, ebook_author, s3_key } = body;
    
    // File already uploaded via presigned URL
    // Just need to save to database
    
    // Construct public URL
    const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${
      process.env.S3_REGION || "us-east-1"
    }.amazonaws.com/${s3_key}`;
    
    // Check for duplicates
    const existingEbook = await db
      .select()
      .from(ebooks)
      .where(
        and(
          eq(ebooks.ebookTitle, ebook_title),
          eq(ebooks.ebookAuthor, ebook_author)
        )
      )
      .limit(1);
    
    if (existingEbook.length > 0) {
      return NextResponse.json(
        { error: "Ebook already exists" },
        { status: 409 }
      );
    }
    
    // Save to database
    const newEbook = await db
      .insert(ebooks)
      .values({
        ebookTitle: ebook_title,
        ebookAuthor: ebook_author,
        ebookAddress: publicUrl,
      })
      .returning();
    
    return NextResponse.json(newEbook[0], { status: 201 });
  } catch (error) {
    console.error("Error creating ebook:", error);
    return NextResponse.json(
      { error: "Failed to create ebook" },
      { status: 500 }
    );
  }
}
```

---

## Security Best Practices

### 1. Use IAM Roles in Production

**Never use static credentials in production if IAM roles are available.**

```typescript
// ✅ Good: Uses IAM role automatically
const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
});

// ❌ Bad: Hardcoded credentials
const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: "AKIA...", // Never hardcode!
    secretAccessKey: "...",
  },
});
```

### 2. Implement Least Privilege

**IAM role should only have necessary S3 permissions:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### 3. Validate File Types and Sizes

**Always validate on server-side, even with presigned URLs:**

```typescript
const ALLOWED_TYPES = ["application/epub+zip", "application/pdf"];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

if (!ALLOWED_TYPES.includes(contentType)) {
  return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
}

if (fileSize > MAX_FILE_SIZE) {
  return NextResponse.json({ error: "File too large" }, { status: 400 });
}
```

### 4. Use Presigned URLs with Expiration

**Always set reasonable expiration times:**

```typescript
// ✅ Good: 15 minutes
const presignedUrl = await generatePresignedUploadUrl({
  key: s3Key,
  contentType: fileType,
  expiresIn: 900, // 15 minutes
});

// ❌ Bad: Too long (24 hours)
const presignedUrl = await generatePresignedUploadUrl({
  key: s3Key,
  contentType: fileType,
  expiresIn: 86400, // 24 hours - too long!
});
```

### 5. Sanitize S3 Keys

**Prevent path traversal attacks:**

```typescript
function sanitizeS3Key(key: string): string {
  // Remove path traversal attempts
  return key
    .replace(/\.\./g, "") // Remove ..
    .replace(/^\/+/, "") // Remove leading slashes
    .replace(/\/+/g, "/"); // Normalize slashes
}
```

### 6. Enable S3 Bucket Encryption

**Enable server-side encryption:**

```typescript
const command = new PutObjectCommand({
  Bucket: BUCKET_NAME,
  Key: s3Key,
  Body: buffer,
  ServerSideEncryption: "AES256", // or "aws:kms"
});
```

### 7. Use Environment-Specific Configuration

**Different credentials for different environments:**

```typescript
// Development: Use local AWS credentials file
// Production: Use IAM role
// Staging: Use separate IAM role with limited access

const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  // Credentials resolved automatically based on environment
});
```

### 8. Monitor and Log S3 Access

**Enable CloudTrail logging:**

- Log all S3 API calls
- Monitor for unusual access patterns
- Set up alerts for failed authentication attempts

### 9. Rotate Credentials Regularly

**If using static credentials (not recommended for production):**

- Rotate access keys every 90 days
- Use AWS IAM Access Key Last Used report
- Disable unused keys immediately

### 10. Never Commit Credentials

**Use `.env` files and `.gitignore`:**

```bash
# .gitignore
.env
.env.local
.env.production
*.pem
*.key
```

---

## Migration Path

### Phase 1: Centralize S3 Client (Low Risk)

1. Create `src/lib/s3-client.ts`
2. Update all API routes to use centralized client
3. Test thoroughly
4. Deploy

### Phase 2: Add Presigned URL Support (Medium Risk)

1. Create presigned URL API routes
2. Update one upload form to use presigned URLs
3. Test with small files
4. Gradually migrate other forms

### Phase 3: Switch to IAM Roles (High Impact)

1. Create IAM role in AWS
2. Configure Vercel to use IAM role
3. Remove static credentials from environment variables
4. Test in staging first
5. Deploy to production

### Phase 4: Remove Static Credentials (Final Step)

1. Verify IAM role is working
2. Remove `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` from environment
3. Update documentation
4. Monitor for any issues

---

## Summary

### Current State
- ✅ **Working**: Static access keys work for development
- ⚠️ **Security Risk**: Long-lived credentials in environment variables
- ⚠️ **Scalability**: All uploads go through server

### Recommended State
- ✅ **IAM Roles**: For server-side S3 client (most secure)
- ✅ **Presigned URLs**: For file uploads (better scalability)
- ✅ **Centralized Client**: Single source of truth for S3 configuration

### Priority
1. **High**: Centralize S3 client (immediate improvement)
2. **High**: Implement presigned URLs for large files
3. **Medium**: Switch to IAM roles for production
4. **Low**: Remove static credentials after IAM role is verified

The combination of **IAM Roles + Presigned URLs** provides the best balance of security, scalability, and maintainability for a production media library application.

