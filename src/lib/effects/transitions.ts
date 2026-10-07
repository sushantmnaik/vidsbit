import { TimelineClip, TransitionType } from "@/types/editor";
import { clipEnd, clipPlaybackDuration } from "@/lib/editorMath";

export interface TransitionMix {
  outgoing: TimelineClip | null;
  incoming: TimelineClip | null;
  amount: number;
  type: TransitionType;
}

export function transitionAtTime(
  clips: TimelineClip[],
  time: number,
): TransitionMix | null {
  const visual = clips
    .filter((clip) => clip.trackKind !== "audio")
    .sort((a, b) => a.timelineStart - b.timelineStart);

  for (let i = 0; i < visual.length; i += 1) {
    const current = visual[i];
    const next = visual[i + 1];
    if (!current || current.transition === "none") {
      continue;
    }

    const duration = Math.min(
      current.transitionDuration || 0.4,
      clipPlaybackDuration(current) / 2,
    );
    const start = clipEnd(current) - duration;
    if (time >= start && time <= clipEnd(current) + (next ? 0 : 0)) {
      const amount = duration > 0 ? (time - start) / duration : 1;
      return {
        outgoing: current,
        incoming: next && next.timelineStart <= time + duration ? next : next ?? null,
        amount: Math.min(1, Math.max(0, amount)),
        type: current.transition,
      };
    }
  }

  return null;
}

export function fadeOpacity(
  clip: TimelineClip,
  time: number,
): number {
  const duration = clipPlaybackDuration(clip);
  const relative = time - clip.timelineStart;
  let opacity = clip.opacity;

  if (clip.fadeIn > 0 && relative < clip.fadeIn) {
    opacity *= relative / clip.fadeIn;
  }
  if (clip.fadeOut > 0 && relative > duration - clip.fadeOut) {
    opacity *= Math.max(0, (duration - relative) / clip.fadeOut);
  }

  if (clip.textAnimation === "fade" || clip.textAnimation === "scale") {
    const intro = Math.min(0.35, duration / 3);
    if (relative < intro) {
      opacity *= relative / intro;
    }
  }

  return Math.min(1, Math.max(0, opacity));
}

export function clipPlaybackDurationSafe(clip: TimelineClip): number {
  return clipPlaybackDuration(clip);
}
