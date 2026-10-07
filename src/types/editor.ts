export type MediaType = "video" | "audio" | "image";

export type TrackKind = "video" | "audio" | "overlay";

export type TransitionType =
  | "none"
  | "fade"
  | "crossfade"
  | "dipToBlack"
  | "slide";

export type FilterPreset =
  | "none"
  | "brightness"
  | "contrast"
  | "saturation"
  | "grayscale"
  | "sepia"
  | "blur";

export type CropPreset = "none" | "16:9" | "1:1" | "9:16" | "cinematic";

export type TextAnimation = "none" | "fade" | "slide" | "scale";

export type CaptionPreset =
  | "clean"
  | "bold"
  | "minimal"
  | "creator"
  | "karaoke";

export type CaptionAnimation =
  | "none"
  | "fade"
  | "slide-up"
  | "typewriter"
  | "karaoke";

export type AdvancedEffect =
  | "none"
  | "sharpen"
  | "vignette"
  | "glow"
  | "cinematic"
  | "dramatic";

export type ChromaKeyMode = "none" | "green" | "blue" | "magenta" | "custom";

export type BackgroundReplace = "none" | "color" | "image" | "video";

export interface MediaReference {
  fileName: string;
  relativePath?: string;
  size: number;
  lastModified: number;
  mimeType: string;
}

export interface MediaFile {
  id: string;
  name: string;
  type: MediaType;
  file: File | null;
  url: string | null;
  duration?: number;
  width?: number;
  height?: number;
  missing?: boolean;
  reference: MediaReference;
}

export interface EditorTrack {
  id: string;
  kind: TrackKind;
  name: string;
  order: number;
  muted: boolean;
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  sourceStart: number;
  sourceEnd: number;
  timelineStart: number;
  track: number;
  trackKind: TrackKind;
  speed: number;
  volume: number;
  muted: boolean;
  fadeIn: number;
  fadeOut: number;
  transition: TransitionType;
  transitionDuration: number;
  rotation: number;
  opacity: number;
  scale: number;
  posX: number;
  posY: number;
  crop: CropPreset;
  filter: FilterPreset;
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
  blur: number;
  textOverlay: string;
  textAnimation: TextAnimation;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textColor: string;
  textBackground: string;
  textAlign: "left" | "center" | "right";
  pictureInPicture: boolean;
  chromaKey: ChromaKeyMode;
  chromaColor: string;
  chromaTolerance: number;
  chromaSoftness: number;
  chromaSpill: number;
  backgroundRemoval: "none" | "auto";
  bgReplace: BackgroundReplace;
  bgReplaceColor: string;
  bgReplaceMediaId: string;
  advancedEffect: AdvancedEffect;
  snapEnabled?: boolean;
  captionStyle?: "classic" | "bold" | "minimal" | "cinematic";
  captionAnimation?: CaptionAnimation | "bounce";
  audioTrimStart?: number;
  audioTrimEnd?: number;
  backgroundMusic?: string;
  videoBackgroundRemoval?: "none" | "auto" | "portrait" | "cutout";
  imageBackgroundRemoval?: "none" | "remove" | "transparent" | "cutout";
  customSpeed?: number;
  customVolume?: number;
}

export interface TextLayer {
  id: string;
  text: string;
  start: number;
  end: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  background: string;
  align: "left" | "center" | "right";
  x: number;
  y: number;
  animation: TextAnimation;
}

export interface CaptionCue {
  id: string;
  text: string;
  start: number;
  end: number;
}

export interface CaptionStyle {
  preset: CaptionPreset;
  fontFamily: string;
  fontSize: number;
  color: string;
  stroke: string;
  shadow: boolean;
  background: string;
  position: "top" | "center" | "bottom";
  align: "left" | "center" | "right";
  animation: CaptionAnimation;
}

export interface ProjectSettings {
  width: number;
  height: number;
  frameRate: number;
}

export interface EditorState {
  media: MediaFile[];
  clips: TimelineClip[];
  tracks: EditorTrack[];
  texts: TextLayer[];
  captions: CaptionCue[];
  captionStyle: CaptionStyle;
  selectedClipId: string | null;
  selectedTextId: string | null;
  selectedCaptionId: string | null;
  currentTime: number;
  snapEnabled: boolean;
  settings: ProjectSettings;
}

