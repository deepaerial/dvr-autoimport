import { HardDrive, FolderOpen } from "lucide-react";
import SelectVolume from "./SelectVolume";

interface ExportControlsProps {
  exportDestination: string;
  onChooseDestination: () => void;
  onVolumeChange: (volumePath: string) => void;
}

export default function ExportControls({
  exportDestination,
  onChooseDestination,
  onVolumeChange,
}: ExportControlsProps) {
  return (
    <div className="grid grid-cols-2 gap-6 mb-6">
      {/* Volume Selector */}
      <div>
        <label className="block text-sm font-medium text-green-500 mb-2">
          <div className="flex items-center gap-2">
            <HardDrive className="size-4" />
            <span>&gt; SOURCE_VOLUME</span>
          </div>
        </label>
        <SelectVolume onChange={onVolumeChange} />
      </div>

      {/* Export Destination */}
      <div>
        <label className="block text-sm font-medium text-green-500 mb-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="size-4" />
            <span>&gt; EXPORT_DESTINATION</span>
          </div>
        </label>
        <div className="flex gap-2">
          <input
            readOnly
            type="text"
            value={exportDestination}
            className="flex-1 px-4 py-2 border border-green-500 bg-black text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
            placeholder="Choose where to export footage"
          />
          <button
            className="px-4 py-2 border border-green-500 bg-black text-green-400 hover:bg-green-500 hover:text-black transition-colors"
            onClick={onChooseDestination}
          >
            BROWSE
          </button>
        </div>
      </div>
    </div>
  );
}
