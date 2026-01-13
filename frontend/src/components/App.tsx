import { useState } from 'react';
import { HardDrive, FolderOpen, Download } from 'lucide-react';
import { FileTable } from './FileTable';
import type { MediaFile } from './FileTable';

import SelectVolume from './SelectVolume';
import { GetMediaFilesForVolume } from '../../wailsjs/go/main/App';


export default function App() {
  const [selectedVolume, setSelectedVolume] = useState<string>('');
  const [exportDestination, setExportDestination] = useState<string>('C:\\Exported_DVR_Footage');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const handleVolumeChange = (volumePath: string) => {
    setSelectedVolume(volumePath);
    // TODO: Implement logic that will fetch media files and display them in the table
    GetMediaFilesForVolume(volumePath).then((files) => {console.log(files)});
    setIsExporting(false);
  };

  const handleExport = () => {
    if (mediaFiles.length === 0) return;

    setIsExporting(true);
    
    // Simulate export process
    mediaFiles.forEach((file, index) => {
      setTimeout(() => {
        setMediaFiles((prev) => 
          prev.map((f) => 
            f.id === file.id ? { ...f, status: 'exporting', exportProgress: 0 } : f
          )
        );

        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += 5;
          if (progress <= 100) {
            setMediaFiles((prev) =>
              prev.map((f) =>
                f.id === file.id ? { ...f, exportProgress: progress } : f
              )
            );
          }
          if (progress >= 100) {
            clearInterval(interval);
            setMediaFiles((prev) =>
              prev.map((f) =>
                f.id === file.id ? { ...f, status: 'completed' } : f
              )
            );
          }
        }, 100);
      }, index * 1000);
    });
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
                  type="text"
                  value={exportDestination}
                  onChange={(e) => setExportDestination(e.target.value)}
                  className="flex-1 px-4 py-2 border border-green-500 bg-black text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                  placeholder="C:\Exported_DVR_Footage"
                />
                <button className="px-4 py-2 border border-green-500 bg-black text-green-400 hover:bg-green-500 hover:text-black transition-colors">
                  BROWSE
                </button>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex items-center justify-between border-t border-green-500 pt-4">
            <div className="text-sm text-green-400">
              {selectedVolume && mediaFiles.length > 0 && (
                <span>[INFO] {mediaFiles.length} MEDIA FILE{mediaFiles.length !== 1 ? 'S' : ''} DETECTED</span>
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
              <span className="text-lg font-bold">&gt; MEDIA_FILES_DETECTED</span>
            </div>
            <FileTable files={mediaFiles} />
          </div>
        )}

        {/* Empty State */}
        {selectedVolume && mediaFiles.length === 0 && (
          <div className="bg-black border border-green-500 p-12 text-center">
            <HardDrive className="size-12 text-green-500 mx-auto mb-4" />
            <div className="text-green-500 font-bold mb-2">[WARNING] NO MEDIA FILES FOUND</div>
            <div className="text-green-400 text-sm">No DVR footage detected on selected volume.</div>
          </div>
        )}

        {!selectedVolume && (
          <div className="bg-black border border-green-500 p-12 text-center">
            <HardDrive className="size-12 text-green-500 mx-auto mb-4" />
            <div className="text-green-500 font-bold mb-2">&gt; AWAITING INPUT</div>
            <div className="text-green-400 text-sm">Select a mounted volume to scan for DVR footage.</div>
          </div>
        )}
      </div>
    </div>
  );
}