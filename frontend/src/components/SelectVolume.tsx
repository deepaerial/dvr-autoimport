import { useEffect, useState } from 'react';

import {VolumesFromGetfsstat} from '../../wailsjs/go/main/App'; // Placeholder for future Wails bindings
import {LogDebug, LogError} from '../../wailsjs/runtime/runtime'

interface Props {
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SelectVolume({ onChange, placeholder = '-- SELECT VOLUME --' }: Props) {

  const [volumes, setVolumes] = useState<string[]>([]);

  useEffect(() => {
    VolumesFromGetfsstat().then((vols) => {
      setVolumes(vols);
      LogDebug(`Fetched volumes from Wails: ${JSON.stringify(vols)}`);
    }).catch((err) => {
      LogError(`Error fetching volumes from Wails: ${err}`);
    });

  }, []);
  return (
    <select
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2 border border-green-500 bg-black text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
    >
      <option value="" className="bg-black">{placeholder}</option>
      {volumes.map((volume, idx) => (
        <option key={idx} value={volume} className="bg-black">
          {volume}
        </option>
      ))}
    </select>
  );
}
