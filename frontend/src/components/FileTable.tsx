import { Play, CheckCircle2, FolderOpen } from 'lucide-react';

export interface MediaFile {
  id: string;
  filename: string;
  size: number;
  duration: string;
  exportProgress?: number;
  status: 'pending' | 'exporting' | 'completed';
}

interface FileTableProps {
  files: MediaFile[];
}

export function FileTable({ files }: FileTableProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const handleShowInFileSystem = (filename: string) => {
    // In a real application, this would call an API to open the file location
    console.log('Opening file location for:', filename);
  };

  return (
    <div className="border border-green-500 overflow-hidden bg-black">
      <table className="w-full font-mono">
        <thead>
          <tr className="bg-black border-b border-green-500">
            <th className="px-4 py-3 text-left text-sm font-bold text-green-500">FILENAME</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-green-500">SIZE</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-green-500">DURATION</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-green-500">STATUS</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-green-500">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.id} className="border-b border-green-900 hover:bg-green-950">
              <td className="px-4 py-3 text-sm text-green-400">
                <div className="flex items-center gap-2">
                  <Play className="size-4 text-green-500" />
                  {file.filename}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-green-400">{formatFileSize(file.size)}</td>
              <td className="px-4 py-3 text-sm text-green-400">{file.duration}</td>
              <td className="px-4 py-3">
                {file.status === 'completed' && (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="size-4" />
                    <span className="text-sm font-bold">[OK]</span>
                  </div>
                )}
                {file.status === 'exporting' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-green-400">
                      <span>[EXPORTING...]</span>
                      <span>{file.exportProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-900 border border-green-900 h-4 overflow-hidden">
                      <div
                        className="bg-green-500 h-full transition-all duration-300"
                        style={{ width: `${file.exportProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {file.status === 'pending' && (
                  <span className="text-sm text-green-600">[PENDING]</span>
                )}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => handleShowInFileSystem(file.filename)}
                  className="px-3 py-1.5 text-xs bg-black border border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-colors flex items-center gap-2"
                >
                  <FolderOpen className="size-3" />
                  SHOW IN FS
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}