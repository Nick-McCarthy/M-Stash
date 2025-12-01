import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ErrorStateProps {
  title: string;
  message?: string;
  onBack: () => void;
}

export function ErrorState({ title, message, onBack }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        {message && <p className="text-muted-foreground mb-4">{message}</p>}
        <Button onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    </div>
  );
}
