import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { loginAdmin, logoutAdmin, prepareAdminLogin } from "@/lib/admin/gate";
import { ErrorNote, PageHead, AdminShell } from "@/components/shell";
import { Button, Label, TextField } from "@/components/ui";

export function AdminLogin({ next = "/admin" }: { next?: string }) {
  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState("");
  const [step, setStep] = useState<"id" | "code" | "qr">("id");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function changeId(value: string) {
    setId(value);
    setStep("id");
    setQr("");
    setCode("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      if (step === "qr" || code.length === 6) {
        await loginAdmin({ data: { id, code } });
        window.location.assign(next);
        return;
      }
      const result = await prepareAdminLogin({ data: { id } });
      if (result.mode === "qr") {
        setQr(result.svg);
        setStep("qr");
        return;
      }
      setError("인증코드 6자리를 입력하세요.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "아이디나 코드가 맞지 않아요.");
    } finally {
      setPending(false);
    }
  }

  const hint = step === "qr" ? "인증 앱으로 스캔한 뒤 6자리를 입력하세요." : "관리자 아이디와 인증 앱 6자리를 입력하세요.";

  return (
    <AdminShell>
      <PageHead title="로그인">{hint}</PageHead>
      <form onSubmit={submit} className="mc-panel mt-8 grid max-w-md gap-4 p-4">
        <div>
          <Label htmlFor="admin-id">아이디</Label>
          <TextField
            id="admin-id"
            autoComplete="username"
            maxLength={64}
            value={id}
            onChange={(event) => changeId(event.target.value)}
            required
          />
        </div>
        {step === "qr" ? (
          <div className="mx-auto w-fit bg-white p-3" dangerouslySetInnerHTML={{ __html: qr }} />
        ) : null}
        <div>
          <Label htmlFor="admin-code">인증코드</Label>
          <TextField
            id="admin-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <div>
          <Button type="submit" disabled={pending}>
            로그인
          </Button>
        </div>
      </form>
    </AdminShell>
  );
}

export function AdminLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await logoutAdmin();
      await router.invalidate();
      await router.navigate({ to: "/admin/login" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <Button type="button" variant="ghost" disabled={pending} onClick={() => void logout()}>
        로그아웃
      </Button>
    </div>
  );
}
