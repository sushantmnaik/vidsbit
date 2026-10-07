import {
  CaptionCue,
  CaptionStyle,
  EditorState,
  MediaFile,
  TextLayer,
  TimelineClip,
} from "@/types/editor";
import { applyChromaKey, isolateSubjectFromCorners } from "@/lib/effects/chromaKey";
import { cssFilterForClip } from "@/lib/effects/filters";
import { fadeOpacity, transitionAtTime } from "@/lib/effects/transitions";
import {
  clipPlaybackDuration,
  sourceTimeAt,
  visualClipsAtTime,
} from "@/lib/editorMath";

export interface MediaElementMap {
  videos: Map<string, HTMLVideoElement>;
  images: Map<string, HTMLImageElement>;
}

function cropSource(
  width: number,
  height: number,
  crop: TimelineClip["crop"],
): { sx: number; sy: number; sw: number; sh: number } {
  if (crop === "none") {
    return { sx: 0, sy: 0, sw: width, sh: height };
  }

  const ratios: Record<Exclude<TimelineClip["crop"], "none">, number> = {
    "16:9": 16 / 9,
    "1:1": 1,
    "9:16": 9 / 16,
    cinematic: 2.35,
  };
  const target = ratios[crop];
  const current = width / height;

  if (current > target) {
    const sw = height * target;
    return { sx: (width - sw) / 2, sy: 0, sw, sh: height };
  }

  const sh = width / target;
  return { sx: 0, sy: (height - sh) / 2, sw: width, sh };
}

function drawProcessedFrame(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  clip: TimelineClip,
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  opacity: number,
  animationOffset: { x: number; y: number; scale: number },
): void {
  const work = document.createElement("canvas");
  work.width = width;
  work.height = height;
  const workCtx = work.getContext("2d", { willReadFrequently: true });
  if (!workCtx) {
    return;
  }

  const crop = cropSource(sourceWidth, sourceHeight, clip.crop);
  workCtx.filter = cssFilterForClip(clip);
  workCtx.drawImage(
    source,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    width,
    height,
  );
  workCtx.filter = "none";

  if (clip.chromaKey !== "none" || clip.backgroundRemoval === "auto") {
    try {
      const imageData = workCtx.getImageData(0, 0, width, height);
      if (clip.chromaKey !== "none") {
        applyChromaKey(
          imageData,
          clip.chromaColor,
          clip.chromaTolerance,
          clip.chromaSoftness,
          clip.chromaSpill,
        );
      }
      if (clip.backgroundRemoval === "auto") {
        isolateSubjectFromCorners(imageData, 0.3);
      }
      workCtx.putImageData(imageData, 0, 0);
    } catch (error) {
      console.warn("Pixel effects skipped (tainted canvas or memory)", error);
    }
  }

  const scale = clip.scale * animationOffset.scale * (clip.pictureInPicture ? Math.min(clip.scale, 0.4) === clip.scale ? 1 : 1 : 1);
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  const offsetX = Math.abs(clip.posX ?? 0) <= 1 && (clip.posX ?? 0) !== 0 ? ((clip.posX ?? 0) - 0.5) * width : (clip.posX ?? 0);
  const offsetY = Math.abs(clip.posY ?? 0) <= 1 && (clip.posY ?? 0) !== 0 ? ((clip.posY ?? 0) - 0.5) * height : (clip.posY ?? 0);
  const x = width / 2 + offsetX - drawWidth / 2 + animationOffset.x;
  const y = height / 2 + offsetY - drawHeight / 2 + animationOffset.y;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x + drawWidth / 2, y + drawHeight / 2);
  ctx.rotate((clip.rotation * Math.PI) / 180);
  ctx.drawImage(work, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
}

