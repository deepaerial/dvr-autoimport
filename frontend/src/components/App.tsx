import { useState, useEffect } from "react";
import type { FileState } from "./FileTable";
import { FileTable } from "./FileTable";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import { main } from "../../wailsjs/go/models";

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
  const [mediaFiles, setMediaFiles] = useState<main.MediaFile[]>([]);
  const [fileStates, setFileStates] = useState<Record<string, FileState>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<
    Record<string, ExportProgressPayload>
  >({});
  const [userInputError, setUserInputErrorMessage] = useErrorMessage();

  const checkExports = async (
    filesToCheck: main.MediaFile[],
    destination: string,
  ) => {
    try {
      const alreadyExported = await CheckIfFilesAlreadyExported(
        filesToCheck,
        destination,
      );
      setFileStates((prevStates) => {
        const nextStates = { ...prevStates };
        filesToCheck.forEach((f) => {
          const updatedFile = alreadyExported.find((ef) => ef.path === f.path);
          if (updatedFile) {
            nextStates[f.path] = {
              ...nextStates[f.path],
              status: "completed",
              exportPath: updatedFile.exportPath,
            };
          } else if (nextStates[f.path]?.status !== "exporting") {
            nextStates[f.path] = {
              ...nextStates[f.path],
              status: "found",
              exportPath: "",
            };
          }
        });
        return nextStates;
      });
    } catch (err) {
      setUserInputErrorMessage(`Error checking existing exports: ${err}`);
    }
  };

  useEffect(() => {
    GetDefaultExportDestination()
      .then((dest) => {
        if (dest) {
          setExportDestination(dest);
        }
      })
      .catch((err) => {
        setUserInputErrorMessage(
          `Error getting default export destination: ${err}`,
        );
      });
  }, [setUserInputErrorMessage]);

  useEffect(() => {
    EventsOn("export-progress", (payload: ExportProgressPayload) => {
      if (payload.percentage === 100) {
        setFileStates((prev) => {
          // Find file path by filename (assuming filenames are unique within current view)
          const filePath = Object.keys(prev).find((path) =>
            path.endsWith(payload.fileName),
          );
          if (filePath) {
            return {
              ...prev,
              [filePath]: {
                ...prev[filePath],
                status: "completed",
                exportPath: payload.filePath,
              },
            };
          }
          return prev;
        });
      } else
        setExportProgress((prev) => ({ ...prev, [payload.fileName]: payload }));
    });
  }, []);

  const handleVolumeChange = (volumePath: string) => {
    if (volumePath === "") {
      setSelectedVolume("");
      setMediaFiles([]);
      setFileStates({});
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
        setMediaFiles(files);
        const initialStates: Record<string, FileState> = {};
        files.forEach((f) => {
          initialStates[f.path] = {
            status: "found",
            exportPath: f.exportPath,
            isChecked: true,
          };
        });
        setFileStates(initialStates);
        setIsLoading(false);
        if (exportDestination) {
          checkExports(files, exportDestination);
        }
      })
      .catch((err) => {
        console.error("Error getting media files:", err);
        setExportError(`Failed to load media files: ${err}`);
        setIsLoading(false);
      });
    setIsExporting(false);
  };

  const onCheckChange = (file: main.MediaFile, isChecked: boolean) => {
    setFileStates((prev) => ({
      ...prev,
      [file.path]: { ...prev[file.path], isChecked },
    }));
  };

  const onCheckToggleAll = (isChecked: boolean) => {
    setFileStates((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((path) => {
        next[path] = { ...next[path], isChecked };
      });
      return next;
    });
  };

  const handleChooseDestinationClick = async () => {
    setExportError(null);
    setExportSuccess(false);
    try {
      const folderPath = await ChooseDestinationFolder();
      if (folderPath) {
        setExportDestination(folderPath);
        if (mediaFiles.length > 0) {
          checkExports(mediaFiles, folderPath);
        }
      }
    } catch (err) {
      console.error("Error choosing destination folder:", err);
      setExportError(`Failed to choose destination: ${err}`);
    }
  };

  const handleExportSelected = async (selectedFiles: main.MediaFile[]) => {
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
    setFileStates((prev) => {
      const next = { ...prev };
      selectedFiles.forEach((f) => {
        next[f.path] = { ...next[f.path], status: "exporting" };
      });
      return next;
    });

    try {
      const filePaths = selectedFiles.map((file) => file.path);
      await ExportFiles(filePaths, exportDestination);
      setExportSuccess(true);
      setFileStates((prev) => {
        const next = { ...prev };
        selectedFiles.forEach((f) => {
          next[f.path] = { ...next[f.path], status: "completed" };
        });
        return next;
      });
    } catch (err) {
      console.error("Error during export:", err);
      setExportError(`Export failed: ${err}`);
      setFileStates((prev) => {
        const next = { ...prev };
        selectedFiles.forEach((f) => {
          next[f.path] = { ...next[f.path], status: "found" };
        });
        return next;
      });
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
              fileStates={fileStates}
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
