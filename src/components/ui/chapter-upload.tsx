"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  Folder,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileImage,
  Bug,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChapterUploadProps {
  comicId: string;
  comicTitle: string;
  comicType: string;
  onUploadComplete: (result: UploadResult) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
  files: File[];
  validationErrors: string[];
}

interface UploadResult {
  uploadedFiles: string[];
  chapterNumber: string;
  totalImages: number;
}

interface ChapterFolder {
  name: string;
  files: File[];
  isValid: boolean;
  errors: string[];
}

export function ChapterUpload({
  comicId,
  comicTitle,
  comicType,
  onUploadComplete,
  onUploadError,
  disabled = false,
  className,
}: ChapterUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false,
    files: [],
    validationErrors: [],
  });

  // Log component initialization
  React.useEffect(() => {
    console.log("🔧 [ChapterUpload] Component initialized:", {
      comicId,
      comicTitle,
      comicType,
      disabled,
    });
  }, [comicId, comicTitle, comicType, disabled]);

  const validateChapterStructure = useCallback(
    (files: File[]): ChapterFolder[] => {
      const chapterFolders: ChapterFolder[] = [];
      const folderMap = new Map<string, File[]>();

      // Group files by their folder path
      files.forEach((file) => {
        const pathParts = file.webkitRelativePath?.split("/") || [file.name];
        if (pathParts.length >= 2) {
          const folderName = pathParts[0];
          if (!folderMap.has(folderName)) {
            folderMap.set(folderName, []);
          }
          folderMap.get(folderName)!.push(file);
        }
      });

      // Validate each folder
      folderMap.forEach((files, folderName) => {
        const errors: string[] = [];
        let isValid = true;

        // Check folder naming pattern - must contain a number (chapter number)
        const chapterPattern = /\d+/;
        if (!chapterPattern.test(folderName)) {
          errors.push(`Folder "${folderName}" must contain a chapter number`);
          isValid = false;
        }

        // Check if files are images
        const imageFiles = files.filter(
          (file) =>
            file.type.startsWith("image/") &&
            /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
        );

        if (imageFiles.length === 0) {
          errors.push(`No valid image files found in "${folderName}"`);
          isValid = false;
        }

        // Check file naming pattern - must contain a number (order number)
        const invalidFiles = imageFiles.filter((file) => {
          const fileName = file.name.split(".")[0];
          return !/\d+/.test(fileName);
        });

        if (invalidFiles.length > 0) {
          errors.push(
            `Files in "${folderName}" must contain order numbers (e.g., page01.jpg, img_02.png, etc.)`
          );
          isValid = false;
        }

        chapterFolders.push({
          name: folderName,
          files: imageFiles,
          isValid,
          errors,
        });
      });

      return chapterFolders;
    },
    []
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      console.log("📁 [ChapterUpload] Files dropped:", {
        accepted: acceptedFiles.length,
        rejected: rejectedFiles.length,
        disabled,
        comicId,
        comicTitle,
        comicType,
      });

      if (disabled) {
        console.warn("⚠️ [ChapterUpload] Component is disabled, ignoring drop");
        return;
      }

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        console.error("❌ [ChapterUpload] Rejected files:", rejectedFiles);
        const rejection = rejectedFiles[0];
        let errorMessage = "File upload failed";

        if (rejection.errors) {
          const error = rejection.errors[0];
          console.error("❌ [ChapterUpload] Rejection error:", error);
          if (error.code === "file-invalid-type") {
            errorMessage = "Please select image files (JPG, PNG, GIF, WebP)";
          } else if (error.code === "file-too-large") {
            errorMessage = "File size must be less than 10MB";
          } else {
            errorMessage = error.message;
          }
        }

        setUploadState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        onUploadError(errorMessage);
        return;
      }

      console.log(
        "✅ [ChapterUpload] Accepted files:",
        acceptedFiles.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
          webkitRelativePath: f.webkitRelativePath,
        }))
      );

      // Validate chapter structure
      const chapterFolders = validateChapterStructure(acceptedFiles);
      console.log(
        "📋 [ChapterUpload] Chapter folders validated:",
        chapterFolders.map((f) => ({
          name: f.name,
          fileCount: f.files.length,
          isValid: f.isValid,
          errors: f.errors,
        }))
      );

      const allValid = chapterFolders.every((folder) => folder.isValid);
      const validationErrors = chapterFolders.flatMap(
        (folder) => folder.errors
      );

      console.log("✅ [ChapterUpload] Validation result:", {
        allValid,
        validationErrors: validationErrors.length,
        totalFolders: chapterFolders.length,
        totalFiles: acceptedFiles.length,
      });

      setUploadState((prev) => ({
        ...prev,
        files: acceptedFiles,
        validationErrors,
        error: allValid ? null : "Chapter structure validation failed",
        success: false,
      }));

      if (!allValid) {
        console.error(
          "❌ [ChapterUpload] Validation failed:",
          validationErrors
        );
        onUploadError("Please fix the validation errors before uploading");
      } else {
        console.log(
          "✅ [ChapterUpload] All files validated successfully, ready for upload"
        );
      }
    },
    [
      disabled,
      validateChapterStructure,
      onUploadError,
      comicId,
      comicTitle,
      comicType,
    ]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB per file
    multiple: true,
    disabled: disabled || uploadState.isUploading,
    // Let react-dropzone handle directory drag/drop natively
    // Only use custom handler for click-to-browse with directories
    getFilesFromEvent: async (event) => {
      console.log("📂 [ChapterUpload] getFilesFromEvent called");

      // For file input (click to browse), react-dropzone handles directories automatically
      // and preserves webkitRelativePath, so we can just return the default behavior
      const changeEvent = event as React.ChangeEvent<HTMLInputElement>;
      if (changeEvent.target?.files) {
        const files = Array.from(changeEvent.target.files);
        console.log("📂 [ChapterUpload] File input detected:", {
          fileCount: files.length,
          files: files.map((f) => ({
            name: f.name,
            path: f.webkitRelativePath || f.name,
            size: f.size,
          })),
        });
        return files;
      }

      // For drag events, use default react-dropzone behavior if possible
      // Otherwise handle manually
      const dragEvent = event as DragEvent;

      // Helper function to recursively read directory entries
      const readDirectoryEntry = async (
        directoryEntry: any,
        basePath: string = ""
      ): Promise<File[]> => {
        const files: File[] = [];
        const dirReader = directoryEntry.createReader();

        return new Promise((resolve, reject) => {
          let pendingReads = 0;
          let allEntriesRead = false;

          const readEntries = (): void => {
            pendingReads++;
            dirReader.readEntries(
              async (entries: any[]) => {
                pendingReads--;

                if (entries.length === 0) {
                  allEntriesRead = true;
                } else {
                  allEntriesRead = false;
                  for (const entry of entries) {
                    const fullPath = basePath
                      ? `${basePath}/${entry.name}`
                      : entry.name;

                    if (entry.isDirectory) {
                      console.log(
                        `📁 [ChapterUpload] Reading subdirectory: ${fullPath}`
                      );
                      const subFiles = await readDirectoryEntry(
                        entry,
                        fullPath
                      );
                      files.push(...subFiles);
                    } else {
                      console.log(
                        `📄 [ChapterUpload] Reading file: ${fullPath}`
                      );
                      try {
                        const file = await new Promise<File>(
                          (resolveFile, rejectFile) => {
                            entry.file(
                              (file: File) => {
                                // Preserve the path structure for validation
                                Object.defineProperty(
                                  file,
                                  "webkitRelativePath",
                                  {
                                    writable: true,
                                    value: fullPath,
                                  }
                                );
                                resolveFile(file);
                              },
                              (error: any) => {
                                console.error(
                                  `❌ [ChapterUpload] Error reading file ${fullPath}:`,
                                  error
                                );
                                rejectFile(error);
                              }
                            );
                          }
                        );
                        files.push(file);
                      } catch (error) {
                        console.error(
                          `❌ [ChapterUpload] Failed to read file ${fullPath}:`,
                          error
                        );
                      }
                    }
                  }
                }

                // Continue reading if there are more entries or if we haven't finished
                if (!allEntriesRead || pendingReads > 0) {
                  readEntries();
                } else if (pendingReads === 0) {
                  resolve(files);
                }
              },
              (error: any) => {
                console.error(
                  "❌ [ChapterUpload] Error reading directory:",
                  error
                );
                reject(error);
              }
            );
          };

          readEntries();
        });
      };

      // Handle drag and drop
      if (dragEvent.dataTransfer?.items) {
        const files: File[] = [];
        const items = dragEvent.dataTransfer.items;
        console.log("📂 [ChapterUpload] Extracted items:", {
          itemCount: items.length,
          source: "drag",
          items: Array.from(items).map((item: any) => ({
            kind: item.kind,
            type: item.type,
          })),
        });
        for (let i = 0; i < dragEvent.dataTransfer.items.length; i++) {
          const item = dragEvent.dataTransfer.items[i];
          const entry = item.webkitGetAsEntry?.();

          console.log(`📂 [ChapterUpload] Processing item ${i}:`, {
            kind: item.kind,
            type: item.type,
            isFile: entry && !entry.isDirectory,
            isDirectory: entry && entry.isDirectory,
            name: entry?.name,
          });

          if (entry) {
            if (entry.isDirectory) {
              // Normalize directory name (remove leading/trailing slashes)
              const dirName = entry.name.replace(/^\/+|\/+$/g, "");
              console.log(
                `📁 [ChapterUpload] Processing directory: "${entry.name}" (normalized: "${dirName}")`
              );
              const dirFiles = await readDirectoryEntry(entry, dirName);
              console.log(
                `📁 [ChapterUpload] Found ${dirFiles.length} files in directory "${dirName}"`
              );
              if (dirFiles.length === 0) {
                console.warn(
                  `⚠️ [ChapterUpload] No files found in directory "${dirName}" - check directory structure`
                );
              }
              files.push(...dirFiles);
            } else {
              console.log(`📄 [ChapterUpload] Processing file: ${entry.name}`);
              try {
                const file = await new Promise<File>((resolve, reject) => {
                  (entry as any).file(
                    (file: File) => {
                      Object.defineProperty(file, "webkitRelativePath", {
                        writable: true,
                        value: entry.name,
                      });
                      resolve(file);
                    },
                    (error: any) => {
                      console.error(
                        `❌ [ChapterUpload] Error reading file ${entry.name}:`,
                        error
                      );
                      reject(error);
                    }
                  );
                });
                files.push(file);
              } catch (error) {
                console.error(
                  `❌ [ChapterUpload] Failed to process file ${entry.name}:`,
                  error
                );
              }
            }
          } else if (item.kind === "file") {
            // Fallback: try to get as file
            const file = item.getAsFile();
            if (file) {
              console.log(`📄 [ChapterUpload] Got file directly: ${file.name}`);
              files.push(file);
            } else {
              console.warn(
                `⚠️ [ChapterUpload] Could not get file from item, kind: ${item.kind}, type: ${item.type}`
              );
            }
          } else {
            console.warn(
              `⚠️ [ChapterUpload] Unknown item type, kind: ${item.kind}, type: ${item.type}`
            );
          }
        }

        console.log(
          `✅ [ChapterUpload] Total files extracted: ${files.length}`,
          files.map((f) => ({
            name: f.name,
            path: (f as any).webkitRelativePath,
            size: f.size,
          }))
        );

        return files;
      }

      // Return empty array if no files found
      console.warn("⚠️ [ChapterUpload] No files found in event");
      return [];
    },
  });

  const uploadToS3 = async (files: File[]) => {
    console.log("🚀 [ChapterUpload] Starting upload process...");
    console.log("📦 [ChapterUpload] Upload details:", {
      totalFiles: files.length,
      comicId,
      comicTitle,
      comicType,
    });

    const chapterFolders = validateChapterStructure(files);
    console.log(
      "📁 [ChapterUpload] Uploading folders:",
      chapterFolders.map((f) => ({
        name: f.name,
        fileCount: f.files.length,
        isValid: f.isValid,
      }))
    );

    const uploadedFiles: string[] = [];

    setUploadState((prev) => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
    }));

    try {
      // Pre-check for existing chapters
      const chapterNumbers = chapterFolders
        .map((folder) => {
          const chapterMatch = folder.name.match(/(\d+)/);
          return chapterMatch ? chapterMatch[1] : null;
        })
        .filter(Boolean);

      console.log(
        "🔍 [ChapterUpload] Checking for existing chapters:",
        chapterNumbers
      );

      if (chapterNumbers.length > 0) {
        console.log(
          `🔍 [ChapterUpload] Checking chapters API: /api/comic-library/${comicId}/check-chapters`
        );
        const checkResponse = await fetch(
          `/api/comic-library/${comicId}/check-chapters`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chapterNumbers }),
          }
        );

        console.log("🔍 [ChapterUpload] Chapter check response:", {
          status: checkResponse.status,
          ok: checkResponse.ok,
        });

        if (checkResponse.ok) {
          const existingChapters = await checkResponse.json();
          console.log(
            "🔍 [ChapterUpload] Existing chapters:",
            existingChapters
          );
          if (existingChapters.length > 0) {
            const error = `Chapters already exist: ${existingChapters.join(
              ", "
            )}`;
            console.error("❌ [ChapterUpload]", error);
            throw new Error(error);
          }
        } else {
          console.warn(
            "⚠️ [ChapterUpload] Chapter check failed, proceeding anyway"
          );
        }
      }
      let completedUploads = 0;
      const totalFiles = files.length;

      console.log("📤 [ChapterUpload] Starting file uploads...", {
        totalFolders: chapterFolders.length,
        totalFiles,
      });

      for (const folder of chapterFolders) {
        if (!folder.isValid) {
          console.warn(
            `⚠️ [ChapterUpload] Skipping invalid folder: ${folder.name}`
          );
          continue;
        }

        // Extract chapter number from folder name
        const chapterMatch = folder.name.match(/(\d+)/);
        const chapterNumber = chapterMatch ? chapterMatch[1] : "unknown";
        console.log(
          `📤 [ChapterUpload] Uploading folder: ${folder.name} (Chapter ${chapterNumber})`
        );

        for (const file of folder.files) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("comicId", comicId);
          formData.append("comicTitle", comicTitle);
          formData.append("comicType", comicType);
          formData.append("chapterNumber", chapterNumber);
          formData.append("imageOrder", file.name.split(".")[0]);

          console.log(
            `📤 [ChapterUpload] Uploading file: ${file.name} (${(
              file.size / 1024
            ).toFixed(2)}KB)`
          );

          const response = await fetch(
            "/api/settings/manage-comics/create-chapter",
            {
              method: "POST",
              body: formData,
            }
          );

          console.log(`📤 [ChapterUpload] Upload response for ${file.name}:`, {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText,
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(
              `❌ [ChapterUpload] Upload failed for ${file.name}:`,
              errorData
            );
            if (response.status === 409) {
              // Conflict - chapter or image already exists
              const error = `Conflict: ${errorData.error}`;
              console.error("❌ [ChapterUpload]", error);
              throw new Error(error);
            }
            const error = errorData.error || "Upload failed";
            console.error("❌ [ChapterUpload]", error);
            throw new Error(error);
          }

          const result = await response.json();
          console.log(
            `✅ [ChapterUpload] File uploaded successfully: ${file.name}`,
            {
              url: result.url,
              key: result.key,
            }
          );
          uploadedFiles.push(result.url);

          completedUploads++;
          const progress = Math.round((completedUploads / totalFiles) * 100);
          console.log(
            `📊 [ChapterUpload] Upload progress: ${progress}% (${completedUploads}/${totalFiles})`
          );
          setUploadState((prev) => ({
            ...prev,
            progress,
          }));
        }
      }

      console.log("✅ [ChapterUpload] All files uploaded successfully!", {
        totalUploaded: uploadedFiles.length,
        chapterFolders: chapterFolders.map((f) => f.name),
      });

      setUploadState((prev) => ({
        ...prev,
        progress: 100,
        success: true,
        isUploading: false,
      }));

      const result = {
        uploadedFiles,
        chapterNumber: chapterFolders[0]?.name || "unknown",
        totalImages: uploadedFiles.length,
      };
      console.log(
        "✅ [ChapterUpload] Upload complete, calling onUploadComplete:",
        result
      );
      onUploadComplete(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      console.error("❌ [ChapterUpload] Upload failed:", error);
      console.error("❌ [ChapterUpload] Error details:", {
        message: errorMessage,
        error,
        stack: error instanceof Error ? error.stack : undefined,
      });

      setUploadState((prev) => ({
        ...prev,
        error: errorMessage,
        isUploading: false,
        progress: 0,
      }));
      onUploadError(errorMessage);
    }
  };

  const handleUpload = () => {
    if (
      uploadState.files.length > 0 &&
      uploadState.validationErrors.length === 0
    ) {
      uploadToS3(uploadState.files);
    }
  };

  const handleReset = () => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      success: false,
      files: [],
      validationErrors: [],
    });
  };

  const chapterFolders = validateChapterStructure(uploadState.files);
  const [showDebug, setShowDebug] = useState(false);

  // Calculate debug info
  const debugInfo = {
    disabled,
    comicId,
    comicTitle,
    comicType,
    filesCount: uploadState.files.length,
    chapterFoldersCount: chapterFolders.length,
    isValid: chapterFolders.every((f) => f.isValid),
    validationErrors: uploadState.validationErrors.length,
    isUploading: uploadState.isUploading,
    progress: uploadState.progress,
    success: uploadState.success,
    error: uploadState.error,
    state: uploadState,
    chapterFolders: chapterFolders.map((f) => ({
      name: f.name,
      fileCount: f.files.length,
      isValid: f.isValid,
      errors: f.errors,
    })),
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Status Summary - Always Visible */}
      {(uploadState.files.length > 0 ||
        uploadState.isUploading ||
        uploadState.error) && (
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {uploadState.isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="font-medium">
                      Uploading... {uploadState.progress}%
                    </span>
                  </>
                ) : uploadState.success ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-green-600 dark:text-green-400">
                      Upload Complete
                    </span>
                  </>
                ) : uploadState.error ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive">Error</span>
                  </>
                ) : uploadState.files.length > 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">
                      Ready: {chapterFolders.length} folder(s),{" "}
                      {uploadState.files.length} file(s)
                    </span>
                  </>
                ) : null}
              </div>
              {uploadState.error && (
                <span className="text-xs text-destructive truncate max-w-md">
                  {uploadState.error}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Panel */}
      {process.env.NODE_ENV === "development" && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bug className="h-4 w-4" />
              <span>Debug Info</span>
              {showDebug ? (
                <ChevronUp className="h-4 w-4 ml-auto" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-auto" />
              )}
            </button>
            {showDebug && (
              <div className="mt-4 space-y-2">
                <div className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-96">
                  <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Files:</span>{" "}
                    {uploadState.files.length}
                  </div>
                  <div>
                    <span className="font-medium">Folders:</span>{" "}
                    {chapterFolders.length}
                  </div>
                  <div>
                    <span className="font-medium">Valid:</span>{" "}
                    {chapterFolders.every((f) => f.isValid) ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Progress:</span>{" "}
                    {uploadState.progress}%
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <div className="space-y-2">
        <Label>Chapter Folders</Label>
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 relative overflow-hidden",
            isDragActive
              ? "border-primary bg-primary/10 dark:bg-primary/20 scale-[1.02] shadow-2xl ring-4 ring-primary/30 dark:ring-primary/40"
              : uploadState.files.length > 0 &&
                uploadState.validationErrors.length === 0 &&
                !uploadState.success
              ? "border-green-500 bg-green-50 dark:bg-green-950/30 dark:border-green-600"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 dark:border-muted-foreground/40 dark:hover:border-muted-foreground/60",
            disabled || uploadState.isUploading
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer"
          )}
        >
          {/* Animated background overlay when dragging */}
          {isDragActive && (
            <>
              <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 animate-pulse rounded-lg" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/10 dark:from-primary/20 dark:via-transparent dark:to-primary/20 animate-pulse rounded-lg" />
            </>
          )}

          <input
            {...getInputProps()}
            {...({ webkitdirectory: "", directory: "" } as any)}
          />
          <div className="flex flex-col items-center gap-4 relative z-10">
            {uploadState.isUploading ? (
              <Loader2 className="h-12 w-12 text-primary animate-spin dark:text-primary" />
            ) : uploadState.success ? (
              <CheckCircle className="h-12 w-12 text-green-500 dark:text-green-400" />
            ) : uploadState.files.length > 0 &&
              uploadState.validationErrors.length === 0 ? (
              <CheckCircle className="h-12 w-12 text-green-500 dark:text-green-400" />
            ) : isDragActive ? (
              <Upload className="h-12 w-12 text-primary animate-bounce dark:text-primary" />
            ) : (
              <Folder className="h-12 w-12 text-muted-foreground dark:text-muted-foreground" />
            )}

            <div className="space-y-2">
              <p
                className={cn(
                  "text-lg font-medium transition-colors",
                  isDragActive
                    ? "text-primary dark:text-primary"
                    : uploadState.success
                    ? "text-green-600 dark:text-green-400"
                    : uploadState.files.length > 0 &&
                      uploadState.validationErrors.length === 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-foreground"
                )}
              >
                {isDragActive
                  ? "Drop the chapter folders here..."
                  : uploadState.success
                  ? "Upload completed successfully!"
                  : uploadState.files.length > 0 &&
                    uploadState.validationErrors.length === 0
                  ? `Ready to upload ${chapterFolders.reduce(
                      (sum, folder) => sum + folder.files.length,
                      0
                    )} images from ${chapterFolders.length} chapter folder${
                      chapterFolders.length > 1 ? "s" : ""
                    }!`
                  : "Drag & drop chapter folders here"}
              </p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                {isDragActive
                  ? "Release to drop your files"
                  : uploadState.files.length > 0 &&
                    uploadState.validationErrors.length === 0 &&
                    !uploadState.success
                  ? "Click 'Upload Chapters' button below to start uploading"
                  : "Or click to browse for chapter folders"}
              </p>
              {(uploadState.files.length === 0 || uploadState.success) &&
                !isDragActive && (
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Expected structure: folder with chapter number/file with
                    order number
                    <br />
                    Examples: chapter1/page01.jpg, vol_02/img_03.png, etc.
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {uploadState.validationErrors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-destructive dark:text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Validation Errors:</span>
          </div>
          <ul className="space-y-1">
            {uploadState.validationErrors.map((error, index) => (
              <li key={index} className="text-sm text-destructive ml-6">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload Progress */}
      {uploadState.isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading chapters...</span>
            <span>{uploadState.progress}%</span>
          </div>
          <Progress value={uploadState.progress} className="w-full" />
        </div>
      )}

      {/* Ready to Upload Indicator */}
      {chapterFolders.length > 0 &&
        !uploadState.isUploading &&
        !uploadState.success &&
        chapterFolders.every((folder) => folder.isValid) && (
          <div className="p-4 border-2 border-green-500 dark:border-green-600 rounded-lg bg-green-50 dark:bg-green-950/30 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <p className="font-semibold text-green-900 dark:text-green-100">
                  Ready to Upload!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {chapterFolders.length} chapter folder
                  {chapterFolders.length > 1 ? "s" : ""} (
                  {chapterFolders.reduce(
                    (sum, folder) => sum + folder.files.length,
                    0
                  )}{" "}
                  total images) ready for upload.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Chapter Folders Preview */}
      {chapterFolders.length > 0 && !uploadState.isUploading && (
        <div className="space-y-3">
          <Label>Chapter Folders ({chapterFolders.length})</Label>
          <div className="space-y-2">
            {chapterFolders.map((folder, index) => (
              <Card
                key={index}
                className={cn(
                  "p-3 transition-colors",
                  folder.isValid
                    ? "border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800"
                    : "border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder
                      className={cn(
                        "h-4 w-4",
                        folder.isValid
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    />
                    <span className="font-medium dark:text-foreground">
                      {folder.name}
                    </span>
                    <span className="text-sm text-muted-foreground dark:text-muted-foreground">
                      ({folder.files.length} images)
                    </span>
                  </div>
                  {folder.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                  )}
                </div>
                {folder.errors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {folder.errors.map((error, errorIndex) => (
                      <li
                        key={errorIndex}
                        className="text-xs text-red-600 dark:text-red-400"
                      >
                        • {error}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {uploadState.error && (
        <div className="flex items-center gap-2 text-destructive dark:text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{uploadState.error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleUpload}
          disabled={
            disabled ||
            uploadState.isUploading ||
            uploadState.files.length === 0 ||
            uploadState.validationErrors.length > 0
          }
          className={cn(
            "flex-1",
            uploadState.files.length > 0 &&
              uploadState.validationErrors.length === 0 &&
              !uploadState.isUploading &&
              !uploadState.success &&
              "bg-green-600 hover:bg-green-700 text-white"
          )}
          size="lg"
        >
          {uploadState.isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : uploadState.success ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Upload Complete
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Chapters
            </>
          )}
        </Button>

        {(uploadState.files.length > 0 || uploadState.success) && (
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={uploadState.isUploading}
            size="lg"
          >
            <X className="h-4 w-4 mr-2" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
