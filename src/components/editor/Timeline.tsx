"use client";

import { useEffect, useRef, useState } from "react";
import { TimelineClip, MediaFile } from "@/types/editor";

const BASE_PX_PER_SEC = 50;

interface TimelineProps {
  clips: TimelineClip[];
  media: MediaFile[];
  selectedClipId: string | null;
  currentTime: number;
  isPlaying: boolean;
  timelineZoom: number;
  snapEnabled: boolean;
  videoTrackCount: number;
  audioTrackCount: number;
  selectedVideoTrack: number;
  selectedAudioTrack: number;

  onSelectClip: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onSplitClip: (clipId: string) => void;
  onTrimStart: (clipId: string) => void;
  onTrimEnd: (clipId: string) => void;
  onMoveClip: (clipId: string, direction: "left" | "right") => void;
  onDuplicateClip: (clipId: string) => void;
  onTrimDragBegin: (clipId: string, handle: "start" | "end") => void;
  onTrimDragUpdate: (
    clipId: string,
    handle: "start" | "end",
    deltaSeconds: number,
  ) => void;
  onReorderClip: (sourceId: string, targetId: string) => void;
  onUpdateClipStart?: (clipId: string, newStart: number) => void;
  onUpdateClipTrack?: (
    clipId: string,
    newTrack: number,
    newTrackKind?: "video" | "audio",
  ) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitTimeline: () => void;
  onChangeZoom?: (zoom: number) => void;
  onToggleSnap: () => void;
  onAddVideoTrack: () => void;
  onAddAudioTrack: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onAddTextPrompt?: () => void;
}

