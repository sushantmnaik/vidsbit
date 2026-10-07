import { CaptionCue } from "@/types/editor";
import { createId } from "@/lib/id";

export function parseSrt(content: string): CaptionCue[] {
  const blocks = content.replace(/\r/g, "").split(/\n\n+/);
  const cues: CaptionCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) {
      continue;
    }

    const timeLine = lines.find((line) => line.includes("-->"));
    if (!timeLine) {
      continue;
    }

    const [startRaw, endRaw] = timeLine.split("-->").map((part) => part.trim());
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);
    const text = lines
      .filter((line) => line !== timeLine && !/^\d+$/.test(line))
      .join(" ")
      .trim();

    if (text && end > start) {
      cues.push({
        id: createId("cap"),
        text,
        start,
        end,
      });
    }
  }

  return cues;
}

export function parseVtt(content: string): CaptionCue[] {
  const withoutHeader = content.replace(/^WEBVTT[^\n]*\n+/i, "");
  return parseSrt(withoutHeader.replace(/\./g, ","));
}

function parseTimestamp(value: string): number {
  const clean = value.replace(",", ".");
  const parts = clean.split(":");
  if (parts.length === 3) {
    return (
      Number(parts[0]) * 3600 +
      Number(parts[1]) * 60 +
      Number(parts[2])
    );
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  return Number(clean) || 0;
}

export function captionsToSrt(cues: CaptionCue[]): string {
  return cues
    .map((cue, index) => {
      return `${index + 1}\n${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}\n${cue.text}\n`;
    })
    .join("\n");
}

function formatSrtTime(seconds: number): string {
  const ms = Math.floor((seconds % 1) * 1000)
    .toString()
    .padStart(3, "0");
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s},${ms}`;
}

export function splitCaption(cue: CaptionCue): [CaptionCue, CaptionCue] | null {
  const mid = (cue.start + cue.end) / 2;
  if (cue.end - cue.start < 0.4) {
    return null;
  }
  const words = cue.text.split(/\s+/);
  const half = Math.max(1, Math.floor(words.length / 2));
  return [
    { ...cue, id: createId("cap"), end: mid, text: words.slice(0, half).join(" ") },
    { ...cue, id: createId("cap"), start: mid, text: words.slice(half).join(" ") },
  ];
}

export function mergeCaptions(a: CaptionCue, b: CaptionCue): CaptionCue {
  const first = a.start <= b.start ? a : b;
  const second = first === a ? b : a;
  return {
    id: createId("cap"),
    text: `${first.text} ${second.text}`.trim(),
    start: first.start,
    end: Math.max(first.end, second.end),
  };
}

export function captionsFromScript(script: string, duration: number): CaptionCue[] {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length === 0 || duration <= 0) {
    return [];
  }

  const slice = duration / sentences.length;
  return sentences.map((text, index) => ({
    id: createId("cap"),
    text,
    start: index * slice,
    end: Math.min(duration, (index + 1) * slice),
  }));
}
