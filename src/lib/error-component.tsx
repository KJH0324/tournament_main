import { Link, type ErrorComponentProps } from "@tanstack/react-router";

export function AppErrorComponent(_props: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <h1 className="text-lg font-semibold">잠시 문제가 생겼습니다</h1>
      <p className="max-w-md text-sm text-muted">새로고침해도 계속되면 문의로 알려 주세요.</p>
      <Link to="/support" className="text-sm font-semibold text-accent">
        문의
      </Link>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <h1 className="text-lg font-semibold">이 서버를 찾을 수 없습니다</h1>
      <p className="max-w-md text-sm text-muted">주소가 바뀌었거나 아직 등록되지 않은 서버입니다.</p>
      <Link to="/" className="text-sm font-semibold text-accent">
        홈
      </Link>
    </main>
  );
}
