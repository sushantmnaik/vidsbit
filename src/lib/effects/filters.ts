import { FilterPreset, TimelineClip, AdvancedEffect } from "@/types/editor";

export function cssFilterForClip(clip: TimelineClip): string {
  const parts: string[] = [];

  const brightness =
    clip.filter === "brightness" ? 1.25 : clip.brightness !== 1 ? clip.brightness : 1;
  const contrast =
    clip.filter === "contrast" ? 1.4 : clip.contrast !== 1 ? clip.contrast : 1;
  const saturation =
    clip.filter === "saturation" ? 1.5 : clip.saturation !== 1 ? clip.saturation : 1;
  const grayscale = clip.filter === "grayscale" ? 1 : clip.grayscale;
  const sepia = clip.filter === "sepia" ? 0.8 : clip.sepia;
  const blur = clip.filter === "blur" ? 1.2 : clip.blur;

  if (brightness !== 1) parts.push(`brightness(${brightness})`);
  if (contrast !== 1) parts.push(`contrast(${contrast})`);
  if (saturation !== 1) parts.push(`saturate(${saturation})`);
  if (grayscale > 0) parts.push(`grayscale(${grayscale})`);
  if (sepia > 0) parts.push(`sepia(${sepia})`);
  if (blur > 0) parts.push(`blur(${blur}px)`);

  const advanced = advancedFilter(clip.advancedEffect);
  if (advanced) {
    parts.push(advanced);
  }

  return parts.length > 0 ? parts.join(" ") : "none";
}

export function advancedFilter(effect: AdvancedEffect): string {
  switch (effect) {
    case "sharpen":
      return "contrast(1.2) saturate(1.15)";
    case "vignette":
      return "contrast(1.2) brightness(0.92)";
    case "glow":
      return "brightness(1.1) saturate(1.25) contrast(1.08)";
    case "cinematic":
      return "contrast(1.25) saturate(0.88) sepia(0.12) brightness(0.96)";
    case "dramatic":
      return "contrast(1.45) saturate(1.35) brightness(0.9)";
    default:
      return "";
  }
}

export function filterPresetLabel(preset: FilterPreset): string {
  return preset;
}
