import { createFileRoute } from "@tanstack/react-router";
import { PageHead, Shell } from "@/components/shell";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "이용약관 · KJH Bot" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <Shell>
      <PageHead title="이용약관" />
      <p className="mt-2 text-sm text-muted">시행일: 2026년 11월 3일 · 문의 KJH@raven-tournament.xyz</p>
      <article className="mt-8 grid max-w-3xl gap-6 text-sm leading-7">
        <section>
          <h2 className="text-base font-semibold">1. 운영</h2>
          <p className="mt-2 text-muted">
            이 약관은 Raven Tournament가 운영하는 KJH Bot과 raven-tournament.xyz(이하 서비스)에 적용됩니다. 봇을 초대하거나, 슬래시 명령어를 쓰거나, 사이트를 보면 이 약관에 동의한 것으로 봅니다.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">2. 서비스</h2>
          <p className="mt-2 text-muted">
            서비스는 디스코드 서버의 대회 일정, 결과, 로스터, 문의, 비상 알림을 다루고, 그 일부를 웹에 보여 줍니다. 경기 생성과 도구는 디스코드 명령어로만 동작합니다.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">3. 이용</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            <li>봇을 초대한 서버의 관리자는 그 서버에서 명령어가 쓰이도록 둔 것에 책임이 있습니다.</li>
            <li>역할이 없는 명령어는 쓸 수 없습니다. 관리자 화면은 지정된 아이디와 인증 코드로만 들어갑니다.</li>
            <li>허위 결과, 타인 사칭, 운영 방해, 명령어 도배, 개인정보 유포는 금지합니다.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-semibold">4. 중단</h2>
          <p className="mt-2 text-muted">
            보안, 규정 위반, 서비스 안정이 필요하면 서버 설정을 되돌리거나 명령 사용을 막을 수 있습니다. 봇과 사이트가 항상 끊기지 않는다고 보장하지 않습니다.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">5. 다른 서비스</h2>
          <p className="mt-2 text-muted">
            디스코드, 챌롱, 메일 발송, 서버 호스팅은 각 회사의 약관을 따릅니다. 그 장애에 대해 Raven Tournament가 대신 책임지지 않습니다.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">6. 책임</h2>
          <p className="mt-2 text-muted">
            법이 허용하는 범위에서, 서비스 이용으로 생긴 간접 손해와 경기 결과 다툼에 대해 책임지지 않습니다. 한국 법령의 강행규정은 그대로 적용됩니다.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">7. 변경</h2>
          <p className="mt-2 text-muted">이 약관은 이 페이지에 고친 날짜와 함께 올리는 시점부터 적용됩니다.</p>
        </section>
      </article>
    </Shell>
  );
}
