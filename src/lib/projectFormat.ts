import {
  EditorState,
  MediaFile,
  PROJECT_FORMAT_VERSION,
  hydrateEditorState,
} from "@/types/editor";

export interface VidsbitProjectFile {
  version: number;
  format: "vidsbit";
  name: string;
  exportedAt: number;
  state: Omit<EditorState, "media"> & {
    media: Array<Omit<MediaFile, "file" | "url"> & { file?: undefined; url?: undefined }>;
  };
}

export function serializeProject(
  name: string,
  state: EditorState,
): VidsbitProjectFile {
  return {
    version: PROJECT_FORMAT_VERSION,
    format: "vidsbit",
    name,
    exportedAt: Date.now(),
    state: {
      ...state,
      media: state.media.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        duration: item.duration,
        width: item.width,
        height: item.height,
        missing: true,
        reference: item.reference,
        file: undefined,
        url: undefined,
      })),
      clips: state.clips,
      tracks: state.tracks,
      texts: state.texts,
      captions: state.captions,
      captionStyle: state.captionStyle,
      selectedClipId: state.selectedClipId,
      selectedTextId: state.selectedTextId,
      selectedCaptionId: state.selectedCaptionId,
      currentTime: state.currentTime,
      snapEnabled: state.snapEnabled,
      settings: state.settings,
    },
  };
}

export function parseProjectFile(json: string): {
  name: string;
  state: EditorState;
} {
  const parsed = JSON.parse(json) as VidsbitProjectFile;
  if (parsed.format !== "vidsbit") {
    throw new Error("This file is not a VIDSBIT project.");
  }

  return {
    name: parsed.name || "Imported project",
    state: hydrateEditorState({
      ...parsed.state,
      media: parsed.state.media.map((item) => ({
        ...item,
        file: null,
        url: null,
        missing: true,
      })),
    }),
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
