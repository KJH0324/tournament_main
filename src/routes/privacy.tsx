import { createFileRoute } from "@tanstack/react-router";
import { PageHead, Shell } from "@/components/shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "개인정보 처리방침 · KJH Bot" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <Shell>
      <PageHead title="개인정보 처리방침" />
      <p className="mt-2 text-sm text-muted">시행일: 2026년 11월 3일 · 문의 KJH@raven-tournament.xyz</p>
      <article className="mt-8 grid max-w-3xl gap-6 text-sm leading-7">
        <section>
          <h2 className="text-base font-semibold">1. 처리 주체</h2>
          <p className="mt-2 text-muted">Raven Tournament가 KJH Bot과 raven-tournament.xyz에서 아래 정보를 처리합니다.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold">2. 항목</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            <li>명령어를 쓴 디스코드 사용자 아이디, 사용자명, 서버 아이디, 그 서버에서 지정한 역할 아이디</li>
            <li>경기 팀명, 시각, 점수, 심판·기록 이름, 로스터의 게임 아이디와 디스코드 아이디</li>
            <li>문의에 적은 닉네임과 내용, 서버 관리자가 넣은 비상 알림 메일 주소</li>
            <li>관리자 아이디, 로그인 세션, 로그인 실패를 막기 위한 접속 아이피, 명령 기록</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-semibold">3. 목적</h2>
          <p className="mt-2 text-muted">
            대회 운영, 결과 공개, 권한 확인, 문의 접수, 비상 알림, 관리자 로그인, 부정 사용 방지에만 씁니다. 팔지 않습니다.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">4. 제공</h2>
          <p className="mt-2 text-muted">
            디스코드(봇 동작), 챌롱(대진을 연결한 서버), 메일 발송 업체(비상 알림), 서버 호스팅과 데이터베이스에 운영에 필요한 범위만 전달합니다. 공개 페이지에는 팀명, 점수, 서버 이름이 보입니다.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">5. 보관</h2>
          <p className="mt-2 text-muted">
            경기와 로스터, 명령 기록은 그 서버의 대회 운영과 분쟁 확인에 필요한 동안 둡니다. 서버에서 데이터를 지우거나 스냅샷을 되돌리면 그에 따라 바뀝니다. 로그인 실패 기록은 메모리에만 잠시 있습니다.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">6. 권리</h2>
          <p className="mt-2 text-muted">
            열람, 정정, 삭제는 KJH@raven-tournament.xyz로 요청할 수 있습니다. 본인 확인 후 처리합니다. 이미 공개된 경기 결과 중 운영 기록으로 남겨야 하는 항목은 남을 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold">7. 아동</h2>
          <p className="mt-2 text-muted">만 14세 미만을 대상으로 정보를 받지 않습니다. 그런 정보가 들어왔다고 보이면 위 메일로 알려 주세요.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold">8. 변경</h2>
          <p className="mt-2 text-muted">이 방침은 이 페이지에 고친 날짜와 함께 올리는 시점부터 적용됩니다.</p>
        </section>
      </article>
    </Shell>
  );
}
