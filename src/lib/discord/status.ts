import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { commandCount, groups, rootCommands } from "./catalog";
import { gatewaySnapshot } from "./gateway-state";
import { currentGuild, loadConfig } from "./store";
import type { RegisterState } from "./register";

export type NextMatch = {
  team1: string;
  team2: string;
  roundLabel: string;
  groupLabel: string;
  startsAt: string | null;
  roomName: string;
  status: string;
};

const MATRIX = ["admin_role", "organizer_role", "supervisor_role", "operator_role", "commander_role"] as const;

export const getBotStatus = createServerFn({ method: "GET" }).handler(async () => {
  await import("./register").then((mod) => mod.ensureRegistered()).catch(() => undefined);
  const gateway = gatewaySnapshot();
  const registration: RegisterState = await import("./register")
    .then((mod) => mod.registerState())
    .catch(() => ({ phase: "error" as const, detail: "등록 상태를 읽지 못했습니다.", count: commandCount() }));
  const config = await loadConfig();
  const missingRoles = MATRIX.filter((field) => !config[field]);
  const sql = await getSql();
  const rows = await sql<{
    team1: string;
    team2: string;
    round_label: string;
    group_label: string;
    starts_at: string | Date | null;
    room_name: string;
    status: string;
  }>`
    select team1, team2, round_label, group_label, starts_at, room_name, status
    from matches
    where guild_id = ${currentGuild()} and status <> 'done'
    order by starts_at nulls last, id asc
    limit 1
  `;
  const row = rows[0];
  const next: NextMatch | null = row
    ? {
        team1: row.team1,
        team2: row.team2,
        roundLabel: row.round_label,
        groupLabel: row.group_label,
        startsAt: row.starts_at instanceof Date ? row.starts_at.toISOString() : row.starts_at,
        roomName: row.room_name,
        status: row.status,
      }
    : null;
  return {
    tokenSet: Boolean(process.env.DISCORD_BOT_TOKEN?.trim()),
    publicKeySet: Boolean(process.env.DISCORD_PUBLIC_KEY?.trim()),
    commandCount: commandCount(),
    registration,
    gateway,
    missingRoles,
    next,
    groups: groups.map((group) => ({
      name: group.name,
      description: group.description,
      commands: group.commands.map((command) => ({
        name: command.name,
        description: command.description,
        level: command.level,
      })),
    })),
    roots: rootCommands.map((command) => ({
      name: command.name,
      description: command.description,
      level: command.level,
    })),
  };
});
