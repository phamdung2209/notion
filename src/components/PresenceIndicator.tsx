import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import usePresence from "@convex-dev/presence/react";
import FacePile from "@convex-dev/presence/facepile";

interface PresenceIndicatorProps {
  documentId: Id<"documents">;
}

export function PresenceIndicator({ documentId }: PresenceIndicatorProps) {
  const userId = useQuery(api.presence.getUserId);
  const presenceState = usePresence(
    api.presence,
    documentId,
    userId || "",
    10000 // 10 second heartbeat
  );

  if (!userId || !presenceState) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <FacePile presenceState={presenceState} />
      {presenceState.length > 0 && (
        <span className="text-sm text-gray-500">
          {presenceState.length} {presenceState.length === 1 ? "person" : "people"} editing
        </span>
      )}
    </div>
  );
}
