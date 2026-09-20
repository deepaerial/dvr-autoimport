import { TriangleAlert } from "lucide-react";

interface HeaderProps {
  version: string;
  userInputError: string | null;
}

export default function Header({ version, userInputError }: HeaderProps) {
  return (
    <div className="mb-8 border border-green-500 p-4 bg-black flex flex-row">
      <div className="text-green-500">
        <div className="text-xs mb-2">
          ┌─────────────────────────────────────────────────────────────────┐
        </div>
        <div className="text-2xl font-bold mb-2 pl-2">
          │ DVR FOOTAGE EXPORTER {version}
        </div>
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
        </div>
      )}
    </div>
  );
}
