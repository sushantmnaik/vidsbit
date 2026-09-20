import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { MediaFile, TimelineClip } from "@/types/editor";

export type ExportStage =
  | "loading"
  | "preparing"
  | "rendering"
  | "finalizing";

interface ExportOptions {
  onStage?: (stage: ExportStage) => void;
  onProgress?: (progress: number) => void;
}

let ffmpeg: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;

async function getFFmpeg(
  onProgress?: (progress: number) => void,
): Promise<FFmpeg> {
  if (ffmpeg) {
    return ffmpeg;
  }

  if (ffmpegLoading) {
    return ffmpegLoading;
  }

  ffmpegLoading = (async () => {
    const instance = new FFmpeg();

    instance.on("progress", ({ progress }) => {
      onProgress?.(
        Math.max(0, Math.min(1, progress)),
      );
    });

    instance.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    const origin = window.location.origin;

    const coreURL =
      `${origin}/ffmpeg/core/ffmpeg-core.js`;

    const wasmURL =
      `${origin}/ffmpeg/core/ffmpeg-core.wasm`;

    const classWorkerURL =
      `${origin}/ffmpeg/worker.js`;

    console.log(
      "FFmpeg core:",
      coreURL,
    );

    console.log(
      "FFmpeg wasm:",
      wasmURL,
    );

    console.log(
      "FFmpeg worker:",
      classWorkerURL,
    );

    await instance.load({
      coreURL,
      wasmURL,
      classWorkerURL,
    });

    ffmpeg = instance;

    console.log(
      "FFmpeg loaded successfully.",
    );

    return instance;
  })();

  try {
    return await ffmpegLoading;
  } catch (error) {
    ffmpegLoading = null;
    throw error;
  }
}

