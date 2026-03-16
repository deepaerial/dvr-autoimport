import { LoaderCircle } from "lucide-react";

interface StatusFeedbackProps {
  isExporting: boolean;
  exportError: string | null;
  exportSuccess: boolean;
}

export default function StatusFeedback({
  isExporting,
  exportError,
  exportSuccess,
}: StatusFeedbackProps) {
  if (!isExporting && !exportError && !exportSuccess) return null;

  return (
    <div className="border-t border-green-500 pt-4 mt-4">
      {isExporting && (
        <div className="flex items-center gap-2 text-green-500">
          <LoaderCircle className="size-4 animate-spin" />
          <span>EXPORTING FILES...</span>
        </div>
      )}
      {exportError && (
        <div className="flex items-center gap-2 text-red-500">
          <span className="font-bold">[ERROR]</span> {exportError}
        </div>
      )}
      {exportSuccess && (
        <div className="flex items-center gap-2 text-green-500">
          <span className="font-bold">[SUCCESS]</span> Files exported
          successfully!
        </div>
      )}
    </div>
  );
}
