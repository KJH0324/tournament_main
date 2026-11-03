import { createServerFn } from "@tanstack/react-start";
import { gatewaySnapshot, type GatewaySnapshot } from "./gateway-state";

export const getBotPresence = createServerFn({ method: "GET" }).handler(
  async (): Promise<Pick<GatewaySnapshot, "phase" | "user">> => {
    const { ensureGateway } = await import("./gateway");
    ensureGateway();
    const gateway = gatewaySnapshot();
    return { phase: gateway.phase, user: gateway.user };
  },
);
