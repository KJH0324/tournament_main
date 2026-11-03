import { ensureGateway } from "../../src/lib/discord/gateway";

export default function discordGatewayPlugin() {
  ensureGateway();
}