export default function Timeline({
  clips,
  media,
  selectedClipId,
  currentTime,
  timelineZoom,
  snapEnabled,
  videoTrackCount,
  audioTrackCount,
  onSelectClip,
  onDeleteClip,
  onSplitClip,
  onTrimStart,
  onTrimEnd,
  onDuplicateClip,
  onTrimDragBegin,
  onTrimDragUpdate,
  onUpdateClipStart,
  onUpdateClipTrack,
  onZoomIn,
  onZoomOut,
  onFitTimeline,
  onChangeZoom,
  onToggleSnap,
  onAddVideoTrack,
  onAddAudioTrack,
  onSeek,
  onAddTextPrompt,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [draggingTrim, setDraggingTrim] = useState<{
    clipId: string;
    handle: "start" | "end";
    x: number;
  } | null>(null);

  // Horizontal drag state for free positioning along the time axis
  const [clipDragState, setClipDragState] = useState<{
    clipId: string;
    startX: number;
    origStart: number;
    currentStart: number;
    moved: boolean;
  } | null>(null);

  // Exact fixed pixels per second based on zoom multiplier
  const pxPerSec = Math.max(10, BASE_PX_PER_SEC * timelineZoom);

  // Total project duration based on clips
  const clipsEnd = clips.reduce(
    (max, clip) =>
      Math.max(
        max,
        clip.timelineStart + (clip.sourceEnd - clip.sourceStart),
      ),
    0,
  );

  // Runway duration: at least 60 seconds or clipsEnd + 20s buffer so timeline never stretches short clips
  const runwayDuration = Math.max(60, clipsEnd + 20);
  const trackWidthPx = Math.max(1200, runwayDuration * pxPerSec);

  // Wheel (Ctrl+wheel) & touch pinch listeners
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const delta = event.deltaY < 0 ? 0.25 : -0.25;
        if (onChangeZoom) {
          onChangeZoom(Math.max(0.25, Math.min(5, timelineZoom + delta)));
        } else if (delta > 0) {
          onZoomIn();
        } else {
          onZoomOut();
        }
      }
    };

    let initialDist: number | null = null;
    let initialZoom = timelineZoom;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        initialDist = Math.hypot(
          event.touches[0].clientX - event.touches[1].clientX,
          event.touches[0].clientY - event.touches[1].clientY,
        );
        initialZoom = timelineZoom;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && initialDist !== null) {
        event.preventDefault();
        const currentDist = Math.hypot(
          event.touches[0].clientX - event.touches[1].clientX,
          event.touches[0].clientY - event.touches[1].clientY,
        );
        const factor = currentDist / initialDist;
        onChangeZoom?.(
          Math.max(0.25, Math.min(5, Math.round(initialZoom * factor * 100) / 100)),
        );
      }
    };

    const handleTouchEnd = () => {
      initialDist = null;
    };

    scrollEl.addEventListener("wheel", handleWheel, { passive: false });
    scrollEl.addEventListener("touchstart", handleTouchStart, { passive: true });
    scrollEl.addEventListener("touchmove", handleTouchMove, { passive: false });
    scrollEl.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      scrollEl.removeEventListener("wheel", handleWheel);
      scrollEl.removeEventListener("touchstart", handleTouchStart);
      scrollEl.removeEventListener("touchmove", handleTouchMove);
      scrollEl.removeEventListener("touchend", handleTouchEnd);
    };
  }, [timelineZoom, onChangeZoom, onZoomIn, onZoomOut]);

  // Click on ruler or track canvas to seek playhead
  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const targetTime = Math.max(0, clickX / pxPerSec);
    onSeek(targetTime);
  };

  // Trim handle drag begin
  const beginTrimDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    clipId: string,
    handle: "start" | "end",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onTrimDragBegin(clipId, handle);
    setDraggingTrim({ clipId, handle, x: event.clientX });
  };

  // Trim handle pointer move
  const handleTrackPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggingTrim) {
      const deltaPixels = event.clientX - draggingTrim.x;
      const deltaSeconds = deltaPixels / pxPerSec;
      onTrimDragUpdate(draggingTrim.clipId, draggingTrim.handle, deltaSeconds);
      setDraggingTrim((current) =>
        current ? { ...current, x: event.clientX } : current,
      );
    }
  };

  const endTrimDrag = () => {
    setDraggingTrim(null);
  };

  // Clip body horizontal drag handlers for free positioning & layering
  const handleClipPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    clip: TimelineClip,
  ) => {
    if ((event.target as HTMLElement).closest(".clip-trim-handle, .clip-track-pill")) {
      return;
    }

    event.preventDefault();
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    setClipDragState({
      clipId: clip.id,
      startX: event.clientX,
      origStart: clip.timelineStart,
      currentStart: clip.timelineStart,
      moved: false,
    });
    onSelectClip(clip.id);
  };

  const handleClipPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!clipDragState) return;

    const deltaX = event.clientX - clipDragState.startX;
    if (Math.abs(deltaX) > 3) {
      const deltaSec = deltaX / pxPerSec;
      let candStart = Math.max(0, clipDragState.origStart + deltaSec);

      // Magnetic snapping to 0, playhead, and other clip boundaries
      if (snapEnabled) {
        const threshold = 12 / pxPerSec;
        const candidates = [0, currentTime];
        for (const c of clips) {
          if (c.id === clipDragState.clipId) continue;
          const dur = Math.max(0.1, c.sourceEnd - c.sourceStart);
          candidates.push(c.timelineStart);
          candidates.push(c.timelineStart + dur);
        }
        for (const cand of candidates) {
          if (Math.abs(candStart - cand) <= threshold) {
            candStart = cand;
            break;
          }
        }
      }

      candStart = Math.max(0, Math.round(candStart * 100) / 100);
      setClipDragState((prev) => (prev ? { ...prev, currentStart: candStart, moved: true } : null));
    }
  };

  const handleClipPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!clipDragState) return;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    if (clipDragState.moved && onUpdateClipStart) {
      onUpdateClipStart(clipDragState.clipId, clipDragState.currentStart);
    }
    setClipDragState(null);
  };

  // Dedicated Fit Button handler: fits clips to the visible scroll window on explicit demand
  const handleFitClick = () => {
    if (scrollRef.current && clipsEnd > 0) {
      const containerWidth = scrollRef.current.clientWidth - 40;
      const neededZoom = containerWidth / (clipsEnd * BASE_PX_PER_SEC);
      onChangeZoom?.(
        Math.max(0.25, Math.min(5, Math.round(neededZoom * 100) / 100)),
      );
    } else {
      onFitTimeline();
    }
  };

  // Determine active video track indices (descending order so higher tracks are on top visually)
  const actualVideoCount = Math.max(2, videoTrackCount);
  const videoTracks = Array.from({ length: actualVideoCount }, (_, i) => actualVideoCount - 1 - i);

  // Determine active audio track indices (0, 1, ...)
  const actualAudioCount = Math.max(1, audioTrackCount);
  const audioTracks = Array.from({ length: actualAudioCount }, (_, i) => i);

  return (
    <section className="capcut-timeline-container" aria-label="Timeline editing deck">
      {/* PowerDirector / CapCut Timeline Toolbar */}
      <div className="capcut-timeline-toolbar">
        <div className="timeline-tool-group">
          <button
            type="button"
            className="tb-action-btn tb-split-btn"
            disabled={!selectedClipId}
            onClick={() => selectedClipId && onSplitClip(selectedClipId)}
            title="Split clip at playhead (S or Ctrl+B)"
          >
            <span className="tb-icon">✂</span>
            <span className="tb-text">Split</span>
          </button>

          <button
            type="button"
            className="tb-action-btn"
            disabled={!selectedClipId}
            onClick={() => selectedClipId && onDeleteClip(selectedClipId)}
            title="Delete selected clip (Del)"
          >
            <span className="tb-icon">🗑</span>
            <span className="tb-text">Delete</span>
          </button>

          <button
            type="button"
            className="tb-action-btn"
            disabled={!selectedClipId}
            onClick={() => selectedClipId && onDuplicateClip(selectedClipId)}
            title="Duplicate clip (Ctrl+D)"
          >
            <span className="tb-icon">📑</span>
            <span className="tb-text">Duplicate</span>
          </button>

          <div className="tb-divider" />

          <button
            type="button"
            className="tb-action-btn"
            disabled={!selectedClipId}
            onClick={() => selectedClipId && onTrimStart(selectedClipId)}
            title="Trim start to playhead (Q or [)"
          >
            <span className="tb-icon">⇤</span>
            <span className="tb-text">Trim Left</span>
          </button>

          <button
            type="button"
            className="tb-action-btn"
            disabled={!selectedClipId}
            onClick={() => selectedClipId && onTrimEnd(selectedClipId)}
            title="Trim end to playhead (W or ])"
          >
            <span className="tb-icon">⇥</span>
            <span className="tb-text">Trim Right</span>
          </button>

          <div className="tb-divider" />

          <button
            type="button"
            className={`tb-action-btn ${snapEnabled ? "active-toggle" : ""}`}
            onClick={onToggleSnap}
            title="Toggle snapping magnet (N)"
          >
            <span className="tb-icon">🧲</span>
            <span className="tb-text">Magnet</span>
          </button>

          <button
            type="button"
            className="tb-action-btn"
            onClick={onAddTextPrompt}
            title="Add text overlay (T)"
          >
            <span className="tb-icon">🔤</span>
            <span className="tb-text">+ Text</span>
          </button>
        </div>

        {/* Right side: Zoom slider, Zoom buttons, Fit button */}
        <div className="timeline-zoom-controls">
          <button
            type="button"
            className="tb-zoom-btn"
            onClick={onZoomOut}
            title="Zoom out (-)"
          >
            −
          </button>

          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={timelineZoom}
            onChange={(e) => onChangeZoom?.(Number(e.target.value))}
            className="tb-zoom-slider"
            title="Zoom slider"
          />

          <button
            type="button"
            className="tb-zoom-btn"
            onClick={onZoomIn}
            title="Zoom in (+)"
          >
            +
          </button>

          <span className="tb-zoom-badge" title="Current timeline zoom scale">
            {Math.round(timelineZoom * 100)}%
          </span>

          <button
            type="button"
            className="tb-action-btn tb-fit-btn"
            onClick={handleFitClick}
            title="Fit timeline to view (Ctrl+0)"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Multi-Track Canvas & Track Headers */}
      <div className="capcut-timeline-workspace">
        {/* Track Headers Column (Left) */}
        <div className="timeline-track-headers">
          <div className="track-ruler-header">
            <span>Layers</span>
          </div>

          {/* Dynamic Video Track Headers */}
          {videoTracks.map((trackIdx) => {
            const isMain = trackIdx === 0;
            return (
              <div
                key={`video-hdr-${trackIdx}`}
                className={`track-header-row video-header ${!isMain ? "overlay-header" : ""}`}
              >
                <span className="track-header-title">
                  {isMain ? "V1 Main" : `V${trackIdx + 1} Overlay / PiP`}
                </span>
                <button
                  type="button"
                  className="track-header-add"
                  onClick={onAddVideoTrack}
                  title="Add Video Overlay Track"
                >
                  +V
                </button>
              </div>
            );
          })}

          {/* Dynamic Audio Track Headers */}
          {audioTracks.map((trackIdx) => (
            <div
              key={`audio-hdr-${trackIdx}`}
              className="track-header-row audio-header"
            >
              <span className="track-header-title">
                {trackIdx === 0 ? "A1 Music / Audio" : `A${trackIdx + 1} Audio`}
              </span>
              <button
                type="button"
                className="track-header-add"
                onClick={onAddAudioTrack}
                title="Add Audio Track"
              >
                +A
              </button>
            </div>
          ))}
        </div>

        {/* Scrollable Track Body */}
        <div ref={scrollRef} className="capcut-timeline-scroll">
          <div
            ref={trackRef}
            className="capcut-timeline-track-canvas"
            style={{
              width: `${trackWidthPx}px`,
              minWidth: "100%",
            }}
            onClick={handleTimelineClick}
            onPointerMove={handleTrackPointerMove}
            onPointerUp={endTrimDrag}
            onPointerLeave={endTrimDrag}
          >
            {/* Time Ruler with markers placed at exact seconds */}
            <div className="timeline-time-ruler">
              {generateTimeMarkers(runwayDuration, pxPerSec).map((mark) => (
                <div
                  key={mark.seconds}
                  className="ruler-marker"
                  style={{ left: `${mark.seconds * pxPerSec}px` }}
                >
                  <span className="ruler-marker-label">{mark.label}</span>
                  <div className="ruler-marker-tick" />
                </div>
              ))}
            </div>

            {/* Playhead needle placed at currentTime * pxPerSec */}
            <div
              className="capcut-playhead"
              style={{
                left: `${currentTime * pxPerSec}px`,
              }}
            >
              <div className="playhead-cap" />
              <div className="playhead-line" />
            </div>

            {/* Dynamic Video Track Lanes */}
            {videoTracks.map((trackIdx) => {
              const isMain = trackIdx === 0;
              const trackClips = clips.filter((c) => {
                const item = media.find((m) => m.id === c.mediaId);
                const isAudio = c.trackKind === "audio" || item?.type === "audio";
                if (isAudio) return false;
                const assigned = c.track ?? (c.pictureInPicture ? 1 : 0);
                return assigned === trackIdx;
              });

              return (
                <div
                  key={`video-lane-${trackIdx}`}
                  className={`timeline-lane lane-video ${!isMain ? "lane-overlay" : ""}`}
                >
                  {trackClips.map((clip) => {
                    const item = media.find((m) => m.id === clip.mediaId);
                    const duration = Math.max(0.1, clip.sourceEnd - clip.sourceStart);
                    const isDragging = clipDragState?.clipId === clip.id;
                    const displayStart = isDragging
                      ? clipDragState.currentStart
                      : clip.timelineStart;

                    return (
                      <div
                        key={clip.id}
                        className={`capcut-clip-card ${!isMain ? "overlay-clip-card" : ""} ${selectedClipId === clip.id ? "selected" : ""} ${isDragging ? "is-dragging" : ""}`}
                        style={{
                          left: `${displayStart * pxPerSec}px`,
                          width: `${Math.max(18, duration * pxPerSec)}px`,
                        }}
                        onPointerDown={(e) => handleClipPointerDown(e, clip)}
                        onPointerMove={handleClipPointerMove}
                        onPointerUp={handleClipPointerUp}
                        onPointerCancel={handleClipPointerUp}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                      >
                        {/* Drag tooltip showing exact timecode during move */}
                        {isDragging && (
                          <div className="clip-drag-tooltip">
                            ⏱ {formatTime(displayStart)}
                          </div>
                        )}

                        <div
                          className="clip-trim-handle clip-trim-left"
                          onPointerDown={(e) => beginTrimDrag(e, clip.id, "start")}
                          title="Drag to trim start"
                        />

                        <div className="clip-card-inner">
                          <div className="clip-card-title">
                            <span className="clip-type-glyph">
                              {!isMain ? "⧉" : "🎬"}
                            </span>
                            <strong className="clip-card-name">
                              {item?.name ?? (isMain ? "Video Clip" : "Overlay Clip")}
                            </strong>
                            {/* Fast track switcher badge */}
                            <button
                              type="button"
                              className="clip-track-pill"
                              title={`Click to switch between V1 Main and V2 Overlay (Current: V${trackIdx + 1})`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateClipTrack?.(
                                  clip.id,
                                  trackIdx === 0 ? 1 : 0,
                                );
                              }}
                            >
                              V{trackIdx + 1}
                            </button>
                          </div>
                          <div className="clip-card-meta">
                            <span>{formatTime(duration)}</span>
                            {!isMain && <span className="meta-tag">Overlay</span>}
                            {clip.textOverlay && <span className="meta-tag">Text</span>}
                            {clip.speed !== 1 && <span className="meta-tag">{clip.speed}x</span>}
                            {clip.muted && <span className="meta-tag">Muted</span>}
                          </div>
                        </div>

                        <div
                          className="clip-trim-handle clip-trim-right"
                          onPointerDown={(e) => beginTrimDrag(e, clip.id, "end")}
                          title="Drag to trim end"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Dynamic Audio Track Lanes */}
            {audioTracks.map((trackIdx) => {
              const trackClips = clips.filter((c) => {
                const item = media.find((m) => m.id === c.mediaId);
                const isAudio = c.trackKind === "audio" || item?.type === "audio";
                if (!isAudio) return false;
                const assigned = c.track ?? 0;
                return assigned === trackIdx;
              });

              return (
                <div
                  key={`audio-lane-${trackIdx}`}
                  className="timeline-lane lane-audio"
                >
                  {trackClips.map((clip) => {
                    const item = media.find((m) => m.id === clip.mediaId);
                    const duration = Math.max(0.1, clip.sourceEnd - clip.sourceStart);
                    const isDragging = clipDragState?.clipId === clip.id;
                    const displayStart = isDragging
                      ? clipDragState.currentStart
                      : clip.timelineStart;

                    return (
                      <div
                        key={clip.id}
                        className={`capcut-clip-card audio-clip-card ${selectedClipId === clip.id ? "selected" : ""} ${isDragging ? "is-dragging" : ""}`}
                        style={{
                          left: `${displayStart * pxPerSec}px`,
                          width: `${Math.max(18, duration * pxPerSec)}px`,
                        }}
                        onPointerDown={(e) => handleClipPointerDown(e, clip)}
                        onPointerMove={handleClipPointerMove}
                        onPointerUp={handleClipPointerUp}
                        onPointerCancel={handleClipPointerUp}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                      >
                        {/* Drag tooltip showing exact timecode during move */}
                        {isDragging && (
                          <div className="clip-drag-tooltip">
                            ⏱ {formatTime(displayStart)}
                          </div>
                        )}

                        <div
                          className="clip-trim-handle clip-trim-left"
                          onPointerDown={(e) => beginTrimDrag(e, clip.id, "start")}
                          title="Drag to trim start"
                        />

                        <div className="clip-card-inner">
                          <div className="clip-card-title">
                            <span className="clip-type-glyph">♫</span>
                            <strong className="clip-card-name">
                              {item?.name ?? "Audio Track"}
                            </strong>
                          </div>
                          <div className="clip-card-meta">
                            <span>{formatTime(duration)}</span>
                            {clip.volume !== 100 && (
                              <span className="meta-tag">{clip.volume}%</span>
                            )}
                          </div>
                        </div>

                        <div
                          className="clip-trim-handle clip-trim-right"
                          onPointerDown={(e) => beginTrimDrag(e, clip.id, "end")}
                          title="Drag to trim end"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  if (ms > 0) {
    return `${minutes}:${secs.toString().padStart(2, "0")}.${ms}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Generate sensible second ticks according to zoom level
function generateTimeMarkers(totalDuration: number, pxPerSec: number): { seconds: number; label: string }[] {
  let step = 5;
  if (pxPerSec < 20) step = 15;
  else if (pxPerSec < 35) step = 10;
  else if (pxPerSec > 80) step = 2;
  else if (pxPerSec > 150) step = 1;

  const markers: { seconds: number; label: string }[] = [];
  for (let s = 0; s <= totalDuration; s += step) {
    markers.push({ seconds: s, label: formatTime(s) });
  }

  return markers;
}