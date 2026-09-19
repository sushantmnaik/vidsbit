export type MediaType = "video" | "audio" | "image";

export interface MediaFile {
  id: string;
  name: string;
  type: MediaType;
  file: File;
  url: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface TimelineClip {
  id: string;
  mediaId: string;

  // Portion of the source media used by this clip
  sourceStart: number;
  sourceEnd: number;

  // Position on the editor timeline
  timelineStart: number;

  // Track/layer
  track: number;
}

export interface EditorState {
  media: MediaFile[];
  clips: TimelineClip[];
  selectedClipId: string | null;
  currentTime: number;
}