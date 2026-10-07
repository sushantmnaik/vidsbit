import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { MediaFile, TimelineClip } from "@/types/editor";
import { timelineDuration } from "@/lib/editorMath";

export type ExportStage =
  | "loading"
  | "preparing"
  | "rendering"
  | "finalizing";

export interface ExportOptions {
  speedMode?: "fast" | "quality";
  aspectRatio?: string;
  onStage?: (stage: ExportStage) => void;
  onProgress?: (progress: number) => void;
}

if (typeof window !== "undefined") {
  const hasWebCodecs =
    typeof (window as unknown as { VideoEncoder?: unknown }).VideoEncoder !==
    "undefined";
  console.log(
    `[VIDSBIT] WebCodecs hardware acceleration status: ${hasWebCodecs ? "Available (GPU supported)" : "Fallback to WASM"}`,
  );
}

let ffmpeg: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;

export async function getFFmpeg(
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
      onProgress?.(Math.max(0, Math.min(1, progress)));
    });

    instance.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const coreURL = `${origin}/ffmpeg/core/ffmpeg-core.js`;
    const wasmURL = `${origin}/ffmpeg/core/ffmpeg-core.wasm`;
    const classWorkerURL = `${origin}/ffmpeg/worker.js`;

    try {
      await instance.load({
        coreURL,
        wasmURL,
        classWorkerURL,
      });
    } catch (localErr) {
      console.warn("Local FFmpeg load failed, attempting CDN fallback:", localErr);
      const cdnCore = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js";
      const cdnWasm = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm";
      await instance.load({
        coreURL: cdnCore,
        wasmURL: cdnWasm,
      });
    }

    ffmpeg = instance;
    console.log("FFmpeg loaded successfully.");
    return instance;
  })();

  try {
    return await ffmpegLoading;
  } catch (error) {
    ffmpegLoading = null;
    throw error;
  }
}

/**
 * Primary Export Engine:
 * Full-fidelity Compositor + Web Audio + MediaRecorder.
 * Composites all video clips, image clips, overlays/PiP, text overlays,
 * and mixes all audio tracks (music + video audio) at the project aspect ratio.
 */
