import { commandCount, discordCommandPayload } from "./catalog";
import { guildIds } from "./protocol";
import { applicationId, botToken, discordApi } from "./rest";

export type RegisterState = {
  phase: "idle" | "ok" | "error" | "waiting";
  detail: string;
  count: number;
};

const globalRef = globalThis as {
  __ravenRegister?: RegisterState;
  __ravenRegisterTask?: Promise<void>;
};

export function registerState(): RegisterState {
  return (
    globalRef.__ravenRegister ?? {
      phase: botToken() ? "idle" : "waiting",
      detail: botToken() ? "아직 동기화하지 않았습니다." : "DISCORD_BOT_TOKEN 대기",
      count: commandCount(),
    }
  );
}

export function ensureRegistered(): Promise<void> {
  if (!botToken()) {
    globalRef.__ravenRegister = {
      phase: "waiting",
      detail: "DISCORD_BOT_TOKEN 대기",
      count: commandCount(),
    };
    return Promise.resolve();
  }
  if (!globalRef.__ravenRegisterTask) {
    globalRef.__ravenRegisterTask = registerCommands().catch((err: unknown) => {
      globalRef.__ravenRegisterTask = undefined;
      globalRef.__ravenRegister = {
        phase: "error",
        detail: err instanceof Error ? err.message : "등록 실패",
        count: commandCount(),
      };
    });
  }
  return globalRef.__ravenRegisterTask;
}

export async function registerCommands(): Promise<void> {
  const appId = await applicationId();
  const body = JSON.stringify(discordCommandPayload());
  const guilds = guildIds();
  for (const guildId of guilds) {
    await discordApi(`/applications/${appId}/guilds/${guildId}/commands`, { method: "PUT", body });
  }
  await discordApi(`/applications/${appId}/commands`, { method: "PUT", body });
  globalRef.__ravenRegister = {
    phase: "ok",
    detail: `전역 슬래시와 지정한 ${guilds.length}개 서버에 명령을 붙였습니다. 새 서버는 전역 명령이 퍼진 뒤 바로 쓸 수 있습니다.`,
    count: commandCount(),
  };
  globalRef.__ravenRegisterTask = Promise.resolve();
}
