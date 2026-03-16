import { useState, useEffect, useMemo } from "react";
import type { MediaFile } from "./FileTable";
import { FileTable } from "./FileTable";
import { EventsOn } from "../../wailsjs/runtime/runtime";

import Header from "./Header";
import ExportControls from "./ExportControls";
import StatusFeedback from "./StatusFeedback";
import EmptyStates from "./EmptyStates";

import {
  GetMediaFilesForVolume,
  ChooseDestinationFolder,
  ExportFiles,
  CheckIfFilesAlreadyExported,
  GetDefaultExportDestination,
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
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<
    Record<string, ExportProgressPayload>
  >({});
  const [userInputError, setUserInputErrorMessage] = useErrorMessage();

  useEffect(() => {
    GetDefaultExportDestination()
      .then((dest) => {
        if (dest) {
          setExportDestination(dest);
        }
      })
      .catch((err) => {
        console.error("Error getting default export destination:", err);
      });
  }, []);

  useEffect(() => {
    EventsOn("export-progress", (payload: ExportProgressPayload) => {
      if (payload.percentage === 100) {
        setMediaFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.filename === payload.fileName
              ? { ...f, status: "completed", exportPath: payload.filePath }
              : f,
          ),
        );
      } else
        setExportProgress((prev) => ({ ...prev, [payload.fileName]: payload }));
    });
  }, []);

  const mediaFilesFingerprint = useMemo(
    () => mediaFiles.map((f) => f.path).join("|"),
    [mediaFiles],
  );

  useEffect(() => {
    if (exportDestination && mediaFiles.length > 0) {
      CheckIfFilesAlreadyExported(mediaFiles, exportDestination)
        .then((alreadyExported) => {
          setMediaFiles((prevFiles) =>
            prevFiles.map((f) => {
              const updatedFile = alreadyExported.find(
                (ef) => ef.path === f.path,
              );
              if (updatedFile) {
                return {
                  ...f,
                  status: "completed",
                  exportPath: updatedFile.exportPath,
                };
              }
              return { ...f, status: "found" };
            }),
          );
        })
        .catch((err) => {
          setUserInputErrorMessage(`Error checking existing exports: ${err}`);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportDestination, mediaFilesFingerprint]);

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
        <Header version={version} userInputError={userInputError} />

        <div className="bg-black border border-green-500 p-6 mb-6">
          <ExportControls
            exportDestination={exportDestination}
            onChooseDestination={handleChooseDestinationClick}
            onVolumeChange={handleVolumeChange}
          />

          <StatusFeedback
            isExporting={isExporting}
            exportError={exportError}
            exportSuccess={exportSuccess}
          />

          <div className="flex items-center justify-between border-t border-green-500 pt-4">
            <div className="text-sm text-green-400">
              {selectedVolume && mediaFiles.length > 0 && (
                <span>[INFO] MEDIA FILES DETECTED: {mediaFiles.length}</span>
              )}
            </div>
          </div>
        </div>

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

        <EmptyStates
          selectedVolume={selectedVolume}
          mediaFilesCount={mediaFiles.length}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
