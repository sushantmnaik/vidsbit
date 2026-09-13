export type MediaType = "video" | "audio" | "image";

export interface MediaFile {
  id: string;
  name: string;
  type: MediaType;
  file: File;
  url: string;
  duration?: number;
}

export interface TimelineClip {
  id: string;
  mediaId: string;

  startTime: number;
  endTime: number;

  timelineStart: number;

  track: number;
}