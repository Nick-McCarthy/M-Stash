"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ThumbnailUploadProps {
  comicType: string;
  comicTitle: string;
  onUploadComplete: (url: string) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
  preview: string | null;
  file: File | null;
}

export function ThumbnailUpload({
  comicType,
  comicTitle,
  onUploadComplete,
  onUploadError,
  disabled = false,
  className,
}: ThumbnailUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false,
    preview: null,
    file: null,
  });

  const processFile = useCallback((file: File) => {
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadState((prev) => ({
        ...prev,
        preview: e.target?.result as string,
        file: file,
        error: null,
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (disabled) return;

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        let errorMessage = "File upload failed";

        if (rejection.errors) {
          const error = rejection.errors[0];
          if (error.code === "file-invalid-type") {
            errorMessage = "Please select an image file (JPG, PNG, GIF)";
          } else if (error.code === "file-too-large") {
            errorMessage = "File size must be less than 5MB";
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

      // Handle accepted files
      if (acceptedFiles.length > 0) {
        processFile(acceptedFiles[0]);
      }
    },
    [disabled, processFile, onUploadError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
    disabled: disabled || uploadState.isUploading,
  });

  const uploadToS3 = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("comicType", comicType);
    formData.append("comicTitle", comicTitle);

    setUploadState((prev) => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
    }));

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadState((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 200);

      const response = await fetch("/api/upload/thumbnail", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();

      setUploadState((prev) => ({
        ...prev,
        progress: 100,
        success: true,
        isUploading: false,
      }));

      onUploadComplete(result.url);
    } catch (error) {
      setUploadState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Upload failed",
        isUploading: false,
        progress: 0,
      }));
      onUploadError(error instanceof Error ? error.message : "Upload failed");
    }
  };

  const handleUpload = () => {
    if (uploadState.file) {
      uploadToS3(uploadState.file);
    }
  };

  const handleReset = () => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      success: false,
      preview: null,
      file: null,
    });
  };

  const isDisabled = disabled || uploadState.isUploading;

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Thumbnail *</Label>

      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragActive && !isDisabled && "border-primary bg-primary/5",
          uploadState.error && "border-destructive bg-destructive/5",
          uploadState.success && "border-green-500 bg-green-50",
          isDisabled && "opacity-50 cursor-not-allowed",
          !uploadState.preview && "hover:border-primary/50"
        )}
      >
        <CardContent className="p-6">
          {uploadState.preview ? (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative">
                <img
                  src={uploadState.preview}
                  alt="Thumbnail preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                {!uploadState.isUploading && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* File info */}
              <div className="text-sm text-muted-foreground">
                <p>
                  <strong>File:</strong> {uploadState.file?.name}
                </p>
                <p>
                  <strong>Size:</strong>{" "}
                  {(uploadState.file?.size! / 1024 / 1024).toFixed(2)} MB
                </p>
                <p>
                  <strong>Type:</strong> {uploadState.file?.type}
                </p>
              </div>

              {/* Upload progress */}
              {uploadState.isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Uploading to S3...</span>
                  </div>
                  <Progress value={uploadState.progress} className="w-full" />
                </div>
              )}

              {/* Success state */}
              {uploadState.success && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Upload successful!</span>
                </div>
              )}

              {/* Upload button */}
              {!uploadState.isUploading && !uploadState.success && (
                <Button onClick={handleUpload} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Thumbnail
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">
                  {isDragActive
                    ? "Drop the image here"
                    : "Drag & drop thumbnail here"}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse files
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports JPG, PNG, GIF up to 5MB
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error message */}
      {uploadState.error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{uploadState.error}</span>
        </div>
      )}

      {/* Hidden file input */}
      <input {...getInputProps()} />
    </div>
  );
}
