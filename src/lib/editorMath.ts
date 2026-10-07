import {
  MIN_CLIP_DURATION,
  TimelineClip,
  MediaFile,
  TrackKind,
} from "@/types/editor";

export function clipSourceDuration(clip: TimelineClip): number {
  return Math.max(0, clip.sourceEnd - clip.sourceStart);
}

export function clipSpeed(clip: TimelineClip): number {
  const speed = clip.customSpeed && clip.customSpeed > 0 ? clip.customSpeed : clip.speed;
  return speed > 0 ? speed : 1;
}

export function clipPlaybackDuration(clip: TimelineClip): number {
  return clipSourceDuration(clip) / clipSpeed(clip);
}

export function clipEnd(clip: TimelineClip): number {
  return clip.timelineStart + clipPlaybackDuration(clip);
}

export function timelineDuration(clips: TimelineClip[], texts: { end: number }[] = [], captions: { end: number }[] = []): number {
  let max = 0.1;
  for (const clip of clips) {
    max = Math.max(max, clipEnd(clip));
  }
  for (const text of texts) {
    max = Math.max(max, text.end);
  }
  for (const caption of captions) {
    max = Math.max(max, caption.end);
  }
  return max;
}

export function isClipActive(clip: TimelineClip, time: number): boolean {
  const end = clipEnd(clip);
  return time >= clip.timelineStart - 0.0001 && time < end;
}

export function sourceTimeAt(clip: TimelineClip, timelineTime: number): number {
  const relative = Math.max(0, timelineTime - clip.timelineStart);
  return clip.sourceStart + relative * clipSpeed(clip);
}

export function clipsAtTime(clips: TimelineClip[], time: number): TimelineClip[] {
  return clips
    .filter((clip) => isClipActive(clip, time))
    .sort((a, b) => a.track - b.track);
}

export function visualClipsAtTime(clips: TimelineClip[], time: number): TimelineClip[] {
  return clipsAtTime(clips, time).filter((clip) => clip.trackKind !== "audio");
}

export function audioClipsAtTime(clips: TimelineClip[], time: number): TimelineClip[] {
  return clipsAtTime(clips, time).filter((clip) => {
    const mediaKind = clip.trackKind;
    return mediaKind === "audio" || mediaKind === "video";
  });
}

export function clipsOverlap(a: TimelineClip, b: TimelineClip): boolean {
  if (a.id === b.id || a.track !== b.track) {
    return false;
  }
  return a.timelineStart < clipEnd(b) && clipEnd(a) > b.timelineStart;
}

export function findOverlaps(
  clip: TimelineClip,
  others: TimelineClip[],
): TimelineClip[] {
  return others.filter((other) => clipsOverlap(clip, other));
}

export function nextFreeStart(
  clips: TimelineClip[],
  track: number,
  duration: number,
): number {
  const onTrack = clips
    .filter((clip) => clip.track === track)
    .sort((a, b) => a.timelineStart - b.timelineStart);

  let cursor = 0;
  for (const clip of onTrack) {
    if (clip.timelineStart >= cursor + duration) {
      return cursor;
    }
    cursor = Math.max(cursor, clipEnd(clip));
  }
  return cursor;
}

export function resolveNonOverlap(
  moving: TimelineClip,
  clips: TimelineClip[],
): TimelineClip {
  const others = clips.filter((clip) => clip.id !== moving.id);
  const collisions = findOverlaps(moving, others);
  if (collisions.length === 0) {
    return moving;
  }

  const latest = collisions.reduce(
    (max, clip) => Math.max(max, clipEnd(clip)),
    moving.timelineStart,
  );

  return {
    ...moving,
    timelineStart: latest,
  };
}

export function snapTime(
  time: number,
  clips: TimelineClip[],
  playhead: number,
  enabled: boolean,
  threshold = 0.12,
  extra: number[] = [],
): number {
  if (!enabled) {
    return Math.max(0, time);
  }

  const candidates = [0, playhead, ...extra];
  for (const clip of clips) {
    candidates.push(clip.timelineStart);
    candidates.push(clipEnd(clip));
  }

  let best = time;
  let bestDistance = threshold;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - time);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return Math.max(0, best);
}

export function pixelsToSeconds(pixels: number, zoom: number): number {
  return pixels / Math.max(20, zoom);
}

export function mediaDuration(item: MediaFile | undefined, fallback = 5): number {
  if (!item) {
    return fallback;
  }
  if (item.type === "image") {
    return item.duration && item.duration > 0 ? item.duration : fallback;
  }
  return item.duration && item.duration > 0 ? item.duration : fallback;
}

export function trackKindForMedia(
  type: MediaFile["type"],
  pictureInPicture = false,
): TrackKind {
  if (type === "audio") {
    return "audio";
  }
  if (pictureInPicture) {
    return "overlay";
  }
  return "video";
}

export function canPlaceOnTrack(
  mediaType: MediaFile["type"],
  trackKind: TrackKind,
): boolean {
  if (mediaType === "audio") {
    return trackKind === "audio";
  }
  return trackKind === "video" || trackKind === "overlay";
}

export function splitClip(
  clip: TimelineClip,
  time: number,
  createId: (prefix: string) => string,
): [TimelineClip, TimelineClip] | null {
  if (!isClipActive(clip, time)) {
    return null;
  }

  const splitSource = sourceTimeAt(clip, time);
  if (
    splitSource <= clip.sourceStart + MIN_CLIP_DURATION ||
    splitSource >= clip.sourceEnd - MIN_CLIP_DURATION
  ) {
    return null;
  }

  const first: TimelineClip = {
    ...clip,
    id: createId("clip"),
    sourceEnd: splitSource,
  };

  const second: TimelineClip = {
    ...clip,
    id: createId("clip"),
    sourceStart: splitSource,
    timelineStart: time,
  };

  return [first, second];
}

export function applyTrim(
  clip: TimelineClip,
  handle: "start" | "end",
  deltaSeconds: number,
  maxSource: number,
): TimelineClip {
  const speed = clipSpeed(clip);
  const sourceDelta = deltaSeconds * speed;

  if (handle === "start") {
    const nextStart = Math.min(
      clip.sourceEnd - MIN_CLIP_DURATION,
      Math.max(0, clip.sourceStart + sourceDelta),
    );
    const used = nextStart - clip.sourceStart;
    return {
      ...clip,
      sourceStart: nextStart,
      timelineStart: Math.max(0, clip.timelineStart + used / speed),
    };
  }

  const nextEnd = Math.min(
    maxSource,
    Math.max(clip.sourceStart + MIN_CLIP_DURATION, clip.sourceEnd + sourceDelta),
  );

  return {
    ...clip,
    sourceEnd: nextEnd,
  };
}
