import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { claimStaff, clearStaff } from "@/lib/raven/api";
import { Button, TextField } from "@/components/ui";
import { ErrorNote } from "@/components/shell";

export function StaffClaim({
  matchId,
  role,
  name,
  label,
}: {
  matchId: number;
  role: "judge" | "recorder";
  name: string;
  label: string;
}) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function claim() {
    setPending(true);
    setError("");
    try {
      await claimStaff({ data: { id: matchId, role, handle } });
      setHandle("");
      await router.invalidate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "맡지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function clear() {
    setPending(true);
    setError("");
    try {
      await clearStaff({ data: { id: matchId, role } });
      await router.invalidate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "비우지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-sm">{name || "비어 있음"}</span>
      </div>
      {name ? (
        <Button type="button" variant="quiet" disabled={pending} onClick={clear}>
          손 떼기
        </Button>
      ) : (
        <div className="flex gap-2">
          <TextField
            className="min-w-0 flex-1"
            aria-label={`${label} 호출명`}
            placeholder="호출명"
            value={handle}
            maxLength={24}
            onChange={(event) => setHandle(event.target.value)}
          />
          <Button type="button" variant="ghost" disabled={pending} onClick={claim}>
            맡기
          </Button>
        </div>
      )}
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </div>
  );
}
