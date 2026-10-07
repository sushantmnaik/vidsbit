import { MediaFile, MediaType } from "@/types/editor";
import { createId } from "@/lib/id";
import { DEFAULT_IMAGE_DURATION } from "@/types/editor";

export function getMediaType(file: File): MediaType | null {
  if (file.type.startsWith("video/")) {
    return "video";
  }
  if (file.type.startsWith("audio/")) {
    return "audio";
  }
  if (file.type.startsWith("image/")) {
    return "image";
  }

  const name = file.name.toLowerCase();
  if (/\.(mp4|webm|mov|mkv|m4v)$/.test(name)) {
    return "video";
  }
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(name)) {
    return "audio";
  }
  if (/\.(png|jpe?g|gif|webp|bmp)$/.test(name)) {
    return "image";
  }

  return null;
}

export async function getMediaMetadata(
  file: File,
  type: MediaType,
): Promise<{ duration?: number; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);

    if (type === "image") {
      const image = new Image();
      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
          duration: DEFAULT_IMAGE_DURATION,
        });
        cleanup();
      };
      image.onerror = () => {
        cleanup();
        resolve({ duration: DEFAULT_IMAGE_DURATION });
      };
      image.src = url;
      return;
    }

    const element = document.createElement(type === "video" ? "video" : "audio");
    element.preload = "metadata";
    element.onloadedmetadata = () => {
      const duration = Number.isFinite(element.duration) ? element.duration : undefined;
      if (type === "video" && element instanceof HTMLVideoElement) {
        resolve({
          duration,
          width: element.videoWidth || undefined,
          height: element.videoHeight || undefined,
        });
      } else {
        resolve({ duration });
      }
      cleanup();
    };
    element.onerror = () => {
      cleanup();
      resolve({});
    };
    element.src = url;
  });
}

export async function importMediaFiles(files: FileList | File[]): Promise<{
  imported: MediaFile[];
  skipped: string[];
}> {
  const imported: MediaFile[] = [];
  const skipped: string[] = [];
  const list = Array.from(files);

  for (const file of list) {
    const type = getMediaType(file);
    if (!type) {
      skipped.push(file.name);
      continue;
    }

    try {
      const metadata = await getMediaMetadata(file, type);
      imported.push({
        id: createId("media"),
        name: file.name,
        type,
        file,
        url: URL.createObjectURL(file),
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        missing: false,
        reference: {
          fileName: file.name,
          size: file.size,
          lastModified: file.lastModified,
          mimeType: file.type,
        },
      });
    } catch (error) {
      console.error("Failed to import media", file.name, error);
      skipped.push(file.name);
    }
  }

  return { imported, skipped };
}

export function revokeMediaUrls(media: MediaFile[]): void {
  for (const item of media) {
    if (item.url) {
      URL.revokeObjectURL(item.url);
    }
  }
}

export function mediaStillUsed(
  mediaId: string,
  clips: { mediaId: string }[],
  extraIds: string[] = [],
): boolean {
  return clips.some((clip) => clip.mediaId === mediaId) || extraIds.includes(mediaId);
}