function animationOffsetFor(
  clip: TimelineClip,
  time: number,
  canvasWidth: number,
): { x: number; y: number; scale: number } {
  const duration = clipPlaybackDuration(clip);
  const relative = Math.max(0, time - clip.timelineStart);
  const intro = Math.min(0.4, duration / 3);
  const progress = intro > 0 ? Math.min(1, relative / intro) : 1;

  if (clip.textAnimation === "slide") {
    return { x: (1 - progress) * -80, y: 0, scale: 1 };
  }
  if (clip.textAnimation === "scale") {
    return { x: 0, y: 0, scale: 0.85 + 0.15 * progress };
  }
  return { x: 0, y: 0, scale: 1 };
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  time: number,
  width: number,
  height: number,
): void {
  if (time < layer.start || time > layer.end) {
    return;
  }

  const duration = Math.max(0.01, layer.end - layer.start);
  const relative = time - layer.start;
  let opacity = 1;
  let offsetX = 0;
  let scale = 1;
  const intro = Math.min(0.35, duration / 3);

  if (layer.animation === "fade" && relative < intro) {
    opacity = relative / intro;
  }
  if (layer.animation === "slide" && relative < intro) {
    offsetX = (1 - relative / intro) * -60;
  }
  if (layer.animation === "scale" && relative < intro) {
    scale = 0.8 + 0.2 * (relative / intro);
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = layer.background === "transparent" ? "transparent" : layer.background;
  ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
  ctx.textAlign = layer.align;
  ctx.textBaseline = "middle";
  const x = width * layer.x + offsetX;
  const y = height * layer.y;
  const metrics = ctx.measureText(layer.text);
  if (layer.background && layer.background !== "transparent") {
    const padding = 10;
    const boxWidth = metrics.width * scale + padding * 2;
    const boxHeight = layer.fontSize * scale + padding * 2;
    const boxX =
      layer.align === "center"
        ? x - boxWidth / 2
        : layer.align === "right"
          ? x - boxWidth
          : x;
    ctx.fillRect(boxX, y - boxHeight / 2, boxWidth, boxHeight);
  }
  ctx.fillStyle = layer.color;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillText(layer.text, 0, 0);
  ctx.restore();
}

function drawCaptions(
  ctx: CanvasRenderingContext2D,
  captions: CaptionCue[],
  style: CaptionStyle,
  time: number,
  width: number,
  height: number,
): void {
  const active = captions.find((cue) => time >= cue.start && time <= cue.end);
  if (!active) {
    return;
  }

  const duration = Math.max(0.01, active.end - active.start);
  const relative = time - active.start;
  let text = active.text;
  let opacity = 1;
  let offsetY = 0;

  if (style.animation === "fade") {
    opacity = Math.min(1, relative / 0.2);
  }
  if (style.animation === "slide-up") {
    offsetY = Math.max(0, 24 * (1 - Math.min(1, relative / 0.25)));
  }
  if (style.animation === "typewriter" || style.animation === "karaoke") {
    const chars = Math.max(1, Math.floor((relative / duration) * active.text.length));
    text = active.text.slice(0, chars);
  }

  const y =
    style.position === "top"
      ? height * 0.12
      : style.position === "center"
        ? height * 0.5
        : height * 0.86;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `700 ${style.fontSize}px ${style.fontFamily}`;
  ctx.textAlign = style.align;
  ctx.textBaseline = "middle";
  const x =
    style.align === "left" ? width * 0.08 : style.align === "right" ? width * 0.92 : width / 2;
  const metrics = ctx.measureText(text);
  if (style.background && style.background !== "transparent") {
    const padding = 12;
    ctx.fillStyle = style.background;
    ctx.fillRect(
      x - (style.align === "center" ? metrics.width / 2 : style.align === "right" ? metrics.width : 0) - padding,
      y + offsetY - style.fontSize / 2 - padding,
      metrics.width + padding * 2,
      style.fontSize + padding * 2,
    );
  }
  if (style.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 8;
  }
  ctx.lineWidth = 4;
  ctx.strokeStyle = style.stroke;
  ctx.fillStyle = style.color;
  if (style.stroke && style.stroke !== "transparent") {
    ctx.strokeText(text, x, y + offsetY);
  }
  ctx.fillText(text, x, y + offsetY);
  ctx.restore();
}

function getSource(
  clip: TimelineClip,
  media: MediaFile[],
  elements: MediaElementMap,
): { source: CanvasImageSource; width: number; height: number } | null {
  const item = media.find((entry) => entry.id === clip.mediaId);
  if (!item || item.missing || !item.url) {
    return null;
  }

  if (item.type === "image") {
    const image = elements.images.get(item.id);
    if (!image || !image.complete) {
      return null;
    }
    return {
      source: image,
      width: image.naturalWidth || item.width || 1280,
      height: image.naturalHeight || item.height || 720,
    };
  }

  if (item.type === "video") {
    const video = elements.videos.get(item.id);
    if (!video || video.readyState < 2) {
      return null;
    }
    return {
      source: video,
      width: video.videoWidth || item.width || 1280,
      height: video.videoHeight || item.height || 720,
    };
  }

  return null;
}

function drawReplacement(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  media: MediaFile[],
  elements: MediaElementMap,
  width: number,
  height: number,
): void {
  if (clip.bgReplace === "none") {
    return;
  }
  if (clip.bgReplace === "color") {
    ctx.fillStyle = clip.bgReplaceColor || "#00aa44";
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const item = media.find((entry) => entry.id === clip.bgReplaceMediaId);
  if (!item || !item.url) {
    ctx.fillStyle = clip.bgReplaceColor || "#111111";
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (item.type === "image") {
    const image = elements.images.get(item.id);
    if (image) {
      ctx.drawImage(image, 0, 0, width, height);
    }
  } else if (item.type === "video") {
    const video = elements.videos.get(item.id);
    if (video) {
      ctx.drawImage(video, 0, 0, width, height);
    }
  }
}

export function renderCompositorFrame(
  ctx: CanvasRenderingContext2D,
  state: Pick<EditorState, "media" | "clips" | "texts" | "captions" | "captionStyle" | "settings">,
  time: number,
  elements: MediaElementMap,
): void {
  const width = state.settings.width;
  const height = state.settings.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050609";
  ctx.fillRect(0, 0, width, height);

  const visuals = visualClipsAtTime(state.clips, time);
  const mix = transitionAtTime(state.clips, time);

  const drawClip = (clip: TimelineClip, extraOpacity = 1) => {
    const source = getSource(clip, state.media, elements);
    drawReplacement(ctx, clip, state.media, elements, width, height);
    if (!source) {
      ctx.fillStyle = "#1b1b21";
      ctx.fillRect(width * 0.2, height * 0.35, width * 0.6, height * 0.2);
      ctx.fillStyle = "#92929d";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Missing media", width / 2, height / 2);
      return;
    }

    const opacity = fadeOpacity(clip, time) * extraOpacity;
    const offset = animationOffsetFor(clip, time, width);
    drawProcessedFrame(
      ctx,
      source.source,
      clip,
      width,
      height,
      source.width,
      source.height,
      opacity,
      offset,
    );

    if (clip.textOverlay) {
      const layer: TextLayer = {
        id: `${clip.id}-text`,
        text: clip.textOverlay,
        start: clip.timelineStart,
        end: clip.timelineStart + clipPlaybackDuration(clip),
        fontFamily: clip.fontFamily,
        fontSize: clip.fontSize,
        fontWeight: clip.fontWeight,
        color: clip.textColor,
        background: clip.textBackground,
        align: clip.textAlign,
        x: 0.5,
        y: 0.82,
        animation: clip.textAnimation,
      };
      drawTextLayer(ctx, layer, time, width, height);
    }
  };

  if (mix && mix.outgoing && visuals.some((clip) => clip.id === mix.outgoing?.id)) {
    if (mix.type === "dipToBlack") {
      drawClip(mix.outgoing, 1 - mix.amount);
      ctx.fillStyle = `rgba(0,0,0,${mix.amount < 0.5 ? mix.amount * 2 : (1 - mix.amount) * 2})`;
      ctx.fillRect(0, 0, width, height);
      if (mix.incoming) {
        drawClip(mix.incoming, mix.amount);
      }
    } else if (mix.type === "slide") {
      ctx.save();
      ctx.translate(-width * mix.amount, 0);
      drawClip(mix.outgoing);
      ctx.restore();
      if (mix.incoming) {
        ctx.save();
        ctx.translate(width * (1 - mix.amount), 0);
        drawClip(mix.incoming);
        ctx.restore();
      }
    } else if (mix.type === "crossfade" || mix.type === "fade") {
      drawClip(mix.outgoing, 1 - mix.amount);
      if (mix.incoming) {
        drawClip(mix.incoming, mix.amount);
      }
    } else {
      for (const clip of visuals) {
        drawClip(clip);
      }
    }
  } else {
    for (const clip of visuals) {
      drawClip(clip);
    }
  }

  for (const layer of state.texts) {
    drawTextLayer(ctx, layer, time, width, height);
  }

  drawCaptions(ctx, state.captions, state.captionStyle, time, width, height);
}

export function syncMediaElements(
  media: MediaFile[],
  clips: TimelineClip[],
  time: number,
  playing: boolean,
  elements: MediaElementMap,
): void {
  for (const item of media) {
    if (!item.url || item.missing) {
      continue;
    }

    if (item.type === "video") {
      let video = elements.videos.get(item.id);
      if (!video) {
        video = document.createElement("video");
        video.playsInline = true;
        video.preload = "auto";
        video.src = item.url;
        video.muted = true;
        elements.videos.set(item.id, video);
      }
      const clip = clips.find(
        (entry) =>
          entry.mediaId === item.id &&
          time >= entry.timelineStart &&
          time < entry.timelineStart + clipPlaybackDuration(entry),
      );
      if (clip) {
        const target = sourceTimeAt(clip, time);
        if (Math.abs(video.currentTime - target) > 0.25) {
          try {
            video.currentTime = target;
          } catch {
            // Seeking can throw if metadata is not ready.
          }
        }
        video.playbackRate = Math.min(4, Math.max(0.25, clip.speed || 1));
        if (playing) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      } else {
        video.pause();
      }
    }

    if (item.type === "image") {
      let image = elements.images.get(item.id);
      if (!image) {
        image = new Image();
        image.src = item.url;
        elements.images.set(item.id, image);
      }
    }
  }
}
