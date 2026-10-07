"use client";

import { useEffect, useRef, useState } from "react";
import { MediaFile, TimelineClip } from "@/types/editor";
import TransformGizmo from "@/components/editor/TransformGizmo";

interface PreviewProps {
  clips: TimelineClip[];
  media: MediaFile[];
  isPlaying: boolean;
  timelineTime: number;
  totalDuration?: number;
  aspectRatio?: string;
  onChangeAspectRatio?: (ratio: string) => void;
  onVideoEnded: () => void;
  onTogglePlay: () => void;
  onSeek?: (time: number) => void;
  onJumpToStart?: () => void;
  onJumpToEnd?: () => void;
  selectedClipId?: string | null;
  onSelectClip?: (clipId: string | null) => void;
  onUpdateClip?: (partial: Partial<TimelineClip>) => void;
}

export default function Preview({
  clips,
  media,
  isPlaying,
  timelineTime,
  totalDuration = 0,
  aspectRatio = "16:9",
  onChangeAspectRatio,
  onVideoEnded,
  onTogglePlay,
  onSeek,
  onJumpToStart,
  onJumpToEnd,
  selectedClipId,
  onSelectClip,
  onUpdateClip,
}: PreviewProps) {
  const baseVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active clips at current timeline time
  const activeClips = clips.filter((c) => {
    const dur = Math.max(0.1, c.sourceEnd - c.sourceStart);
    return timelineTime >= c.timelineStart && timelineTime < c.timelineStart + dur;
  });

  // Base visual clip: lowest video track (Track 0 without PIP, or first visual clip)
  const baseClip =
    activeClips
      .filter((c) => {
        const item = media.find((m) => m.id === c.mediaId);
        return item?.type !== "audio" && !c.pictureInPicture && c.track === 0;
      })[0] ??
    activeClips.filter((c) => {
      const item = media.find((m) => m.id === c.mediaId);
      return item?.type !== "audio" && !c.pictureInPicture;
    })[0] ??
    activeClips.filter((c) => {
      const item = media.find((m) => m.id === c.mediaId);
      return item?.type !== "audio";
    })[0] ??
    null;

  // Overlay / PiP clips: all OTHER active video or image clips
  const overlayClips = activeClips.filter((c) => {
    const item = media.find((m) => m.id === c.mediaId);
    return item?.type !== "audio" && c.id !== baseClip?.id;
  });

  // Active audio clips (background music, sound effects, voice)
  const activeAudioClips = activeClips.filter((c) => {
    const item = media.find((m) => m.id === c.mediaId);
    return item?.type === "audio";
  });

  // Active text overlays
  const activeTextClips = activeClips.filter(
    (c) => c.textOverlay && c.textOverlay.trim().length > 0,
  );

  const baseMedia = baseClip ? media.find((m) => m.id === baseClip.mediaId) : null;

  // Sync base video element playback
  useEffect(() => {
    const video = baseVideoRef.current;
    if (!video || !baseClip || !baseMedia || baseMedia.type !== "video") return;

    const baseVol = (baseClip.volume ?? 100) / 100;
    video.volume = Math.max(0, Math.min(1, baseVol));
    video.playbackRate = baseClip.speed && baseClip.speed > 0 ? baseClip.speed : 1;
    video.muted = isMuted || Boolean(baseClip.muted);

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [baseClip, baseMedia, isPlaying, isMuted]);

  // Sync base video scrubbing
  useEffect(() => {
    const video = baseVideoRef.current;
    if (!video || !baseClip || baseMedia?.type !== "video") return;

    const relTime = timelineTime - baseClip.timelineStart + baseClip.sourceStart;
    const clamped = Math.max(baseClip.sourceStart, Math.min(relTime, baseClip.sourceEnd));

    if (Math.abs(video.currentTime - clamped) > 0.2) {
      video.currentTime = clamped;
    }
  }, [timelineTime, baseClip, baseMedia]);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const toggleFullScreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await container.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // browser fullscreen handler
    }
  };

  const stepSeconds = (delta: number) => {
    if (onSeek) {
      onSeek(Math.max(0, Math.min(totalDuration, timelineTime + delta)));
    }
  };

  return (
    <section ref={containerRef} className="capcut-preview-area">
      {/* Hidden audio players for simultaneous music and audio tracks */}
      <div className="hidden-audio-engine" style={{ display: "none" }}>
        {activeAudioClips.map((clip) => {
          const item = media.find((m) => m.id === clip.mediaId);
          if (!item?.url) return null;
          return (
            <AudioTrackPlayer
              key={clip.id}
              clip={clip}
              url={item.url}
              timelineTime={timelineTime}
              isPlaying={isPlaying}
              isMuted={isMuted}
            />
          );
        })}
      </div>

      {/* Top Preview Bar with Aspect Ratio Selector & Monitor Status */}
      <div className="preview-top-status-bar">
        <div className="preview-aspect-control">
          <span className="aspect-label">Aspect:</span>
          <select
            className="aspect-select"
            value={aspectRatio}
            onChange={(e) => onChangeAspectRatio?.(e.target.value)}
          >
            <option value="16:9">16:9 (YouTube / Standard)</option>
            <option value="9:16">9:16 (TikTok / Reels / Shorts)</option>
            <option value="1:1">1:1 (Instagram / Square)</option>
            <option value="4:5">4:5 (Social Feed)</option>
            <option value="21:9">21:9 (Cinematic Ultrawide)</option>
          </select>
        </div>

        <div className="preview-monitor-title">
          {baseMedia
            ? `${baseMedia.name} ${overlayClips.length > 0 ? `(+${overlayClips.length} Overlays)` : ""}`
            : activeAudioClips.length > 0
              ? `♫ Audio Track Playing (${activeAudioClips.length})`
              : "Canvas Monitor"}
        </div>

        <div className="preview-top-actions">
          <button
            type="button"
            className="monitor-btn"
            onClick={toggleFullScreen}
            title="Fullscreen monitor (F)"
          >
            {isFullscreen ? "⛶ Exit" : "⛶"}
          </button>
        </div>
      </div>

      {/* Video Monitor Frame */}
      <div className={`capcut-monitor-frame aspect-${aspectRatio.replace(":", "-")}`}>
        {/* If no visual base and no overlays, show empty state or audio orb */}
        {!baseClip && overlayClips.length === 0 ? (
          activeAudioClips.length > 0 ? (
            <div className="monitor-audio-state">
              <div className="audio-visualizer-orb">♫</div>
              <strong>Audio Track Playing</strong>
              <span className="audio-badge">{activeAudioClips.length} track(s) active</span>
            </div>
          ) : (
            <div className="monitor-empty-state">
              <div className="monitor-empty-logo">
                <img src="/android-chrome-192x192.png" alt="VIDSBIT" />
              </div>
              <h4>Ready to Create</h4>
              <p>Import and add clips to the timeline to begin editing</p>
            </div>
          )
        ) : (
          <div
            className="monitor-canvas-layer"
            onClick={() => onSelectClip?.(null)}
          >
            {/* 1. BASE LAYER (Video or Image) */}
            {baseClip && baseMedia && (
              <div
                className={`monitor-base-layer-wrapper ${selectedClipId === baseClip.id ? "is-selected-clip" : ""}`}
                style={{
                  ...computeClipTransform(baseClip),
                  zIndex: 5,
                  cursor: selectedClipId === baseClip.id ? "move" : "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectClip?.(baseClip.id);
                }}
              >
                {baseMedia.type === "video" ? (
                  <video
                    ref={baseVideoRef}
                    src={baseMedia.url ?? undefined}
                    playsInline
                    onEnded={onVideoEnded}
                    style={{
                      ...computeClipStyle(baseClip, timelineTime),
                      objectFit: baseClip.crop === "9:16" ? "cover" : "contain",
                    }}
                  />
                ) : (
                  <img
                    src={baseMedia.url ?? undefined}
                    alt={baseMedia.name}
                    className="monitor-media-image"
                    style={computeClipStyle(baseClip, timelineTime)}
                  />
                )}

                {selectedClipId === baseClip.id && (
                  <TransformGizmo
                    clip={baseClip}
                    onUpdateClip={onUpdateClip}
                  />
                )}
              </div>
            )}

            {/* 2. OVERLAY / PIP LAYERS (Videos & Images simultaneous overlay) */}
            {overlayClips.map((clip) => {
              const item = media.find((m) => m.id === clip.mediaId);
              if (!item) return null;
              const isPip = Boolean(clip.pictureInPicture);
              const isSelected = selectedClipId === clip.id;

              return (
                <div
                  key={clip.id}
                  className={`overlay-layer-box ${isPip ? "pip-frame" : ""} ${isSelected ? "is-selected-clip" : ""}`}
                  style={{
                    zIndex: 10 + clip.track,
                    ...computeClipTransform(clip),
                    cursor: isSelected ? "move" : "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip?.(clip.id);
                  }}
                >
                  {item.type === "video" ? (
                    <OverlayVideoPlayer
                      clip={clip}
                      mediaUrl={item.url}
                      timelineTime={timelineTime}
                      isPlaying={isPlaying}
                      isMuted={isMuted}
                    />
                  ) : (
                    <img
                      src={item.url ?? undefined}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        ...computeClipStyle(clip, timelineTime),
                      }}
                    />
                  )}

                  {isSelected && (
                    <TransformGizmo
                      clip={clip}
                      onUpdateClip={onUpdateClip}
                    />
                  )}
                </div>
              );
            })}

            {/* 3. TEXT OVERLAYS (Render on top of all visual clips) */}
            {activeTextClips.map((clip) => {
              const isSelected = selectedClipId === clip.id;
              return (
                <div
                  key={clip.id}
                  className={`caption-overlay-wrapper ${isSelected ? "is-selected-clip" : ""}`}
                  style={{
                    position: "absolute",
                    zIndex: 30,
                    bottom: "12%",
                    left: "50%",
                    transform: `translate(-50%, 0) translate(${clip.posX ?? 0}px, ${clip.posY ?? 0}px) scale(${clip.scale ?? 1}) rotate(${clip.rotation ?? 0}deg)`,
                    cursor: isSelected ? "move" : "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip?.(clip.id);
                  }}
                >
                  <div
                    className={`caption-overlay caption-${clip.captionAnimation ?? "none"} caption-${clip.captionStyle ?? "classic"}`}
                    style={{
                      position: "relative",
                      bottom: "auto",
                      left: "auto",
                      transform: "none",
                      ...(clip.fontFamily ? { fontFamily: clip.fontFamily } : {}),
                      ...(clip.fontSize ? { fontSize: `${clip.fontSize}px` } : {}),
                      ...(clip.textColor ? { color: clip.textColor } : {}),
                      ...(clip.textBackground ? { background: clip.textBackground } : {}),
                      ...(clip.textAlign ? { textAlign: clip.textAlign } : {}),
                    }}
                  >
                    {clip.textOverlay}
                  </div>

                  {isSelected && (
                    <TransformGizmo
                      clip={clip}
                      onUpdateClip={onUpdateClip}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CapCut / PowerDirector Transport Bar */}
      <div className="capcut-transport-bar">
        <div className="transport-timecode">
          <span className="time-current">{formatSmpte(timelineTime)}</span>
          <span className="time-divider">/</span>
          <span className="time-total">{formatSmpte(totalDuration)}</span>
        </div>

        <div className="transport-controls-cluster">
          <button
            type="button"
            className="transport-btn"
            onClick={onJumpToStart}
            title="Jump to Start (Home)"
          >
            |◀
          </button>
          <button
            type="button"
            className="transport-btn"
            onClick={() => stepSeconds(-1)}
            title="Step back 1 second (Shift+Left)"
          >
            ◀◀
          </button>
          <button
            type="button"
            className="transport-btn play-main-btn"
            onClick={onTogglePlay}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <button
            type="button"
            className="transport-btn"
            onClick={() => stepSeconds(1)}
            title="Step forward 1 second (Shift+Right)"
          >
            ▶▶
          </button>
          <button
            type="button"
            className="transport-btn"
            onClick={onJumpToEnd}
            title="Jump to End (End)"
          >
            ▶|
          </button>
        </div>

        <div className="transport-extra-controls">
          <button
            type="button"
            className={`transport-btn ${isMuted ? "muted" : ""}`}
            onClick={toggleMute}
            title={isMuted ? "Unmute audio (M)" : "Mute audio (M)"}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>
    </section>
  );
}

// Subcomponent: Overlay Video Player for synchronized simultaneous overlay/PiP video playback
function OverlayVideoPlayer({
  clip,
  mediaUrl,
  timelineTime,
  isPlaying,
  isMuted,
}: {
  clip: TimelineClip;
  mediaUrl: string | null;
  timelineTime: number;
  isPlaying: boolean;
  isMuted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaUrl) return;

    const baseVol = (clip.volume ?? 100) / 100;
    video.volume = Math.max(0, Math.min(1, baseVol));
    video.playbackRate = clip.speed && clip.speed > 0 ? clip.speed : 1;
    video.muted = isMuted || Boolean(clip.muted);

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [clip, mediaUrl, isPlaying, isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const relTime = timelineTime - clip.timelineStart + clip.sourceStart;
    const clamped = Math.max(clip.sourceStart, Math.min(relTime, clip.sourceEnd));

    if (Math.abs(video.currentTime - clamped) > 0.25) {
      video.currentTime = clamped;
    }
  }, [timelineTime, clip]);

  return (
    <video
      ref={videoRef}
      src={mediaUrl ?? undefined}
      playsInline
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        ...computeClipStyle(clip, timelineTime),
      }}
    />
  );
}

// Subcomponent: Audio Track Player for simultaneous background music and sound effects playback
function AudioTrackPlayer({
  clip,
  url,
  timelineTime,
  isPlaying,
  isMuted,
}: {
  clip: TimelineClip;
  url: string;
  timelineTime: number;
  isPlaying: boolean;
  isMuted: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const baseVol = (clip.volume ?? 100) / 100;
    audio.playbackRate = clip.speed && clip.speed > 0 ? clip.speed : 1;
    audio.muted = isMuted || Boolean(clip.muted);

    const clipDuration = Math.max(0.1, clip.sourceEnd - clip.sourceStart);
    const relative = Math.max(0, timelineTime - clip.timelineStart);

    let fadeFactor = 1;
    if (clip.fadeIn && clip.fadeIn > 0 && relative < clip.fadeIn) {
      fadeFactor = Math.min(1, relative / clip.fadeIn);
    } else if (clip.fadeOut && clip.fadeOut > 0 && relative > clipDuration - clip.fadeOut) {
      fadeFactor = Math.max(0, (clipDuration - relative) / clip.fadeOut);
    }

    audio.volume = Math.max(0, Math.min(1, baseVol * fadeFactor));

    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [clip, timelineTime, isPlaying, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const relTime = timelineTime - clip.timelineStart + clip.sourceStart;
    const clamped = Math.max(clip.sourceStart, Math.min(relTime, clip.sourceEnd));

    if (Math.abs(audio.currentTime - clamped) > 0.25) {
      audio.currentTime = clamped;
    }
  }, [timelineTime, clip]);

  return <audio ref={audioRef} src={url} playsInline preload="auto" />;
}

// Helper: Calculate CSS styling (filter, opacity, fades, chroma key)
function computeClipStyle(clip: TimelineClip, timelineTime: number) {
  let filterStr = "none";
  switch (clip.advancedEffect) {
    case "sharpen":
      filterStr = "contrast(1.2) saturate(1.2) brightness(1.05)";
      break;
    case "vignette":
      filterStr = "contrast(1.25) brightness(0.94) saturate(1.1)";
      break;
    case "glow":
      filterStr = "brightness(1.12) saturate(1.3) contrast(1.15)";
      break;
    case "cinematic":
      filterStr = "contrast(1.3) saturate(0.9) sepia(0.15) brightness(0.96)";
      break;
    case "dramatic":
      filterStr = "contrast(1.6) saturate(1.5) brightness(0.9)";
      break;
    default:
      switch (clip.filter) {
        case "brightness":
          filterStr = "brightness(1.25)";
          break;
        case "contrast":
          filterStr = "contrast(1.4)";
          break;
        case "saturation":
          filterStr = "saturate(1.5)";
          break;
        case "grayscale":
          filterStr = "grayscale(1)";
          break;
        case "sepia":
          filterStr = "sepia(0.8)";
          break;
        case "blur":
          filterStr = "blur(2px)";
          break;
        default:
          filterStr = "none";
          break;
      }
  }

  const fadeIn = Math.max(0, clip.fadeIn ?? 0);
  const fadeOut = Math.max(0, clip.fadeOut ?? 0);
  const clipDuration = Math.max(0.1, clip.sourceEnd - clip.sourceStart);
  const relative = Math.max(0, Math.min(1, (timelineTime - clip.timelineStart) / clipDuration));

  let fadeFactor = 1;
  if (fadeIn > 0 && relative < fadeIn / Math.max(1, clipDuration)) {
    fadeFactor = Math.min(1, relative / Math.max(0.01, fadeIn / Math.max(1, clipDuration)));
  } else if (fadeOut > 0 && relative > 1 - fadeOut / Math.max(1, clipDuration)) {
    fadeFactor = Math.max(
      0,
      1 - (relative - (1 - fadeOut / Math.max(1, clipDuration))) /
        Math.max(0.01, fadeOut / Math.max(1, clipDuration)),
    );
  }

  const opacity = (clip.opacity ?? 1) * fadeFactor;
  const background =
    clip.chromaKey === "green"
      ? "#2eea6d"
      : clip.chromaKey === "blue"
        ? "#3aa0ff"
        : clip.chromaKey === "magenta"
          ? "#ff42d7"
          : "transparent";

  return {
    filter: filterStr,
    opacity: String(opacity),
    background,
  };
}

// Helper: Calculate clip transform (position, scale, rotation)
function computeClipTransform(clip: TimelineClip) {
  const posX = clip.posX ?? 0;
  const posY = clip.posY ?? 0;
  const scale = clip.scale ?? 1;
  const rotation = clip.rotation ?? 0;

  return {
    transform: `translate(${posX}px, ${posY}px) scale(${scale}) rotate(${rotation}deg)`,
  };
}

function formatSmpte(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}