"use client";

export interface StoryCardInput {
  filename: string;
  kicker: string;
  title: string;
  priceLine: string;
  detailLine: string;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number) {
  let size = start;
  while (size > 34) {
    ctx.font = `900 ${size}px Arial Black, Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

export async function shareStoryCard(input: StoryCardInput): Promise<"shared" | "downloaded"> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  ctx.fillStyle = "#0A0A0C";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glow = ctx.createRadialGradient(820, 320, 0, 820, 320, 620);
  glow.addColorStop(0, "rgba(217,255,61,.22)");
  glow.addColorStop(1, "rgba(217,255,61,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, 1000);

  ctx.fillStyle = "#EDEBE4";
  ctx.font = "900 74px Arial Black, Arial, sans-serif";
  ctx.fillText("SPOTTED", 86, 140);
  ctx.fillStyle = "#D9FF3D";
  ctx.beginPath();
  ctx.arc(478, 112, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(237,235,228,.16)";
  ctx.lineWidth = 3;
  ctx.strokeRect(70, 245, 940, 1280);

  ctx.fillStyle = "#D9FF3D";
  ctx.font = "700 28px monospace";
  ctx.letterSpacing = "4px";
  ctx.fillText(input.kicker.toUpperCase(), 110, 350);

  ctx.fillStyle = "#EDEBE4";
  const titleSize = fitText(ctx, input.title.toUpperCase(), 850, 96);
  ctx.font = `900 ${titleSize}px Arial Black, Arial, sans-serif`;
  const words = input.title.toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > 850 && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  lines.slice(0, 4).forEach((text, index) => ctx.fillText(text, 110, 540 + index * (titleSize + 18)));

  ctx.fillStyle = "#D9FF3D";
  ctx.font = "900 92px Arial Black, Arial, sans-serif";
  ctx.fillText(input.priceLine, 110, 1110);

  ctx.fillStyle = "rgba(237,235,228,.62)";
  ctx.font = "700 28px monospace";
  ctx.fillText(input.detailLine.toUpperCase(), 110, 1180);

  ctx.fillStyle = "#D9FF3D";
  ctx.fillRect(110, 1380, 860, 8);
  ctx.fillStyle = "rgba(237,235,228,.42)";
  ctx.font = "700 24px monospace";
  ctx.fillText("PRICES FALL EVERY HOUR. CATCH THEM FIRST.", 110, 1460);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("image export failed"))), "image/png"),
  );
  const file = new File([blob], input.filename, { type: "image/png" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "SPOTTED" });
    return "shared";
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = input.filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
