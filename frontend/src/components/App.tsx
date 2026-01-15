import { useState } from "react";
import { HardDrive, FolderOpen, Download, LoaderCircle } from "lucide-react";
import type { MediaFile } from "./FileTable";
import { FileTable } from "./FileTable";

import SelectVolume from "./SelectVolume";
import { GetMediaFilesForVolume, ChooseDestinationFolder } from "../../wailsjs/go/main/App";

export default function App() {
  const [selectedVolume, setSelectedVolume] = useState<string>("");
  // TODO: Choosing export destination via file dialog
  const [exportDestination, setExportDestination] = useState<string>("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // TODO: add config option to override files if they already exist at destination

  const handleVolumeChange = (volumePath: string) => {
    setSelectedVolume(volumePath);
    setIsLoading(true);

    GetMediaFilesForVolume(volumePath).then((files) => {
      const converted = files.map((file) => ({
        path: file.Path,
        filename: file.Filename,
        size: file.Size,
        status: file.Status,
        duration: file.Duration,
        isChecked: true, // by default, all files are checked for export
      }));
      setMediaFiles(converted);
      setIsLoading(false);
    });
    setIsExporting(false);
  };

  const onCheckChange = (file: MediaFile, isChecked: boolean) => {
    const updatedFiles = mediaFiles.map((f) =>
      f.path === file.path ? { ...f, isChecked } : f
    );
    setMediaFiles(updatedFiles);
  }

  const onChooseDestinationClick = () => {
    ChooseDestinationFolder().then((folderPath) => {
      setExportDestination(folderPath);
    });
  }

  const handleExport = () => {
    // TODO: Implement export logic
    if (exportDestination) {
      setIsExporting(true);
    }
  };

  const canExport = selectedVolume && mediaFiles.length > 0 && !isExporting;

  return (
    <div className="min-h-screen bg-black p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 border border-green-500 p-4 bg-black">
          <div className="text-green-500">
            <div className="text-xs mb-2">┌─────────────────────────────────────────────────────────────────┐</div>
            <div className="text-2xl font-bold mb-2 pl-2">│ DVR FOOTAGE EXPORTER v1.0</div> {/* TODO: Add version number from wails.json */}
            <div className="text-sm pl-2 text-green-400">│ Select mounted volume and export DVR media files</div>
            <div className="text-xs mt-2">└─────────────────────────────────────────────────────────────────┘</div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-black border border-green-500 p-6 mb-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Volume Selector */}
            <div>
              <label className="block text-sm font-medium text-green-500 mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="size-4" />
                  <span>&gt; SOURCE_VOLUME</span>
                </div>
              </label>
              <SelectVolume onChange={handleVolumeChange} />
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
                <button className="px-4 py-2 border border-green-500 bg-black text-green-400 hover:bg-green-500 hover:text-black transition-colors" onClick={onChooseDestinationClick}>
                  BROWSE
                </button>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex items-center justify-between border-t border-green-500 pt-4">
            <div className="text-sm text-green-400">
              {selectedVolume && mediaFiles.length > 0 && (
                <span>
                  [INFO] {mediaFiles.length} MEDIA FILE
                  {mediaFiles.length !== 1 ? "S" : ""} DETECTED
                </span>
              )}
            </div>
            <button
              onClick={handleExport}
              disabled={!canExport}
              className="px-6 py-2 bg-green-500 text-black hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-bold"
            >
              <Download className="size-4" />
              EXPORT ALL FILES
            </button>
          </div>
        </div>

        {/* Media Files Table */}
        {selectedVolume && mediaFiles.length > 0 && (
          <div className="bg-black border border-green-500 p-6">
            <div className="text-green-500 mb-4">
              <span className="text-lg font-bold">
                &gt; MEDIA_FILES_DETECTED
              </span>
            </div>
            <FileTable onCheckChange={onCheckChange} files={mediaFiles} />
          </div>
        )}

        {/* Empty State */}
        {selectedVolume && mediaFiles.length === 0 && (
          <div className="bg-black border border-green-500 p-12 text-center">
            {isLoading ? (
              <LoaderCircle className="size-12 text-green-500 mx-auto mb-4 animate-spin" />
            ) : (
              <HardDrive className="size-12 text-green-500 mx-auto mb-4" />
            )}
            <div className="text-green-500 font-bold mb-2">
             {isLoading ? "SCANNING..." : "[WARNING] NO MEDIA FILES FOUND"}
            </div>
            {(!isLoading && mediaFiles.length === 0) &&
            <div className="text-green-400 text-sm">
              No DVR footage detected on selected volume.
            </div>}
          </div>
        )}

        {!selectedVolume && (
          <div className="bg-black border border-green-500 p-12 text-center">
            <HardDrive className="size-12 text-green-500 mx-auto mb-4" />
            <div className="text-green-500 font-bold mb-2">
              &gt; AWAITING INPUT
            </div>
            <div className="text-green-400 text-sm">
              Select a mounted volume to scan for DVR footage.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
