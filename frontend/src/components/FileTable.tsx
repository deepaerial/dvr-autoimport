import { Download } from "lucide-react";
import type { ExportProgressPayload } from "./App";
import { ShowFileInFilesystem } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { FileRow } from "./FileRow";

export interface FileState {
  status: string;
  exportPath: string;
  isChecked: boolean;
}

interface FileTableProps {
  files: main.MediaFile[];
  fileStates: Record<string, FileState>;
  isExportButtonDisabled: boolean;
  onCheckChange: (file: main.MediaFile, isChecked: boolean) => void;
  onExportSelected: (selectedFiles: main.MediaFile[]) => void;
  onCheckToggleAll: (isChecked: boolean) => void;
  exportProgress: Record<string, ExportProgressPayload>;
}

export function FileTable({
  files,
  fileStates,
  isExportButtonDisabled = false,
  onCheckChange,
  onExportSelected,
  onCheckToggleAll,
  exportProgress,
}: FileTableProps) {
  const handleShowInFileSystem = async (filePath: string) => {
    await ShowFileInFilesystem(filePath);
  };

  const selectedFiles = files.filter((file) => fileStates[file.path]?.isChecked);
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
          {files.map((file) => {
            const state = fileStates[file.path] || {
              status: "found",
              exportPath: "",
              isChecked: false,
            };
            const progress = exportProgress[file.filename];
            const percentage = progress ? progress.percentage : 0;

            return (
              <FileRow
                key={file.path}
                file={file}
                status={state.status}
                exportPath={state.exportPath}
                isChecked={state.isChecked}
                percentage={percentage}
                onCheckChange={onCheckChange}
                onShowInFileSystem={handleShowInFileSystem}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