export const PROJECT_FORMAT_VERSION = 1;

export const MIN_CLIP_DURATION = 0.1;

export const DEFAULT_IMAGE_DURATION = 5;

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  preset: "clean",
  fontFamily: "Arial",
  fontSize: 32,
  color: "#ffffff",
  stroke: "#000000",
  shadow: true,
  background: "rgba(0,0,0,0.45)",
  position: "bottom",
  align: "center",
  animation: "none",
};

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  width: 1280,
  height: 720,
  frameRate: 30,
};

export function defaultTracks(): EditorTrack[] {
  return [
    { id: "track-video-0", kind: "video", name: "Video 1", order: 0, muted: false },
    { id: "track-video-1", kind: "video", name: "Video 2 / PIP", order: 1, muted: false },
    { id: "track-overlay-0", kind: "overlay", name: "Overlay", order: 2, muted: false },
    { id: "track-audio-0", kind: "audio", name: "Audio 1", order: 3, muted: false },
    { id: "track-audio-1", kind: "audio", name: "Audio 2", order: 4, muted: false },
  ];
}

export function emptyEditorState(): EditorState {
  return {
    media: [],
    clips: [],
    tracks: defaultTracks(),
    texts: [],
    captions: [],
    captionStyle: { ...DEFAULT_CAPTION_STYLE },
    selectedClipId: null,
    selectedTextId: null,
    selectedCaptionId: null,
    currentTime: 0,
    snapEnabled: true,
    settings: { ...DEFAULT_PROJECT_SETTINGS },
  };
}

export function defaultClipFields(): Omit<
  TimelineClip,
  "id" | "mediaId" | "sourceStart" | "sourceEnd" | "timelineStart" | "track"
> {
  return {
    trackKind: "video",
    speed: 1,
    volume: 100,
    muted: false,
    fadeIn: 0,
    fadeOut: 0,
    transition: "none",
    transitionDuration: 0.4,
    rotation: 0,
    opacity: 1,
    scale: 1,
    posX: 0,
    posY: 0,
    crop: "none",
    filter: "none",
    brightness: 1,
    contrast: 1,
    saturation: 1,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    textOverlay: "",
    textAnimation: "none",
    fontFamily: "Arial",
    fontSize: 36,
    fontWeight: 700,
    textColor: "#ffffff",
    textBackground: "transparent",
    textAlign: "center",
    pictureInPicture: false,
    chromaKey: "none",
    chromaColor: "#00ff00",
    chromaTolerance: 0.32,
    chromaSoftness: 0.12,
    chromaSpill: 0.2,
    backgroundRemoval: "none",
    bgReplace: "none",
    bgReplaceColor: "#00ff00",
    bgReplaceMediaId: "",
    advancedEffect: "none",
  };
}