export async function exportVideo(
  media: MediaFile[],
  clips: TimelineClip[],
  options: ExportOptions = {},
): Promise<Blob> {
  if (clips.length === 0) {
    throw new Error(
      "There is nothing to export.",
    );
  }

  options.onStage?.("loading");
  options.onProgress?.(0);

  const engine = await getFFmpeg(
    options.onProgress,
  );

  /*
   * ---------------------------------------------------------
   * 1. Find video clips and preserve timeline order
   * ---------------------------------------------------------
   */

  const videoClips = [...clips]
    .sort(
      (a, b) =>
        a.timelineStart - b.timelineStart,
    )
    .filter((clip) => {
      const item = media.find(
        (mediaItem) =>
          mediaItem.id === clip.mediaId,
      );

      return item?.type === "video";
    });

  if (videoClips.length === 0) {
    throw new Error(
      "There are no video clips to export.",
    );
  }

  /*
   * ---------------------------------------------------------
   * 2. Validate clips
   * ---------------------------------------------------------
   */

  for (const clip of videoClips) {
    if (
      !Number.isFinite(clip.sourceStart) ||
      !Number.isFinite(clip.sourceEnd)
    ) {
      throw new Error(
        "One of the clips has an invalid trim range.",
      );
    }

    if (
      clip.sourceEnd <= clip.sourceStart
    ) {
      throw new Error(
        "One of the clips has an empty trim range.",
      );
    }
  }

  options.onStage?.("preparing");

  /*
   * ---------------------------------------------------------
   * 3. Write source videos into FFmpeg filesystem
   * ---------------------------------------------------------
   *
   * We only write each unique media file once.
   *
   * Example:
   *
   * clip 1 -> videoA.mp4
   * clip 2 -> videoB.mp4
   * clip 3 -> videoA.mp4
   *
   * videoA is written only once.
   */

  const mediaFileNames = new Map<
    string,
    string
  >();

  const uniqueVideoMedia = videoClips
    .map((clip) =>
      media.find(
        (item) =>
          item.id === clip.mediaId,
      ),
    )
    .filter(
      (
        item,
      ): item is MediaFile => {
        if (!item) {
          return false;
        }

        return item.type === "video";
      },
    );

  const uniqueMedia = Array.from(
    new Map(
      uniqueVideoMedia.map((item) => [
        item.id,
        item,
      ]),
    ).values(),
  );

  for (
    let index = 0;
    index < uniqueMedia.length;
    index++
  ) {
    const item = uniqueMedia[index];

    if (!item) {
      throw new Error(
        "One of the media files is missing during export preparation.",
      );
    }

    const filename =
      `source_${index}.mp4`;

    mediaFileNames.set(
      item.id,
      filename,
    );

    console.log(
      `Writing source media ${index + 1}/${uniqueMedia.length}:`,
      item.name,
    );

    await engine.writeFile(
      filename,
      await fetchFile(item.file),
    );

    /*
     * Preparing progress occupies roughly 0–20%.
     */
    options.onProgress?.(
      ((index + 1) /
        uniqueMedia.length) *
        0.2,
    );
  }

  /*
   * ---------------------------------------------------------
   * 4. Create individually trimmed clips
   * ---------------------------------------------------------
   *
   * Each timeline clip becomes:
   *
   * trimmed_0.mp4
   * trimmed_1.mp4
   * trimmed_2.mp4
   * ...
   *
   * We re-encode these clips into the same format so FFmpeg
   * can safely concatenate them.
   */

  const trimmedFiles: string[] = [];

  for (
    let index = 0;
    index < videoClips.length;
    index++
  ) {
    const clip =
      videoClips[index];

    const sourceMedia =
      media.find(
        (item) =>
          item.id === clip.mediaId,
      );

    if (!sourceMedia) {
      throw new Error(
        `Could not find media for clip ${index + 1}.`,
      );
    }

    const inputFile =
      mediaFileNames.get(
        sourceMedia.id,
      );

    if (!inputFile) {
      throw new Error(
        `Could not prepare source media for "${sourceMedia.name}".`,
      );
    }

    const outputFile =
      `trimmed_${index}.mp4`;

    const duration =
      clip.sourceEnd -
      clip.sourceStart;

    console.log(
      `Rendering clip ${index + 1}/${videoClips.length}:`,
      sourceMedia.name,
      `(${clip.sourceStart}s → ${clip.sourceEnd}s)`,
    );

    await engine.exec([
      "-ss",
      String(clip.sourceStart),

      "-i",
      inputFile,

      "-t",
      String(duration),

      "-map",
      "0:v:0",

      "-c:v",
      "libx264",

      "-preset",
      "veryfast",

      "-crf",
      "23",

      "-pix_fmt",
      "yuv420p",

      "-an",

      "-movflags",
      "+faststart",

      outputFile,
    ]);

    trimmedFiles.push(
      outputFile,
    );

    /*
     * Rendering occupies roughly 20–90%.
     */
    const renderProgress =
      0.2 +
      ((index + 1) /
        videoClips.length) *
        0.7;

    options.onProgress?.(
      renderProgress,
    );
  }

  /*
   * ---------------------------------------------------------
   * 5. Create FFmpeg concat list
   * ---------------------------------------------------------
   *
   * concat.txt:
   *
   * file 'trimmed_0.mp4'
   * file 'trimmed_1.mp4'
   * file 'trimmed_2.mp4'
   *
   */

  const concatFileContent =
    trimmedFiles
      .map(
        (filename) =>
          `file '${filename}'`,
      )
      .join("\n");

  await engine.writeFile(
    "concat.txt",
    new TextEncoder().encode(
      concatFileContent,
    ),
  );

  /*
   * ---------------------------------------------------------
   * 6. Concatenate all trimmed clips
   * ---------------------------------------------------------
   */

  options.onStage?.("rendering");

  console.log(
    "Concatenating",
    trimmedFiles.length,
    "clips...",
  );

  const outputName =
    "vidsbit-output.mp4";

  await engine.exec([
    "-f",
    "concat",

    "-safe",
    "0",

    "-i",
    "concat.txt",

    "-c",
    "copy",

    "-movflags",
    "+faststart",

    outputName,
  ]);

  options.onProgress?.(
    0.95,
  );

  /*
   * ---------------------------------------------------------
   * 7. Read final output
   * ---------------------------------------------------------
   */

  options.onStage?.("finalizing");

  console.log(
    "Reading final exported video...",
  );

  const output =
    await engine.readFile(
      outputName,
    );

  if (!(output instanceof Uint8Array)) {
    throw new Error(
      "FFmpeg returned invalid output.",
    );
  }

  options.onProgress?.(
    1,
  );

  console.log(
    "VIDSBIT export completed successfully.",
  );

  return new Blob(
    [
      output.buffer as ArrayBuffer,
    ],
    {
      type: "video/mp4",
    },
  );
}