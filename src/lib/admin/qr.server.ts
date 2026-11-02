import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export async function qrSvg(text: string): Promise<string> {
  const qr = require("qrcode") as {
    toString: (value: string, options: Record<string, unknown>) => Promise<string>;
  };
  const svg = await qr.toString(text, {
    type: "svg",
    margin: 1,
    width: 220,
    errorCorrectionLevel: "M",
    color: { dark: "#08111f", light: "#ffffff" },
  });
  if (!svg.startsWith("<svg")) throw new Error("QR을 만들지 못했습니다.");
  return svg;
}
