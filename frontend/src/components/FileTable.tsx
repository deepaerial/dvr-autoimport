import { Play, CheckCircle2, FolderOpen, Download } from "lucide-react";
import type { ExportProgressPayload } from "./App";

export interface MediaFile {
  path: string;
  filename: string;
  size: number;
  status: string;
  duration: number;
  isChecked?: boolean;
}

interface FileTableProps {
  files: MediaFile[];
  isExportButtonDisabled: boolean;
  onCheckChange: (file: MediaFile, isChecked: boolean) => void;
  onExportSelected: (selectedFiles: MediaFile[]) => void;
  onCheckToggleAll: (isChecked: boolean) => void;
  exportProgress: Record<string, ExportProgressPayload>;
  destinationIsSet: boolean;
}

export function FileTable({
  files,
  isExportButtonDisabled = false,
  onCheckChange,
  onExportSelected,
  onCheckToggleAll,
  exportProgress,
  destinationIsSet,
}: FileTableProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  // TODO: Implement show in file system functionality
  // const handleShowInFileSystem = (filename: string) => {
  // };

  const selectedFiles = files.filter((file) => file.isChecked);
  const allFilesSelected = selectedFiles.length > 0;
  isExportButtonDisabled = isExportButtonDisabled || selectedFiles.length === 0;

  const handleExportClick = () => {
    onExportSelected(selectedFiles);
  };

  return (
    <div className="border border-green-500 overflow-hidden bg-black">
      <div className="flex justify-between items-baseline p-2 border-b border-green-500">
        <div className="text-green-400 text-sm flex items-center gap-2">
          <span className="text-green-400 text-sm">
            {selectedFiles.length} file(s) selected
          </span>
          <input
            type="checkbox"
            checked={allFilesSelected}
            onChange={(e) => {
              onCheckToggleAll(e.target.checked);
            }}
            className="ml-5"
          />
          {allFilesSelected ? "Deselect all" : "Select all"}
        </div>
        <button
          onClick={handleExportClick}
          disabled={isExportButtonDisabled}
          className={`px-3 py-1.5 text-xs bg-black border border-green-500 text-green-400 flex items-center gap-2
            ${isExportButtonDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-green-500 hover:text-black transition-colors"}`}
        >
          <Download className="size-3" />
          EXPORT SELECTED
        </button>
      </div>
      <table className="w-full font-mono">
        <thead>
          <tr className="bg-black border-b border-green-500">
            <th className="px-4 py-3 text-left text-sm font-bold text-green-500">
              FILENAME
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-green-500">
              SIZE
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-green-500">
              DURATION
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-green-500">
              STATUS
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-green-500">
              ACTIONS
            </th>
          </tr>
        </thead>
        <tbody>
          {files.map((file, id) => {
            const progress = exportProgress[file.filename];
            const percentage = progress ? progress.percentage : 0;

            return (
              <tr
                key={id}
                className="border-b border-green-900 hover:bg-green-950"
              >
                <td className="px-4 py-3 text-sm text-green-400">
                  <div className="flex items-center gap-2">
                    <Play className="size-4 text-green-500" />
                    <input
                      type="checkbox"
                      checked={file.isChecked}
                      onChange={(e) => {
                        onCheckChange(file, e.target.checked);
                      }}
                    />
                    {file.filename}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-green-400">
                  {formatFileSize(file.size)}
                </td>
                <td className="px-4 py-3 text-sm text-green-400">
                  {file.duration}
                </td>
                <td className="px-4 py-3">
                  {file.status === "completed" && (
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle2 className="size-4" />
                      <span className="text-sm font-bold">[OK]</span>
                    </div>
                  )}
                  {file.status === "exporting" && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-green-400">
                        <span>[EXPORTING...]</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-900 border border-green-900 h-4 overflow-hidden">
                        <div
                          className="bg-green-500 h-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {file.status === "found" && (
                    <span className="text-sm text-green-600">[FOUND]</span>
                  )}
                  {file.status === "pending" && (
                    <span className="text-sm text-green-600">[PENDING]</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    disabled={!destinationIsSet}
                    // onClick={() => handleShowInFileSystem(file.filename)}
                    className={`px-3 py-1.5 text-xs bg-black border border-green-500 text-green-400 flex items-center gap-2
            ${!destinationIsSet ? "opacity-50 cursor-not-allowed" : "hover:bg-green-500 hover:text-black transition-colors"}`}
                  >
                    <FolderOpen className="size-3" />
                    SHOW IN FS
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