async function exportViaCompositor(
  media: MediaFile[],
  clips: TimelineClip[],
  options: ExportOptions = {},
): Promise<Blob> {
  options.onStage?.("loading");
  options.onProgress?.(0.05);

  const duration = Math.max(0.1, timelineDuration(clips));

  // Determine export dimensions from aspectRatio:
  let width = 1280;
  let height = 720;
  if (options.aspectRatio === "9:16") {
    width = 720;
    height = 1280;
  } else if (options.aspectRatio === "1:1") {
    width = 720;
    height = 720;
  } else if (options.aspectRatio === "4:5") {
    width = 720;
    height = 900;
  } else if (options.aspectRatio === "21:9") {
    width = 1280;
    height = 548;
  }

  options.onStage?.("preparing");
  options.onProgress?.(0.12);

  // 1. Prepare image and video DOM elements
  const imageElements = new Map<string, HTMLImageElement>();
  const videoElements = new Map<string, HTMLVideoElement>();

  for (const item of media) {
    const url = item.file ? URL.createObjectURL(item.file) : item.url;
    if (!url) continue;

    if (item.type === "image") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      await new Promise<void>((resolve) => {
        if (img.complete) return resolve();
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
      imageElements.set(item.id, img);
    } else if (item.type === "video") {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.playsInline = true;
      video.muted = true;
      video.preload = "auto";
      video.src = url;
      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) return resolve();
        video.onloadedmetadata = () => resolve();
        video.onerror = () => resolve();
        setTimeout(resolve, 2000);
      });
      videoElements.set(item.id, video);
    }
  }

  options.onProgress?.(0.2);

  // 2. Prepare Web Audio Context for audio mixing
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const audioCtx = new AudioCtxClass({ sampleRate: 44100 });
  const audioDestination = audioCtx.createMediaStreamDestination();

  const audioBuffers = new Map<string, AudioBuffer>();
  const activeAudioClips = clips.filter((c) => {
    const item = media.find((m) => m.id === c.mediaId);
    if (!item) return false;
    if (c.muted || (c.volume ?? 100) <= 0) return false;
    return item.type === "audio" || item.type === "video";
  });

  for (const clip of activeAudioClips) {
    if (audioBuffers.has(clip.mediaId)) continue;
    const item = media.find((m) => m.id === clip.mediaId);
    if (!item) continue;
    try {
      let arrayBuffer: ArrayBuffer | null = null;
      if (item.file) {
        arrayBuffer = await item.file.arrayBuffer();
      } else if (item.url) {
        const resp = await fetch(item.url);
        arrayBuffer = await resp.arrayBuffer();
      }
      if (arrayBuffer) {
        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        audioBuffers.set(item.id, decoded);
      }
    } catch (e) {
      console.warn("Could not decode audio for", item.name, e);
    }
  }

  // 3. Create canvas for rendering composite frames
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not initialize canvas context");

  // Determine supported recording mime type
  const candidateMimes = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const selectedMime =
    candidateMimes.find((m) => MediaRecorder.isTypeSupported(m)) ||
    "video/webm";

  const canvasStream = canvas.captureStream(30);
  const streamTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
  const hasAudioTracks = audioDestination.stream.getAudioTracks().length > 0;
  if (hasAudioTracks) {
    streamTracks.push(...audioDestination.stream.getAudioTracks());
  }
  const combinedStream = new MediaStream(streamTracks);

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: selectedMime,
    videoBitsPerSecond: 8_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  options.onStage?.("rendering");

  // Start audio playback nodes
  const audioStartTime = audioCtx.currentTime + 0.05;
  for (const clip of activeAudioClips) {
    const buf = audioBuffers.get(clip.mediaId);
    if (!buf) continue;
    const sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = buf;
    sourceNode.playbackRate.value = Math.max(
      0.25,
      Math.min(4, clip.speed || 1),
    );

    const gainNode = audioCtx.createGain();
    const vol = Math.max(0, (clip.volume ?? 100) / 100);
    gainNode.gain.setValueAtTime(vol, audioStartTime + clip.timelineStart);

    sourceNode.connect(gainNode);
    gainNode.connect(audioDestination);

    const clipPlayDur = Math.max(
      0.1,
      (clip.sourceEnd - clip.sourceStart) / (clip.speed || 1),
    );
    sourceNode.start(
      audioStartTime + clip.timelineStart,
      clip.sourceStart,
      clipPlayDur,
    );
  }

  recorder.start(100);

  // Frame rendering loop (30 fps)
  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);
  const frameDuration = 1 / fps;

  for (let f = 0; f <= totalFrames; f++) {
    const t = Math.min(duration, f * frameDuration);

    // Clear frame background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // Active visual clips at timeline time t
    const activeVisuals = clips
      .filter((c) => {
        const item = media.find((m) => m.id === c.mediaId);
        if (item && item.type === "audio") return false;
        const dur = (c.sourceEnd - c.sourceStart) / (c.speed || 1);
        return t >= c.timelineStart && t < c.timelineStart + dur;
      })
      .sort((a, b) => a.track - b.track);

    for (const clip of activeVisuals) {
      const item = media.find((m) => m.id === clip.mediaId);
      if (!item) continue;

      let sourceImage: CanvasImageSource | null = null;
      let naturalW = width;
      let naturalH = height;

      if (item.type === "image") {
        const img = imageElements.get(item.id);
        if (img && img.complete) {
          sourceImage = img;
          naturalW = img.naturalWidth || width;
          naturalH = img.naturalHeight || height;
        }
      } else if (item.type === "video") {
        const vid = videoElements.get(item.id);
        if (vid) {
          const relTime = t - clip.timelineStart;
          const targetSourceTime =
            clip.sourceStart + relTime * (clip.speed || 1);
          if (Math.abs(vid.currentTime - targetSourceTime) > 0.08) {
            vid.currentTime = targetSourceTime;
            await new Promise((r) => {
              const onSeeked = () => {
                vid.removeEventListener("seeked", onSeeked);
                r(null);
              };
              vid.addEventListener("seeked", onSeeked, { once: true });
              setTimeout(r, 60);
            });
          }
          sourceImage = vid;
          naturalW = vid.videoWidth || width;
          naturalH = vid.videoHeight || height;
        }
      }

      if (!sourceImage) continue;

      ctx.save();

      // Opacity and Fades
      const clipDur = (clip.sourceEnd - clip.sourceStart) / (clip.speed || 1);
      const rel = t - clip.timelineStart;
      let fadeFactor = 1;
      if (clip.fadeIn && clip.fadeIn > 0 && rel < clip.fadeIn) {
        fadeFactor = Math.min(1, rel / clip.fadeIn);
      } else if (
        clip.fadeOut &&
        clip.fadeOut > 0 &&
        rel > clipDur - clip.fadeOut
      ) {
        fadeFactor = Math.max(0, (clipDur - rel) / clip.fadeOut);
      }
      ctx.globalAlpha = Math.max(
        0,
        Math.min(1, (clip.opacity ?? 1) * fadeFactor),
      );

      // Filter preset
      let filterStr = "none";
      if (clip.filter === "brightness") filterStr = "brightness(1.25)";
      else if (clip.filter === "contrast") filterStr = "contrast(1.4)";
      else if (clip.filter === "saturation") filterStr = "saturate(1.5)";
      else if (clip.filter === "grayscale") filterStr = "grayscale(1)";
      else if (clip.filter === "sepia") filterStr = "sepia(0.8)";
      else if (clip.filter === "blur") filterStr = "blur(2px)";
      ctx.filter = filterStr;

      // Transform: position, scale, rotation
      const clipScale = clip.scale ?? 1;
      const rotRad = ((clip.rotation ?? 0) * Math.PI) / 180;
      const posX = clip.posX ?? 0;
      const posY = clip.posY ?? 0;

      const cx = width / 2 + posX;
      const cy = height / 2 + posY;

      ctx.translate(cx, cy);
      ctx.rotate(rotRad);
      ctx.scale(clipScale, clipScale);

      let drawW = width;
      let drawH = height;
      if (clip.pictureInPicture) {
        drawW = width * 0.35;
        drawH = drawW * (naturalH / naturalW);
      }

      ctx.drawImage(sourceImage, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }

    // Active Text Overlays
    const activeTexts = clips.filter((c) => {
      if (!c.textOverlay || c.textOverlay.trim().length === 0) return false;
      const dur = (c.sourceEnd - c.sourceStart) / (c.speed || 1);
      return t >= c.timelineStart && t < c.timelineStart + dur;
    });

    for (const textClip of activeTexts) {
      ctx.save();
      const fontSize = (textClip.fontSize || 32) * (height / 720);
      ctx.font = `bold ${fontSize}px ${textClip.fontFamily || "sans-serif"}`;
      ctx.textAlign = textClip.textAlign || "center";
      ctx.textBaseline = "middle";

      const textX = width / 2 + (textClip.posX ?? 0);
      const textY = height * 0.85 + (textClip.posY ?? 0);

      ctx.translate(textX, textY);
      ctx.rotate(((textClip.rotation ?? 0) * Math.PI) / 180);
      ctx.scale(textClip.scale ?? 1, textClip.scale ?? 1);

      if (
        textClip.textBackground &&
        textClip.textBackground !== "transparent"
      ) {
        const metrics = ctx.measureText(textClip.textOverlay);
        const padding = 12;
        ctx.fillStyle = textClip.textBackground;
        ctx.fillRect(
          -metrics.width / 2 - padding,
          -fontSize / 2 - padding,
          metrics.width + padding * 2,
          fontSize + padding * 2,
        );
      }

      ctx.fillStyle = textClip.textColor || "#ffffff";
      ctx.fillText(textClip.textOverlay, 0, 0);
      ctx.restore();
    }

    // Progress update
    const renderProgress = 0.2 + (f / totalFrames) * 0.7;
    options.onProgress?.(renderProgress);

    if (f % 5 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // 4. Finalize recording
  options.onStage?.("finalizing");
  options.onProgress?.(0.92);

  const stopPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: selectedMime }));
    };
  });

  recorder.stop();
  try {
    audioCtx.close();
  } catch {}

  const rawBlob = await stopPromise;

  // If already native MP4, return directly
  if (selectedMime.includes("mp4")) {
    options.onProgress?.(1);
    return rawBlob;
  }

  // If recorded as WebM (e.g. Firefox), attempt fast FFmpeg remux to MP4
  try {
    const engine = await getFFmpeg();
    await engine.writeFile("input.webm", await fetchFile(rawBlob));
    await engine.exec([
      "-i",
      "input.webm",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      "output.mp4",
    ]);
    const mp4Data = await engine.readFile("output.mp4");
    if (mp4Data instanceof Uint8Array && mp4Data.length > 0) {
      options.onProgress?.(1);
      return new Blob([mp4Data.buffer as ArrayBuffer], {
        type: "video/mp4",
      });
    }
  } catch (err) {
    console.warn("FFmpeg remux to MP4 fell back to native WebM blob:", err);
  }

  options.onProgress?.(1);
  return rawBlob;
}

