export type GatewaySnapshot = {
  phase: "waiting" | "connecting" | "online" | "offline" | "error";
  user: string;
  detail: string;
};

const globalRef = globalThis as { __ravenGateway?: GatewaySnapshot };

export function writeGateway(state: GatewaySnapshot) {
  globalRef.__ravenGateway = state;
}

export function gatewaySnapshot(): GatewaySnapshot {
  if (globalRef.__ravenGateway) return globalRef.__ravenGateway;
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  return {
    phase: token ? "offline" : "waiting",
    user: "",
    detail: token ? "배포본은 인터랙션 주소로 명령을 받습니다." : "DISCORD_BOT_TOKEN 대기",
  };
}
