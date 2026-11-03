import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { replyTicket, closeTicket, type InboxTicket, type TicketCategory } from "@/lib/raven/api";
import { TICKET_LABEL } from "@/lib/raven/format";
import { formatKst } from "@/lib/raven/format";
import { Button, Label, AreaField } from "@/components/ui";
import { ErrorNote } from "@/components/shell";
import type { MailResult } from "@/lib/mail/resend";

function mailNote(mail: MailResult): string {
  if (mail === "sent") return "답변을 저장하고 메일로 보냈습니다.";
  if (mail === "no_key") return "답변은 저장했습니다. 메일 키가 없습니다.";
  return "답변은 저장했습니다. 메일은 나가지 않았습니다.";
}

export function TicketInbox({ tickets }: { tickets: InboxTicket[] }) {
  const [filter, setFilter] = useState<TicketCategory | "all" | "open">("open");
  const shown = tickets.filter((ticket) => {
    if (filter === "open") return ticket.status === "open";
    if (filter === "all") return true;
    return ticket.category === filter;
  });
  const filters: { id: TicketCategory | "all" | "open"; label: string }[] = [
    { id: "open", label: "열림" },
    { id: "all", label: "전체" },
    { id: "bug", label: TICKET_LABEL.bug },
    { id: "report", label: TICKET_LABEL.report },
    { id: "bot", label: TICKET_LABEL.bot },
    { id: "emergency", label: TICKET_LABEL.emergency },
  ];
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">문의</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === filter ? "mc-nav is-active" : "mc-nav"}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {shown.length === 0 ? <li className="py-4 text-sm text-muted">문의가 없습니다.</li> : null}
        {shown.map((ticket) => (
          <TicketRow key={ticket.id} ticket={ticket} />
        ))}
      </ul>
    </section>
  );
}

function TicketRow({ ticket }: { ticket: InboxTicket }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await replyTicket({ data: { id: ticket.id, reply } });
      setNotice(mailNote(result.mail));
      await router.invalidate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "보내지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function close() {
    setPending(true);
    setError("");
    try {
      await closeTicket({ data: { id: ticket.id } });
      await router.invalidate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "닫지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="py-4">
      <p className="text-sm text-muted">
        #{ticket.id} · {TICKET_LABEL[ticket.category]} · {ticket.server} · {formatKst(ticket.createdAt)}
      </p>
      <p className="mt-1 font-semibold">
        {ticket.handle} · {ticket.discordId}
      </p>
      <p className="text-sm text-muted">{ticket.email || "메일 없음"}</p>
      <p className="mt-2 whitespace-pre-wrap">{ticket.body}</p>
      {ticket.reply ? (
        <p className="mt-3 whitespace-pre-wrap border-t border-line pt-3 text-sm">답변 {ticket.reply}</p>
      ) : ticket.status === "open" ? (
        <form onSubmit={submit} className="mt-3 grid gap-2">
          <Label htmlFor={`reply-${ticket.id}`}>답변</Label>
          <AreaField id={`reply-${ticket.id}`} value={reply} maxLength={1000} onChange={(event) => setReply(event.target.value)} required />
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {notice ? <p className="text-sm text-ok">{notice}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || !ticket.email}>
              {pending ? "보내는 중" : "답변 등록"}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => void close()}>
              닫기
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted">닫힘</p>
      )}
    </li>
  );
}
