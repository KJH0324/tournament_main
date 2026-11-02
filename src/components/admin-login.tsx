import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { loginAdmin, logoutAdmin, prepareAdminLogin } from "@/lib/admin/gate";
import { ErrorNote, PageHead, Shell } from "@/components/shell";
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
      if (step === "id") {
        const result = await prepareAdminLogin({ data: { id } });
        if (result.mode === "qr") {
          setQr(result.svg);
          setStep("qr");
        } else {
          setStep("code");
        }
        return;
      }
      await loginAdmin({ data: { id, code } });
      window.location.assign(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "들어가지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  const hint =
    step === "qr"
      ? "인증 앱으로 스캔한 뒤 6자리를 입력합니다."
      : step === "code"
        ? "인증 앱의 6자리를 입력합니다."
        : "아이디를 입력합니다.";

  return (
    <Shell>
      <PageHead title="관리 로그인">{hint}</PageHead>
      <form onSubmit={submit} className="mc-panel mt-8 grid max-w-md gap-4 p-4 md:p-5">
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
          <div className="mx-auto w-fit rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: qr }} />
        ) : null}
        {step === "id" ? null : (
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
              required
            />
          </div>
        )}
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <div>
          <Button type="submit" disabled={pending}>
            {step === "id" ? "다음" : "들어가기"}
          </Button>
        </div>
      </form>
    </Shell>
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
        나가기
      </Button>
    </div>
  );
}
