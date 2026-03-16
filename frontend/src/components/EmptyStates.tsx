import { HardDrive, LoaderCircle } from "lucide-react";

interface EmptyStatesProps {
  selectedVolume: string;
  mediaFilesCount: number;
  isLoading: boolean;
}

export default function EmptyStates({
  selectedVolume,
  mediaFilesCount,
  isLoading,
}: EmptyStatesProps) {
  if (!selectedVolume) {
    return (
      <div className="bg-black border border-green-500 p-12 text-center">
        <HardDrive className="size-12 text-green-500 mx-auto mb-4" />
        <div className="text-green-500 font-bold mb-2">&gt; AWAITING INPUT</div>
        <div className="text-green-400 text-sm">
          Select a mounted volume to scan for DVR footage.
        </div>
      </div>
    );
  }

  if (mediaFilesCount === 0) {
    return (
      <div className="bg-black border border-green-500 p-12 text-center">
        {isLoading ? (
          <LoaderCircle className="size-12 text-green-500 mx-auto mb-4 animate-spin" />
        ) : (
          <HardDrive className="size-12 text-green-500 mx-auto mb-4" />
        )}
        <div className="text-green-500 font-bold mb-2">
          {isLoading ? "SCANNING..." : "[WARNING] NO MEDIA FILES FOUND"}
        </div>
        {!isLoading && (
          <div className="text-green-400 text-sm">
            No DVR footage detected on selected volume.
          </div>
        )}
      </div>
    );
  }

  return null;
}
