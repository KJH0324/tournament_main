import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createTicket, type TicketCategory } from "@/lib/raven/api";
import { TICKET_LABEL } from "@/lib/raven/format";
import { listServers } from "@/lib/guilds/board";
import { ErrorNote, PageHead, Shell } from "@/components/shell";
import { AreaField, Button, Label, TextField, controlClass } from "@/components/ui";
import type { MailResult } from "@/lib/mail/resend";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "문의 · KJH Bot" }] }),
  loader: () => listServers(),
  component: SupportPage,
});

const categories: TicketCategory[] = ["bug", "report", "bot", "emergency"];

function mailNote(mail: MailResult | "none"): string {
  if (mail === "sent") return "접수했습니다. 비상 알림을 보냈습니다.";
  if (mail === "no_recipient") return "접수했습니다. 이 서버는 수신 메일이 없습니다.";
  if (mail === "none") return "접수했습니다.";
  return "접수했습니다. 알림 메일은 나가지 않았습니다.";
}

function SupportPage() {
  const { servers } = Route.useLoaderData();
  const [category, setCategory] = useState<TicketCategory>("bug");
  const [slug, setSlug] = useState(servers[0]?.slug ?? "");
  const [handle, setHandle] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (!slug) {
        setError("서버를 고르세요.");
        return;
      }
      const result = await createTicket({
        data: { category, handle, discordId, email, body, slug },
      });
      setHandle("");
      setDiscordId("");
      setEmail("");
      setBody("");
      setNotice(mailNote(result.mail));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "보내지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Shell>
      <PageHead title="문의">답은 적은 메일로 갑니다.</PageHead>

      <form onSubmit={submit} className="mc-panel mt-8 grid gap-4 p-4 md:p-5">
        <fieldset>
          <legend className="mb-2 text-sm text-muted">종류</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <Button
                key={item}
                type="button"
                variant={category === item ? "primary" : "ghost"}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {TICKET_LABEL[item]}
              </Button>
            ))}
          </div>
        </fieldset>
        <div>
          <Label htmlFor="server">서버</Label>
          {servers.length === 0 ? (
            <p className="text-sm text-muted">등록된 서버가 없습니다.</p>
          ) : (
            <select id="server" className={controlClass} value={slug} onChange={(event) => setSlug(event.target.value)} required>
              {servers.map((server) => (
                <option key={server.slug} value={server.slug}>
                  {server.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <Label htmlFor="handle">디스코드 닉네임</Label>
          <TextField id="handle" value={handle} maxLength={24} onChange={(event) => setHandle(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="discord-id">디스코드 아이디</Label>
          <TextField
            id="discord-id"
            value={discordId}
            maxLength={32}
            autoComplete="off"
            onChange={(event) => setDiscordId(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">이메일</Label>
          <TextField
            id="email"
            type="email"
            value={email}
            maxLength={120}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="body">무슨 일이 있었나요?</Label>
          <AreaField id="body" value={body} maxLength={280} onChange={(event) => setBody(event.target.value)} required />
        </div>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        {notice ? <p className="text-sm text-ok">{notice}</p> : null}
        <div>
          <Button type="submit" disabled={pending || servers.length === 0}>
            {pending ? "보내는 중" : category === "emergency" ? "운영진에게 비상 알림 보내기" : "문의 보내기"}
          </Button>
        </div>
      </form>
    </Shell>
  );
}
