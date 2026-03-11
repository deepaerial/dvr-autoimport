import { useState, useEffect } from "react";
import { HardDrive, FolderOpen, LoaderCircle, TriangleAlert } from "lucide-react";
import type { MediaFile } from "./FileTable";
import { FileTable } from "./FileTable";
import { EventsOn } from "../../wailsjs/runtime/runtime";

import SelectVolume from "./SelectVolume";
import {
  GetMediaFilesForVolume,
  ChooseDestinationFolder,
  ExportFiles,
  CheckIfFilesAlreadyExported
} from "../../wailsjs/go/main/App";

import { useErrorMessage } from "@/hooks";

export interface ExportProgressPayload {
  fileName: string;
  filePath: string;
  totalSize: number;
  bytesCopied: number;
  percentage: number;
}

export interface AppProps {
    version: string;
}

export default function App({ version }: AppProps) {
  const [selectedVolume, setSelectedVolume] = useState<string>("");
  const [exportDestination, setExportDestination] = useState<string>("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null); // New state for export errors
  const [exportSuccess, setExportSuccess] = useState<boolean>(false); // New state for export success
  const [exportProgress, setExportProgress] = useState<
    Record<string, ExportProgressPayload>
  >({});
  const [userInputError, setUserInputErrorMessage] = useErrorMessage();

  useEffect(() => {
    EventsOn("export-progress", (payload: ExportProgressPayload) => {
      if (payload.percentage === 100) {
        setMediaFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.filename === payload.fileName ? { ...f, status: "completed", exportPath: payload.filePath } : f,
          ),
        );
      } else
        setExportProgress((prev) => ({ ...prev, [payload.fileName]: payload }));
    });
  }, []);

    useEffect(() => {
      if (exportDestination && mediaFiles.length > 0) {
        CheckIfFilesAlreadyExported(mediaFiles, exportDestination)
          .then((alreadyExported) => {
            setMediaFiles((prevFiles) =>
              prevFiles.map((f) => {
                const updatedFile = alreadyExported.find((ef) => ef.path === f.path);
                if (updatedFile) {
                  return { ...f, status: "completed", exportPath: updatedFile.exportPath };
                }
                return f;
              }),
            );
          })
          .catch((err) => {
            setUserInputErrorMessage(`Error checking existing exports: ${err}`);
          });
      }
    }, []);

  const handleVolumeChange = (volumePath: string) => {
    if (volumePath === "") {
      setSelectedVolume("");
      setMediaFiles([]);
      setIsLoading(false);
      setExportProgress({});
      return;
    }
    setSelectedVolume(volumePath);
    setIsLoading(true);
    setExportError(null);
    setExportSuccess(false);
    setExportProgress({});

    GetMediaFilesForVolume(volumePath)
      .then((files) => {
        const converted = files.map((file) => ({
          path: file.path,
          filename: file.filename,
          size: file.size,
          status: "found",
          duration: file.duration,
          exportPath: file.exportPath,
          isChecked: true, // by default, all files are checked for export
        }));
        setMediaFiles(converted);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error getting media files:", err);
        setExportError(`Failed to load media files: ${err}`);
        setIsLoading(false);
      });
    setIsExporting(false);
  };

  const onCheckChange = (file: MediaFile, isChecked: boolean) => {
    const updatedFiles = mediaFiles.map((f) =>
      f.path === file.path ? { ...f, isChecked } : f,
    );
    setMediaFiles(updatedFiles);
  };

  const onCheckToggleAll = (isChecked: boolean) => {
    const updatedFiles = mediaFiles.map((f) => ({ ...f, isChecked }));
    setMediaFiles(updatedFiles);
  };

  const handleChooseDestinationClick = async () => {
    // Changed name to avoid conflict, added async
    setExportError(null);
    setExportSuccess(false);
    try {
      const folderPath = await ChooseDestinationFolder();
      if (folderPath) {
        setExportDestination(folderPath);
      }
    } catch (err) {
      console.error("Error choosing destination folder:", err);
      setExportError(`Failed to choose destination: ${err}`);
    }
  };

  const handleExportSelected = async (selectedFiles: MediaFile[]) => {
    setExportError(null);
    setExportSuccess(false);
    setExportProgress({});
    if (!exportDestination) {
      setUserInputErrorMessage("Please choose an export destination first.");
      return;
    }

    if (selectedFiles.length === 0) {
      setUserInputErrorMessage("Please select at least one file to export.");
      return;
    }

    setIsExporting(true);
    setMediaFiles((prevFiles) =>
      prevFiles.map((f) =>
        selectedFiles.some((sf) => sf.path === f.path)
          ? { ...f, status: "exporting" }
          : f,
      ),
    );

    try {
      const filePaths = selectedFiles.map((file) => file.path);
      await ExportFiles(filePaths, exportDestination);
      setExportSuccess(true);
      setMediaFiles((prevFiles) =>
        prevFiles.map((f) =>
          selectedFiles.some((sf) => sf.path === f.path)
            ? { ...f, status: "completed" }
            : f,
        ),
      );
    } catch (err) {
      console.error("Error during export:", err);
      setExportError(`Export failed: ${err}`);
      setMediaFiles((prevFiles) =>
        prevFiles.map((f) =>
          selectedFiles.some((sf) => sf.path === f.path)
            ? { ...f, status: "found" }
            : f,
        ),
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 border border-green-500 p-4 bg-black flex flex-row" >
          <div className="text-green-500">
            <div className="text-xs mb-2">
              ┌─────────────────────────────────────────────────────────────────┐
            </div>
            <div className="text-2xl font-bold mb-2 pl-2">
              │ DVR FOOTAGE EXPORTER {version}
            </div>{" "}
            {/* TODO: Add version number from wails.json */}
            <div className="text-sm pl-2 text-green-400">
              │ Select mounted volume and export DVR media files
            </div>
            <div className="text-xs mt-2">
              └─────────────────────────────────────────────────────────────────┘
            </div>
          </div>
          {userInputError && (
          <div className="text-sm border border-red-400 p-4 bg-black flex flex-row items-center gap-2 ml-10">
            <TriangleAlert className="size-6 text-red-500 inline-block mr-2" />
            <span className="text-red-500 font-bold">{userInputError}</span>
          </div>)
          }
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
                <button
                  className="px-4 py-2 border border-green-500 bg-black text-green-400 hover:bg-green-500 hover:text-black transition-colors"
                  onClick={handleChooseDestinationClick}
                >
                  BROWSE
                </button>
              </div>
            </div>
          </div>

          {/* Status/Feedback */}
          {(exportError || exportSuccess || isExporting) && (
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
          )}

          {/* Removed old export button logic */}
          <div className="flex items-center justify-between border-t border-green-500 pt-4">
            <div className="text-sm text-green-400">
              {selectedVolume && mediaFiles.length > 0 && (
                <span>[INFO] MEDIA FILES DETECTED: {mediaFiles.length}</span>
              )}
            </div>
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
            <FileTable
              files={mediaFiles}
              isExportButtonDisabled={exportDestination === "" || isExporting}
              onCheckChange={onCheckChange}
              onExportSelected={handleExportSelected}
              onCheckToggleAll={onCheckToggleAll}
              exportProgress={exportProgress}
            />
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
            {!isLoading && mediaFiles.length === 0 && (
              <div className="text-green-400 text-sm">
                No DVR footage detected on selected volume.
              </div>
            )}
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
