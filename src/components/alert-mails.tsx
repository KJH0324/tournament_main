import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { saveAlertEmails } from "@/lib/guilds/board";
import { ErrorNote } from "@/components/shell";
import { Button, Label, TextField } from "@/components/ui";

export function AlertMailForm({ slug, emails }: { slug: string; emails: [string, string, string] }) {
  const router = useRouter();
  const [slots, setSlots] = useState(emails);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  function setSlot(index: number, value: string) {
    setSlots((current) => {
      const next = [...current] as [string, string, string];
      next[index] = value;
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await saveAlertEmails({
        data: { slug, email1: slots[0], email2: slots[1], email3: slots[2] },
      });
      setNotice(result.count ? `${result.count}명 저장했습니다.` : "수신 메일을 비웠습니다.");
      await router.invalidate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mc-panel mt-6 grid gap-4 p-4 md:p-5">
      <div>
        <h2 className="text-lg font-bold">비상 메일</h2>
        <p className="mt-1 text-sm text-muted">이 서버에서 비상이 들어오면 최대 3명에게 보냅니다. 빈 칸은 지웁니다.</p>
      </div>
      {slots.map((value, index) => (
        <div key={index}>
          <Label htmlFor={`alert-mail-${index}`}>수신 {index + 1}</Label>
          <TextField
            id={`alert-mail-${index}`}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={120}
            value={value}
            placeholder="name@example.com"
            onChange={(event) => setSlot(index, event.target.value)}
          />
        </div>
      ))}
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {notice ? <p className="text-sm text-ok">{notice}</p> : null}
      <div>
        <Button type="submit" disabled={pending}>
          저장
        </Button>
      </div>
    </form>
  );
}