export function hydrateClip(raw: Partial<TimelineClip> & { id: string; mediaId: string }): TimelineClip {
  const defaults = defaultClipFields();
  const sourceStart = Number.isFinite(raw.sourceStart) ? Number(raw.sourceStart) : 0;
  const sourceEnd = Number.isFinite(raw.sourceEnd) ? Number(raw.sourceEnd) : sourceStart + MIN_CLIP_DURATION;
  const chromaFromLegacy =
    raw.chromaKey === "green" || raw.chromaKey === "blue" || raw.chromaKey === "magenta"
      ? raw.chromaKey
      : defaults.chromaKey;

  let backgroundRemoval: "none" | "auto" = raw.backgroundRemoval ?? "none";
  if (raw.videoBackgroundRemoval && raw.videoBackgroundRemoval !== "none") {
    backgroundRemoval = "auto";
  }
  if (raw.imageBackgroundRemoval && raw.imageBackgroundRemoval !== "none") {
    backgroundRemoval = "auto";
  }

  return {
    ...defaults,
    ...raw,
    sourceStart,
    sourceEnd: Math.max(sourceStart + MIN_CLIP_DURATION, sourceEnd),
    timelineStart: Number.isFinite(raw.timelineStart) ? Number(raw.timelineStart) : 0,
    track: Number.isFinite(raw.track) ? Number(raw.track) : 0,
    trackKind: raw.trackKind ?? (raw.track && raw.track >= 3 ? "audio" : "video"),
    speed: raw.customSpeed && raw.customSpeed > 0 ? raw.customSpeed : raw.speed && raw.speed > 0 ? raw.speed : 1,
    volume:
      raw.customVolume !== undefined
        ? raw.customVolume
        : Number.isFinite(raw.volume)
          ? Number(raw.volume)
          : 100,
    muted: Boolean(raw.muted),
    chromaKey: chromaFromLegacy,
    chromaColor:
      chromaFromLegacy === "green"
        ? "#00ff00"
        : chromaFromLegacy === "blue"
          ? "#0000ff"
          : chromaFromLegacy === "magenta"
            ? "#ff00ff"
            : raw.chromaColor ?? defaults.chromaColor,
    backgroundRemoval,
    pictureInPicture: Boolean(raw.pictureInPicture),
    opacity: Number.isFinite(raw.opacity) ? Number(raw.opacity) : 1,
    scale: Number.isFinite(raw.scale) ? Number(raw.scale) : raw.pictureInPicture ? 0.35 : 1,
    posX: Number.isFinite(raw.posX) ? (raw.posX === 0.5 ? 0 : Number(raw.posX)) : 0,
    posY: Number.isFinite(raw.posY) ? (raw.posY === 0.5 ? 0 : Number(raw.posY)) : 0,
  };
}

export function hydrateEditorState(partial: Partial<EditorState> | null | undefined): EditorState {
  const base = emptyEditorState();
  if (!partial) {
    return base;
  }

  return {
    ...base,
    ...partial,
    media: (partial.media ?? []).map((item) => ({
      ...item,
      file: item.file ?? null,
      url: item.url ?? null,
      missing: item.missing ?? !item.file,
      reference: item.reference ?? {
        fileName: item.name,
        size: item.file?.size ?? 0,
        lastModified: item.file?.lastModified ?? 0,
        mimeType: item.file?.type ?? "",
      },
    })),
    clips: (partial.clips ?? []).map((clip) => hydrateClip(clip)),
    tracks: partial.tracks && partial.tracks.length > 0 ? partial.tracks : base.tracks,
    texts: partial.texts ?? [],
    captions: partial.captions ?? [],
    captionStyle: { ...DEFAULT_CAPTION_STYLE, ...partial.captionStyle },
    settings: { ...DEFAULT_PROJECT_SETTINGS, ...partial.settings },
    snapEnabled: partial.snapEnabled ?? true,
  };
}

export const CAPTION_PRESETS: Record<CaptionPreset, Partial<CaptionStyle>> = {
  clean: {
    preset: "clean",
    fontFamily: "Arial",
    fontSize: 32,
    color: "#ffffff",
    stroke: "#111111",
    shadow: true,
    background: "rgba(0,0,0,0.35)",
    position: "bottom",
    align: "center",
    animation: "none",
  },
  bold: {
    preset: "bold",
    fontFamily: "Impact, Arial Black, Arial",
    fontSize: 42,
    color: "#ffffff",
    stroke: "#000000",
    shadow: true,
    background: "transparent",
    position: "bottom",
    align: "center",
    animation: "none",
  },
  minimal: {
    preset: "minimal",
    fontFamily: "Georgia, serif",
    fontSize: 26,
    color: "#f4f4f5",
    stroke: "transparent",
    shadow: false,
    background: "transparent",
    position: "bottom",
    align: "center",
    animation: "fade",
  },
  creator: {
    preset: "creator",
    fontFamily: "Arial Black, Arial",
    fontSize: 36,
    color: "#22d3ee",
    stroke: "#041016",
    shadow: true,
    background: "rgba(0,0,0,0.55)",
    position: "bottom",
    align: "center",
    animation: "slide-up",
  },
  karaoke: {
    preset: "karaoke",
    fontFamily: "Arial",
    fontSize: 34,
    color: "#facc15",
    stroke: "#111111",
    shadow: true,
    background: "rgba(0,0,0,0.4)",
    position: "bottom",
    align: "center",
    animation: "karaoke",
  },
};
