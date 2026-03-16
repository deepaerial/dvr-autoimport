import { memo } from "react";
import { Play, CheckCircle2, FolderOpen } from "lucide-react";
import { main } from "../../wailsjs/go/models";

interface FileRowProps {
  file: main.MediaFile;
  status: string;
  exportPath: string;
  isChecked: boolean;
  percentage: number;
  onCheckChange: (file: main.MediaFile, isChecked: boolean) => void;
  onShowInFileSystem: (exportPath: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
};

export const FileRow = memo(function FileRow({
  file,
  status,
  exportPath,
  isChecked,
  percentage,
  onCheckChange,
  onShowInFileSystem,
}: FileRowProps) {
  const fileShouldExist = status === "completed" && exportPath !== "";

  return (
    <tr className="border-b border-green-900 hover:bg-green-950">
      <td className="px-4 py-3 text-sm text-green-400">
        <div className="flex items-center gap-2">
          <Play className="size-4 text-green-500" />
          <input
            type="checkbox"
            checked={isChecked}
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
      <td className="px-4 py-3 text-sm text-green-400">{file.duration}</td>
      <td className="px-4 py-3">
        {status === "completed" && (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="size-4" />
            <span className="text-sm font-bold">[OK]</span>
          </div>
        )}
        {status === "exporting" && (
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
        {status === "found" && (
          <span className="text-sm text-green-600">[FOUND]</span>
        )}
        {status === "pending" && (
          <span className="text-sm text-green-600">[PENDING]</span>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          disabled={!fileShouldExist}
          onClick={() => onShowInFileSystem(exportPath)}
          className={`px-3 py-1.5 text-xs bg-black border border-green-500 text-green-400 flex items-center gap-2
            ${!fileShouldExist ? "opacity-50 cursor-not-allowed" : "hover:bg-green-500 hover:text-black transition-colors"}`}
        >
          <FolderOpen className="size-3" />
          SHOW IN FS
        </button>
      </td>
    </tr>
  );
});
