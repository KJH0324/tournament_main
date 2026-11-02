import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  type AutocompleteInteraction,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
} from "discord.js";
import { findCommand } from "./catalog";
import { makeContext } from "./context";
import { autocomplete, dispatch, onComponent } from "./dispatch";
import { gatewaySnapshot, writeGateway } from "./gateway-state";
import type { AttachmentRef, Person, Reply } from "./protocol";
import { ensureRegistered } from "./register";
import { botToken } from "./rest";

export type { GatewaySnapshot } from "./gateway-state";

const globalRef = globalThis as { __ravenClient?: Client };

function roleIds(interaction: Interaction): string[] {
  const member = interaction.member;
  if (member && "roles" in member && member.roles && typeof member.roles === "object" && "cache" in member.roles) {
    return [...member.roles.cache.keys()];
  }
  return [];
}

type WalkOpt = {
  name: string;
  type: ApplicationCommandOptionType;
  value?: string | number | boolean;
  options?: readonly WalkOpt[];
  user?: { id: string; username: string; globalName?: string | null };
  role?: { id: string; name: string };
  channel?: { id: string; name?: string | null };
  attachment?: { url: string; name: string; size: number; contentType?: string | null };
};

function fromCommand(interaction: ChatInputCommandInteraction | AutocompleteInteraction) {
  const sub = interaction.options.getSubcommand(false);
  const spec = findCommand(interaction.commandName, sub);
  const values: Record<string, string | number | boolean> = {};
  const users: Record<string, Person> = {};
  const channels: Record<string, Person> = {};
  const roles: Record<string, Person> = {};
  const attachments: Record<string, AttachmentRef> = {};
  let focused: string | null = null;
  const walk = (options: readonly WalkOpt[] | undefined) => {
    for (const opt of options ?? []) {
      if (opt.type === ApplicationCommandOptionType.Subcommand || opt.type === ApplicationCommandOptionType.SubcommandGroup) {
        walk(opt.options);
        continue;
      }
      if (opt.value != null) values[opt.name] = opt.value;
      if (opt.user) users[opt.name] = { id: opt.user.id, name: opt.user.globalName || opt.user.username };
      if (opt.role) roles[opt.name] = { id: opt.role.id, name: opt.role.name };
      if (opt.channel) channels[opt.name] = { id: opt.channel.id, name: opt.channel.name || opt.channel.id };
      if (opt.attachment) {
        attachments[opt.name] = {
          url: opt.attachment.url,
          filename: opt.attachment.name,
          size: opt.attachment.size,
          contentType: opt.attachment.contentType ?? "",
        };
      }
    }
  };
  walk(interaction.options.data as readonly WalkOpt[]);
  if (interaction.isAutocomplete()) focused = interaction.options.getFocused(true).name;
  return makeContext({
    key: spec?.key ?? interaction.commandName,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    userId: interaction.user.id,
    username: interaction.user.username,
    permissions: interaction.memberPermissions?.bitfield ?? 0n,
    roleIds: roleIds(interaction),
    focused,
    values,
    users,
    channels,
    roles,
    attachments,
  });
}

function fromButton(interaction: ButtonInteraction) {
  return makeContext({
    key: interaction.customId,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    userId: interaction.user.id,
    username: interaction.user.username,
    permissions: interaction.memberPermissions?.bitfield ?? 0n,
    roleIds: roleIds(interaction),
    focused: null,
    values: {},
    users: {},
    channels: {},
    roles: {},
    attachments: {},
  });
}

async function send(interaction: ChatInputCommandInteraction | ButtonInteraction, message: Reply) {
  const effect = message.sideEffect;
  const embed = new EmbedBuilder()
    .setTitle(
      message.title ??
        (message.tone === "success"
          ? "[SUCCESS] Sequence Completed"
          : message.tone === "error"
            ? "[ERROR] Critical Failure"
            : "[ALERT] System Notice"),
    )
    .setDescription(message.description)
    .setColor(message.tone === "success" ? 0x00ff41 : message.tone === "error" ? 0xff0000 : message.tone === "warning" ? 0xffd400 : 0x2f7bff)
    .setFooter({ text: "Mission Control | [UPLINK] Channel Operations" });
  for (const field of message.fields ?? []) {
    embed.addFields({ name: field.name.slice(0, 80) || "Field", value: field.value.slice(0, 900) || "—", inline: Boolean(field.inline) });
  }
  if (message.fileText) {
    embed.addFields({ name: "Packet", value: `\`\`\`\n${message.fileText.slice(0, 700)}\n\`\`\`` });
  }
  const rows = message.buttons?.length
    ? [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          message.buttons.slice(0, 5).map((button) =>
            new ButtonBuilder()
              .setCustomId(button.id)
              .setLabel(button.label.slice(0, 80))
              .setStyle(button.style === 1 ? ButtonStyle.Primary : button.style === 4 ? ButtonStyle.Danger : ButtonStyle.Secondary),
          ),
        ),
      ]
    : [];
  const flags = message.ephemeral ? MessageFlags.Ephemeral : undefined;
  if (interaction.replied || interaction.deferred) await interaction.followUp({ embeds: [embed], components: rows, flags });
  else await interaction.reply({ embeds: [embed], components: rows, flags });
  if (effect) await effect();
}

export function ensureGateway() {
  if (process.env.VERCEL) {
    writeGateway({
      phase: botToken() ? "offline" : "waiting",
      user: "",
      detail: botToken() ? "배포본은 인터랙션 주소로 명령을 받습니다." : "DISCORD_BOT_TOKEN 대기",
    });
    return;
  }
  if (globalRef.__ravenClient) return;
  if (!botToken()) {
    writeGateway({ phase: "waiting", user: "", detail: "DISCORD_BOT_TOKEN 대기" });
    return;
  }
  writeGateway({ phase: "connecting", user: "", detail: "접속 중" });
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  globalRef.__ravenClient = client;
  client.once(Events.ClientReady, (ready) => {
    writeGateway({ phase: "online", user: ready.user.tag, detail: "게이트웨이 연결" });
    void ensureRegistered();
  });
  client.on("error", () => {
    writeGateway({ phase: "error", user: gatewaySnapshot().user, detail: "연결 오류" });
  });
  client.on(Events.InteractionCreate, (interaction) => {
    void (async () => {
      try {
        if (interaction.isAutocomplete()) {
          const choices = await autocomplete(fromCommand(interaction));
          await interaction.respond(choices.slice(0, 25));
          return;
        }
        if (interaction.isButton()) {
          await send(interaction, await onComponent(interaction.customId, fromButton(interaction)));
          return;
        }
        if (interaction.isChatInputCommand()) {
          await send(interaction, await dispatch(fromCommand(interaction)));
        }
      } catch (err) {
        console.error("[discord] interaction", err instanceof Error ? err.message : "error");
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "[ERROR] Command failed.", flags: MessageFlags.Ephemeral }).catch(() => undefined);
        }
      }
    })();
  });
  void client.login(botToken()).catch((err: unknown) => {
    globalRef.__ravenClient = undefined;
    writeGateway({ phase: "error", user: "", detail: "로그인 실패. 토큰을 확인하세요." });
    console.error("[discord] login", err instanceof Error ? err.message : "error");
  });
}
