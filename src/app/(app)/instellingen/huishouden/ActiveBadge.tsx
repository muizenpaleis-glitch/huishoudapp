"use client";

import { useActiveMember } from "@/components/ActiveMemberContext";

export function ActiveBadge({ memberId }: { memberId: string }) {
  const { activeMemberId } = useActiveMember();
  if (activeMemberId !== memberId) return null;
  return (
    <div className="px-2.5 py-1 rounded-full bg-track text-muted text-[11.5px] font-semibold">
      Jij
    </div>
  );
}
