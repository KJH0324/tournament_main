import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { addAdminAccount, removeAdminAccount } from "@/lib/admin/gate";
import { ErrorNote } from "@/components/shell";
import { Button, Label, TextField } from "@/components/ui";

export function AdminAccounts({ accounts }: { accounts: { id: string }[] }) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<{ id: string; secret: string; uri: string } | null>(null);

  async function add(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await addAdminAccount({ data: { id } });
      setCreated(result);
      setId("");
      await router.invalidate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "추가하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function remove(accountId: string) {
    setError("");
    try {
      await removeAdminAccount({ data: { id: accountId } });
      await router.invalidate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "빼지 못했습니다.");
    }
  }

  return (
    <section className="mc-panel mt-6 grid gap-4 p-4 md:p-5">
      <div>
        <h2 className="text-lg font-bold">관리자</h2>
        <p className="mt-1 text-sm text-muted">메인 관리자만 아이디를 넣습니다. 키는 추가한 직후에만 보입니다.</p>
      </div>
      <ul className="grid gap-2">
        {accounts.length === 0 ? <li className="text-sm text-muted">추가된 아이디가 없습니다.</li> : null}
        {accounts.map((account) => (
          <li key={account.id} className="flex items-center justify-between gap-3">
            <span className="font-semibold">{account.id}</span>
            <Button type="button" variant="ghost" onClick={() => void remove(account.id)}>
              빼기
            </Button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="new-admin-id">아이디</Label>
          <TextField
            id="new-admin-id"
            autoComplete="off"
            maxLength={32}
            value={id}
            onChange={(event) => setId(event.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          추가
        </Button>
      </form>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {created ? (
        <div className="grid gap-2 border-t border-line pt-4 text-sm">
          <p className="font-semibold">{created.id} 키</p>
          <p className="break-all">{created.secret}</p>
          <p className="break-all text-muted">{created.uri}</p>
        </div>
      ) : null}
    </section>
  );
}
