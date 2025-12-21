import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleClaimProps {
  parsedClaim: any;
}

export default function CollapsibleClaim({ parsedClaim }: CollapsibleClaimProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#111] transition-colors rounded-lg"
      >
        <span className="font-semibold text-white">
          Parsed Claim
        </span>
        <ChevronDown
          className={`w-5 h-5 text-[#888] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-[#888]">Claim:</span>
              <p className="text-[#ccc] mt-1">{parsedClaim.claim}</p>
            </div>
            <div>
              <span className="font-medium text-[#888]">Type:</span>
              <span className="ml-2 text-[#ccc]">{parsedClaim.type}</span>
            </div>
            {parsedClaim.time_window && (parsedClaim.time_window.start || parsedClaim.time_window.end) && (
              <div>
                <span className="font-medium text-[#888]">Time Window:</span>
                <p className="text-[#ccc] mt-1">
                  {parsedClaim.time_window.start || "N/A"} - {parsedClaim.time_window.end || "N/A"}
                </p>
              </div>
            )}
            {parsedClaim.entities && parsedClaim.entities.length > 0 && (
              <div>
                <span className="font-medium text-[#888]">Entities:</span>
                <ul className="list-disc list-inside text-[#ccc] mt-1">
                  {parsedClaim.entities.map((e: any, i: number) => (
                    <li key={i}>{e.name} ({e.type})</li>
                  ))}
                </ul>
              </div>
            )}
            {parsedClaim.ambiguities && parsedClaim.ambiguities.length > 0 && (
              <div>
                <span className="font-medium text-red-500">Ambiguities:</span>
                <ul className="list-disc list-inside text-red-400 mt-1">
                  {parsedClaim.ambiguities.map((a: string, i: number) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
