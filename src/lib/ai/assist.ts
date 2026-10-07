export type AssistKind =
  | "silence"
  | "scene"
  | "highlight"
  | "autocut"
  | "smartcrop";

export interface AssistProposal {
  id: string;
  kind: AssistKind;
  title: string;
  detail: string;
  start: number;
  end: number;
}

function rms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / Math.max(1, buffer.length));
}

export async function detectSilenceFromAudioBuffer(
  buffer: AudioBuffer,
  threshold = 0.02,
  minDuration = 0.45,
): Promise<AssistProposal[]> {
  const channel = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.05);
  const proposals: AssistProposal[] = [];
  let silentStart: number | null = null;

  for (let i = 0; i < channel.length; i += windowSize) {
    const slice = channel.subarray(i, Math.min(channel.length, i + windowSize));
    const level = rms(slice);
    const time = i / sampleRate;
    if (level < threshold) {
      if (silentStart === null) {
        silentStart = time;
      }
    } else if (silentStart !== null) {
      if (time - silentStart >= minDuration) {
        proposals.push({
          id: `silence-${proposals.length}`,
          kind: "silence",
          title: "Silence detected",
          detail: `Quiet section from ${silentStart.toFixed(2)}s to ${time.toFixed(2)}s`,
          start: silentStart,
          end: time,
        });
      }
      silentStart = null;
    }
  }

  return proposals;
}

export function proposeCutsFromSilence(
  silences: AssistProposal[],
): AssistProposal[] {
  return silences.map((item, index) => ({
    ...item,
    id: `cut-${index}`,
    kind: "autocut",
    title: "Suggested cut",
    detail: `Remove quiet section ${item.start.toFixed(1)}s–${item.end.toFixed(1)}s`,
  }));
}

export function proposeHighlightsFromPeaks(
  buffer: AudioBuffer,
): AssistProposal[] {
  const channel = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.5);
  const windows: Array<{ time: number; level: number }> = [];

  for (let i = 0; i < channel.length; i += windowSize) {
    windows.push({
      time: i / sampleRate,
      level: rms(channel.subarray(i, Math.min(channel.length, i + windowSize))),
    });
  }

  const sorted = [...windows].sort((a, b) => b.level - a.level).slice(0, 5);
  return sorted.map((item, index) => ({
    id: `highlight-${index}`,
    kind: "highlight",
    title: "Possible highlight",
    detail: `Louder moment near ${item.time.toFixed(1)}s`,
    start: item.time,
    end: item.time + 0.5,
  }));
}

export async function decodeMediaAudio(file: File): Promise<AudioBuffer> {
  const context = new AudioContext();
  const data = await file.arrayBuffer();
  return context.decodeAudioData(data.slice(0));
}

export function smartCropSuggestion(): AssistProposal {
  return {
    id: "smart-crop",
    kind: "smartcrop",
    title: "Smart crop",
    detail: "Center-weighted 9:16 crop suggested for short-form export. Apply only if you confirm.",
    start: 0,
    end: 0,
  };
}