/**
 * Secondary / Direct FFmpeg Pipeline:
 * Fixes trim ranges, missing File handles, clip scaling, and audio synthesis.
 */
async function exportViaFFmpeg(
  media: MediaFile[],
  clips: TimelineClip[],
  options: ExportOptions = {},
): Promise<Blob> {
  const engine = await getFFmpeg(options.onProgress);

  const videoClips = [...clips]
    .sort((a, b) => a.timelineStart - b.timelineStart)
    .filter((clip) => {
      const item = media.find((m) => m.id === clip.mediaId);
      return item?.type === "video";
    });

  if (videoClips.length === 0) {
    throw new Error("No video clips found for FFmpeg direct export.");
  }

  const mediaFileNames = new Map<string, string>();
  const uniqueVideoMedia = videoClips
    .map((clip) => media.find((item) => item.id === clip.mediaId))
    .filter((item): item is MediaFile => Boolean(item));

  const uniqueMedia = Array.from(
    new Map(uniqueVideoMedia.map((item) => [item.id, item])).values(),
  );

  for (let index = 0; index < uniqueMedia.length; index++) {
    const item = uniqueMedia[index];
    const sourceHandle = item.file || item.url;
    if (!sourceHandle) {
      throw new Error(`Media "${item.name}" has no file or URL.`);
    }

    const filename = `source_${index}.mp4`;
    mediaFileNames.set(item.id, filename);

    await engine.writeFile(filename, await fetchFile(sourceHandle));
    options.onProgress?.(((index + 1) / uniqueMedia.length) * 0.2);
  }

  const trimmedFiles: string[] = [];
  const preset = options.speedMode === "quality" ? "veryfast" : "ultrafast";
  const crf = options.speedMode === "quality" ? "23" : "26";

  for (let index = 0; index < videoClips.length; index++) {
    const clip = videoClips[index];
    const sourceMedia = media.find((item) => item.id === clip.mediaId);
    if (!sourceMedia) continue;
    const inputFile = mediaFileNames.get(sourceMedia.id);
    if (!inputFile) continue;

    const outputFile = `trimmed_${index}.mp4`;
    const duration = clip.sourceEnd - clip.sourceStart;

    const execArgs: string[] = [
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
      preset,
      "-crf",
      crf,
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1",
    ];

    if (clip.muted) {
      execArgs.push("-an");
    } else {
      execArgs.push("-map", "0:a:0?");
      execArgs.push("-c:a", "aac", "-b:a", "192k");
    }

    execArgs.push("-movflags", "+faststart", outputFile);
    await engine.exec(execArgs);
    trimmedFiles.push(outputFile);

    options.onProgress?.(0.2 + ((index + 1) / videoClips.length) * 0.7);
  }

  const concatFileContent = trimmedFiles
    .map((filename) => `file '${filename}'`)
    .join("\n");
  await engine.writeFile(
    "concat.txt",
    new TextEncoder().encode(concatFileContent),
  );

  const outputName = "vidsbit-output.mp4";
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

  const output = await engine.readFile(outputName);
  if (!(output instanceof Uint8Array)) {
    throw new Error("FFmpeg returned invalid output.");
  }

  return new Blob([output.buffer as ArrayBuffer], { type: "video/mp4" });
}

/**
 * Main export function with automatic engine selection and failover.
 */
export async function exportVideo(
  media: MediaFile[],
  clips: TimelineClip[],
  options: ExportOptions = {},
): Promise<Blob> {
  if (clips.length === 0) {
    throw new Error("There is nothing to export. Add clips to your timeline.");
  }

  // 1. Try Compositor Canvas Engine first (supports all layers, overlays, text, music, transforms)
  try {
    return await exportViaCompositor(media, clips, options);
  } catch (compositorError) {
    console.warn(
      "Compositor export failed, attempting FFmpeg failover:",
      compositorError,
    );
  }

  // 2. Failover to direct FFmpeg if supported
  try {
    return await exportViaFFmpeg(media, clips, options);
  } catch (ffmpegError) {
    console.error("FFmpeg export failover also failed:", ffmpegError);
    throw new Error(
      "Export encountered an issue while processing your media. Please check that imported media files are accessible.",
    );
  }
}