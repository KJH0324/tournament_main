import { useMemo, useState } from "react";
import type { ManualGroup } from "@/lib/discord/manual";
import { Pill } from "@/components/shell";

export function CommandList({ groups }: { groups: ManualGroup[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          rows: group.rows.filter((row) => {
            if (!needle) return true;
            const hay = `${row.usage} ${row.blurb} ${row.fields.map((field) => `${field.name} ${field.meaning}`).join(" ")}`.toLowerCase();
            return hay.includes(needle);
          }),
        }))
        .filter((group) => group.rows.length > 0),
    [groups, needle],
  );

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <a key={group.id} href={`#${group.id}`} className="mc-nav">
              {group.title}
            </a>
          ))}
        </nav>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="명령어, 옵션"
          className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm md:max-w-xs"
          aria-label="슬래시 명령어 찾기"
        />
      </div>
      <div className="mt-4 grid gap-4">
        {filtered.length === 0 ? <p className="mc-panel p-4 text-sm text-muted">해당하는 명령어가 없습니다.</p> : null}
        {filtered.map((group) => (
          <section key={group.id} id={group.id} className="mc-panel p-4">
            <h2 className="text-xl font-bold">{group.title}</h2>
            <ul className="mt-3 divide-y divide-line">
              {group.rows.map((row) => (
                <li key={row.usage} className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{row.usage}</p>
                    <Pill>{row.level}</Pill>
                    {row.botOnly ? <Pill tone="brass">봇 전용</Pill> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">{row.blurb}</p>
                  {row.fields.length === 0 ? null : (
                    <table className="mt-3 w-full text-left text-sm">
                      <thead className="text-xs text-muted">
                        <tr>
                          <th className="py-1 pr-3 font-medium">옵션</th>
                          <th className="py-1 pr-3 font-medium">의미</th>
                          <th className="py-1 font-medium">값</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.fields.map((field) => (
                          <tr key={field.name} className="border-t border-line align-top">
                            <td className="py-2 pr-3 font-medium">
                              {field.name}
                              <span className="mt-0.5 block text-xs text-muted">{field.required ? "필수" : "선택"}</span>
                            </td>
                            <td className="py-2 pr-3 text-muted">{field.meaning}</td>
                            <td className="py-2">{field.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
