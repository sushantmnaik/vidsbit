"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TimelineClip, MediaFile, TrackKind } from "@/types/editor";

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

  onSelectClip: (clipId: string | null) => void;
  onDeleteClip: (clipId: string) => void;
  onSplitClip: (clipId: string) => void;
  onTrimStart: (clipId: string) => void;
  onTrimEnd: (clipId: string) => void;
  onMoveClip?: (clipId: string, direction: "left" | "right") => void;
  onDuplicateClip: (clipId: string) => void;
  onTrimDragBegin: (clipId: string, handle: "start" | "end") => void;
  onTrimDragUpdate: (
    clipId: string,
    handle: "start" | "end",
    deltaSeconds: number,
  ) => void;
  onReorderClip?: (sourceId: string, targetId: string) => void;
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
  onAddToTimeline?: (
    mediaId: string,
    customStartTime?: number,
    customTrack?: number,
    customTrackKind?: "video" | "audio",
  ) => void;
  onToggleTrackMute?: (trackIndex: number, trackKind: "video" | "audio") => void;
}

export default function Timeline({
  clips,
  media,
  selectedClipId,
  currentTime,
  isPlaying,
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
  onTogglePlay,
  onSeek,
  onAddTextPrompt,
  onAddToTimeline,
  onToggleTrackMute,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Pixels per second based on zoom level
  const pxPerSec = Math.max(10, BASE_PX_PER_SEC * timelineZoom);

  // Total project duration based on clips
  const clipsEnd = useMemo(() => {
    return clips.reduce(
      (max, clip) =>
        Math.max(
          max,
          clip.timelineStart + Math.max(0.1, clip.sourceEnd - clip.sourceStart),
        ),
      0,
    );
  }, [clips]);

  // Runway duration: at least 60 seconds or clipsEnd + 20s buffer
  const runwayDuration = Math.max(60, clipsEnd + 20);
  const trackWidthPx = Math.max(1200, runwayDuration * pxPerSec);

  // Hover state for ghost needle on ruler
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Playhead scrubbing state
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Visual magnetic snap line (in seconds)
  const [snapGuideline, setSnapGuideline] = useState<{
    time: number;
    label: string;
  } | null>(null);

  // Active trim drag state
  const [trimDragState, setTrimDragState] = useState<{
    clipId: string;
    handle: "start" | "end";
    startX: number;
    initialTimelineStart: number;
    initialSourceStart: number;
    initialSourceEnd: number;
    currentDelta: number;
  } | null>(null);

  // Clip drag state (horizontal move + vertical track change)
  const [clipDragState, setClipDragState] = useState<{
    clipId: string;
    startX: number;
    startY: number;
    origStart: number;
    currentStart: number;
    origTrack: number;
    currentTrack: number;
    origKind: "video" | "audio";
    currentKind: "video" | "audio";
    moved: boolean;
  } | null>(null);

  // Drag over target for media dropping from MediaPanel
  const [dragOverLane, setDragOverLane] = useState<{
    track: number;
    kind: "video" | "audio";
  } | null>(null);

  // Auto-scroll viewport if pointer is near left/right edges
  const checkAutoScroll = useCallback((clientX: number) => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const rect = scrollEl.getBoundingClientRect();
    const edgeMargin = 45;
    if (clientX < rect.left + edgeMargin) {
      const intensity = Math.min(25, (rect.left + edgeMargin - clientX) * 0.5);
      scrollEl.scrollLeft -= intensity;
    } else if (clientX > rect.right - edgeMargin) {
      const intensity = Math.min(25, (clientX - (rect.right - edgeMargin)) * 0.5);
      scrollEl.scrollLeft += intensity;
    }
  }, []);

  // -----------------------------------------------------------------
  // 1. Playhead Scrubbing: Ruler & Playhead Cap
  // -----------------------------------------------------------------
  const startScrubbing = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      let targetTime = Math.max(0, Math.min(runwayDuration, clickX / pxPerSec));

      if (snapEnabled && clips.length > 0) {
        const threshold = 10 / pxPerSec;
        for (const c of clips) {
          const cDur = Math.max(0.1, c.sourceEnd - c.sourceStart);
          if (Math.abs(targetTime - c.timelineStart) <= threshold) {
            targetTime = c.timelineStart;
            break;
          }
          if (Math.abs(targetTime - (c.timelineStart + cDur)) <= threshold) {
            targetTime = c.timelineStart + cDur;
            break;
          }
        }
      }

      setIsScrubbing(true);
      onSeek(targetTime);
    },
    [clips, onSeek, pxPerSec, runwayDuration, snapEnabled],
  );

  useEffect(() => {
    if (!isScrubbing) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      let targetTime = Math.max(0, Math.min(runwayDuration, (e.clientX - rect.left) / pxPerSec));

      if (snapEnabled && clips.length > 0) {
        const threshold = 10 / pxPerSec;
        let snapped = false;
        for (const c of clips) {
          const cDur = Math.max(0.1, c.sourceEnd - c.sourceStart);
          if (Math.abs(targetTime - c.timelineStart) <= threshold) {
            targetTime = c.timelineStart;
            setSnapGuideline({ time: targetTime, label: `Cut: ${formatTime(targetTime)}` });
            snapped = true;
            break;
          }
          if (Math.abs(targetTime - (c.timelineStart + cDur)) <= threshold) {
            targetTime = c.timelineStart + cDur;
            setSnapGuideline({ time: targetTime, label: `Cut: ${formatTime(targetTime)}` });
            snapped = true;
            break;
          }
        }
        if (!snapped) {
          setSnapGuideline(null);
        }
      }

      onSeek(targetTime);
      checkAutoScroll(e.clientX);
    };

    const handlePointerUp = () => {
      setIsScrubbing(false);
      setSnapGuideline(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [checkAutoScroll, clips, isScrubbing, onSeek, pxPerSec, runwayDuration, snapEnabled]);

  // -----------------------------------------------------------------
  // 2. Trim Handle Dragging with Window Listeners & Snapping
  // -----------------------------------------------------------------
  const beginTrimDrag = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      clip: TimelineClip,
      handle: "start" | "end",
    ) => {
      event.preventDefault();
      event.stopPropagation();
      onTrimDragBegin(clip.id, handle);
      setTrimDragState({
        clipId: clip.id,
        handle,
        startX: event.clientX,
        initialTimelineStart: clip.timelineStart,
        initialSourceStart: clip.sourceStart,
        initialSourceEnd: clip.sourceEnd,
        currentDelta: 0,
      });
      onSelectClip(clip.id);
    },
    [onSelectClip, onTrimDragBegin],
  );

  useEffect(() => {
    if (!trimDragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaPixels = e.clientX - trimDragState.startX;
      let deltaSeconds = deltaPixels / pxPerSec;

      const clip = clips.find((c) => c.id === trimDragState.clipId);
      if (!clip) return;

      const mediaItem = media.find((m) => m.id === clip.mediaId);
      const maxSource = mediaItem?.duration && mediaItem.duration > 0 ? mediaItem.duration : 3600;

      // Magnetic snapping for trim edges
      if (snapEnabled) {
        const threshold = 10 / pxPerSec;
        const testPoints = [currentTime, 0];
        for (const c of clips) {
          if (c.id === clip.id) continue;
          testPoints.push(c.timelineStart);
          testPoints.push(c.timelineStart + Math.max(0.1, c.sourceEnd - c.sourceStart));
        }

        let snapped = false;
        if (trimDragState.handle === "start") {
          const candTimelineStart = trimDragState.initialTimelineStart + deltaSeconds;
          for (const pt of testPoints) {
            if (Math.abs(candTimelineStart - pt) <= threshold) {
              deltaSeconds = pt - trimDragState.initialTimelineStart;
              setSnapGuideline({ time: pt, label: `Snap: ${formatTime(pt)}` });
              snapped = true;
              break;
            }
          }
        } else {
          const candTimelineEnd =
            trimDragState.initialTimelineStart +
            (trimDragState.initialSourceEnd - trimDragState.initialSourceStart) +
            deltaSeconds;
          for (const pt of testPoints) {
            if (Math.abs(candTimelineEnd - pt) <= threshold) {
              deltaSeconds =
                pt -
                (trimDragState.initialTimelineStart +
                  (trimDragState.initialSourceEnd - trimDragState.initialSourceStart));
              setSnapGuideline({ time: pt, label: `Snap: ${formatTime(pt)}` });
              snapped = true;
              break;
            }
          }
        }

        if (!snapped) {
          setSnapGuideline(null);
        }
      }

      onTrimDragUpdate(trimDragState.clipId, trimDragState.handle, deltaSeconds);
      setTrimDragState((prev) => (prev ? { ...prev, currentDelta: deltaSeconds } : null));
      checkAutoScroll(e.clientX);
    };

    const handlePointerUp = () => {
      setTrimDragState(null);
      setSnapGuideline(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [checkAutoScroll, clips, currentTime, media, onTrimDragUpdate, pxPerSec, snapEnabled, trimDragState]);

  // -----------------------------------------------------------------
  // 3. Multi-Track Clip Dragging (Horizontal & Vertical)
  // -----------------------------------------------------------------
  const handleClipPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    clip: TimelineClip,
  ) => {
    if ((event.target as HTMLElement).closest(".clip-trim-handle, .clip-track-pill")) {
      return;
    }

    event.preventDefault();
    const isAudio = clip.trackKind === "audio";

    setClipDragState({
      clipId: clip.id,
      startX: event.clientX,
      startY: event.clientY,
      origStart: clip.timelineStart,
      currentStart: clip.timelineStart,
      origTrack: clip.track ?? 0,
      currentTrack: clip.track ?? 0,
      origKind: isAudio ? "audio" : "video",
      currentKind: isAudio ? "audio" : "video",
      moved: false,
    });
    onSelectClip(clip.id);
  };

  useEffect(() => {
    if (!clipDragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - clipDragState.startX;
      const deltaY = e.clientY - clipDragState.startY;

      if (!clipDragState.moved && Math.abs(deltaX) < 4 && Math.abs(deltaY) < 4) {
        return;
      }

      const activeClip = clips.find((c) => c.id === clipDragState.clipId);
      const clipDuration = activeClip
        ? Math.max(0.1, activeClip.sourceEnd - activeClip.sourceStart)
        : 1;

      // 1. Horizontal candidate start
      let candStart = Math.max(0, clipDragState.origStart + deltaX / pxPerSec);

      // Two-way magnetic snapping
      if (snapEnabled) {
        const threshold = 12 / pxPerSec;
        const candidates = [0, currentTime];
        for (const c of clips) {
          if (c.id === clipDragState.clipId) continue;
          const dur = Math.max(0.1, c.sourceEnd - c.sourceStart);
          candidates.push(c.timelineStart);
          candidates.push(c.timelineStart + dur);
        }

        let snapped = false;
        // Check start edge
        for (const cand of candidates) {
          if (Math.abs(candStart - cand) <= threshold) {
            candStart = cand;
            setSnapGuideline({ time: cand, label: `Snap: ${formatTime(cand)}` });
            snapped = true;
            break;
          }
        }
        // Check end edge if start didn't snap
        if (!snapped) {
          for (const cand of candidates) {
            if (Math.abs(candStart + clipDuration - cand) <= threshold) {
              candStart = Math.max(0, cand - clipDuration);
              setSnapGuideline({ time: cand, label: `Snap: ${formatTime(cand)}` });
              snapped = true;
              break;
            }
          }
        }
        if (!snapped) {
          setSnapGuideline(null);
        }
      }

      candStart = Math.max(0, Math.round(candStart * 100) / 100);

      // 2. Vertical Lane detection
      let targetTrack = clipDragState.origTrack;
      let targetKind = clipDragState.origKind;

      if (trackRef.current) {
        const lanes = trackRef.current.querySelectorAll<HTMLElement>(".timeline-lane");
        for (const lane of lanes) {
          const rect = lane.getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const laneTrackStr = lane.dataset.trackIndex;
            const laneKind = lane.dataset.trackKind as "video" | "audio" | undefined;
            if (laneTrackStr !== undefined && laneKind === clipDragState.origKind) {
              targetTrack = parseInt(laneTrackStr, 10);
              targetKind = laneKind;
            }
            break;
          }
        }
      }

      setClipDragState((prev) =>
        prev
          ? {
              ...prev,
              currentStart: candStart,
              currentTrack: targetTrack,
              currentKind: targetKind,
              moved: true,
            }
          : null,
      );

      checkAutoScroll(e.clientX);
    };

    const handlePointerUp = () => {
      if (clipDragState.moved) {
        if (clipDragState.currentStart !== clipDragState.origStart && onUpdateClipStart) {
          onUpdateClipStart(clipDragState.clipId, clipDragState.currentStart);
        }
        if (
          (clipDragState.currentTrack !== clipDragState.origTrack ||
            clipDragState.currentKind !== clipDragState.origKind) &&
          onUpdateClipTrack
        ) {
          onUpdateClipTrack(
            clipDragState.clipId,
            clipDragState.currentTrack,
            clipDragState.currentKind,
          );
        }
      }
      setClipDragState(null);
      setSnapGuideline(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [
    checkAutoScroll,
    clipDragState,
    clips,
    currentTime,
    onUpdateClipStart,
    onUpdateClipTrack,
    pxPerSec,
    snapEnabled,
  ]);

  // -----------------------------------------------------------------
  // 4. Auto-Scroll with Playhead During Playback
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying || !scrollRef.current) return;
    const scrollEl = scrollRef.current;
    const playheadPx = currentTime * pxPerSec;
    const currentScroll = scrollEl.scrollLeft;
    const viewWidth = scrollEl.clientWidth;

    if (playheadPx > currentScroll + viewWidth * 0.85 || playheadPx < currentScroll) {
      scrollEl.scrollTo({
        left: Math.max(0, playheadPx - 60),
        behavior: "smooth",
      });
    }
  }, [isPlaying, currentTime, pxPerSec]);

  // -----------------------------------------------------------------
  // 5. Wheel Zoom & Touch Pinch
  // -----------------------------------------------------------------
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

  // -----------------------------------------------------------------
  // 6. Global / Deck Keyboard Shortcuts
  // -----------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          Boolean(activeEl.isContentEditable))
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        onTogglePlay();
      } else if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedClipId) {
          e.preventDefault();
          onDeleteClip(selectedClipId);
        }
      } else if (e.key === "s" || e.key === "S") {
        if (e.ctrlKey || e.metaKey || !e.shiftKey) {
          e.preventDefault();
          if (selectedClipId) {
            onSplitClip(selectedClipId);
          } else {
            const clipAtPlayhead = clips.find(
              (c) =>
                currentTime >= c.timelineStart &&
                currentTime <= c.timelineStart + (c.sourceEnd - c.sourceStart),
            );
            if (clipAtPlayhead) {
              onSplitClip(clipAtPlayhead.id);
            }
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        if (selectedClipId) {
          e.preventDefault();
          onDuplicateClip(selectedClipId);
        }
      } else if (e.key === "q" || e.key === "Q") {
        if (selectedClipId) {
          e.preventDefault();
          onTrimStart(selectedClipId);
        }
      } else if (e.key === "w" || e.key === "W") {
        if (selectedClipId) {
          e.preventDefault();
          onTrimEnd(selectedClipId);
        }
      } else if (e.key === "n" || e.key === "N") {
        onToggleSnap();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 0.1;
        onSeek(Math.max(0, currentTime - step));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 0.1;
        onSeek(Math.min(runwayDuration, currentTime + step));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    clips,
    currentTime,
    onDeleteClip,
    onDuplicateClip,
    onSeek,
    onSplitClip,
    onTogglePlay,
    onToggleSnap,
    onTrimEnd,
    onTrimStart,
    runwayDuration,
    selectedClipId,
  ]);

  // Fit Button handler
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
  const videoTracks = Array.from(
    { length: actualVideoCount },
    (_, i) => actualVideoCount - 1 - i,
  );

  // Determine active audio track indices (0, 1, ...)
  const actualAudioCount = Math.max(1, audioTrackCount);
  const audioTracks = Array.from({ length: actualAudioCount }, (_, i) => i);

  // Clip under playhead for quick split when none is selected
  const clipUnderPlayhead = clips.find(
    (c) =>
      currentTime >= c.timelineStart &&
      currentTime <= c.timelineStart + Math.max(0.1, c.sourceEnd - c.sourceStart),
  );

  return (
    <section className="capcut-timeline-container" aria-label="Timeline editing deck">
      {/* PowerDirector / CapCut Timeline Toolbar */}
      <div className="capcut-timeline-toolbar">
        <div className="timeline-tool-group">
          <button
            type="button"
            className="tb-action-btn tb-split-btn"
            disabled={!selectedClipId && !clipUnderPlayhead}
            onClick={() => {
              if (selectedClipId) {
                onSplitClip(selectedClipId);
              } else if (clipUnderPlayhead) {
                onSelectClip(clipUnderPlayhead.id);
                onSplitClip(clipUnderPlayhead.id);
              }
            }}
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
            title="Toggle magnetic snapping (N)"
          >
            <span className="tb-icon">🧲</span>
            <span className="tb-text">Magnet {snapEnabled ? "ON" : "OFF"}</span>
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
            const trackClips = clips.filter(
              (c) =>
                c.trackKind !== "audio" && (c.track ?? 0) === trackIdx,
            );
            const isTrackMuted = trackClips.length > 0 && trackClips.every((c) => c.muted);

            return (
              <div
                key={`video-hdr-${trackIdx}`}
                className={`track-header-row video-header ${!isMain ? "overlay-header" : ""}`}
              >
                <div className="track-header-left">
                  <span className="track-header-title">
                    {isMain ? "V1 Main" : `V${trackIdx + 1} Overlay`}
                  </span>
                </div>
                <div className="track-header-actions">
                  <button
                    type="button"
                    className={`track-mute-btn ${isTrackMuted ? "is-muted" : ""}`}
                    onClick={() => onToggleTrackMute?.(trackIdx, "video")}
                    title={isTrackMuted ? "Unmute track" : "Mute track"}
                  >
                    {isTrackMuted ? "🔇" : "🔊"}
                  </button>
                  <button
                    type="button"
                    className="track-header-add"
                    onClick={onAddVideoTrack}
                    title="Add Video Overlay Track"
                  >
                    +V
                  </button>
                </div>
              </div>
            );
          })}

          {/* Dynamic Audio Track Headers */}
          {audioTracks.map((trackIdx) => {
            const trackClips = clips.filter(
              (c) =>
                c.trackKind === "audio" && (c.track ?? 0) === trackIdx,
            );
            const isTrackMuted = trackClips.length > 0 && trackClips.every((c) => c.muted);

            return (
              <div
                key={`audio-hdr-${trackIdx}`}
                className="track-header-row audio-header"
              >
                <div className="track-header-left">
                  <span className="track-header-title">
                    {trackIdx === 0 ? "A1 Music" : `A${trackIdx + 1} Audio`}
                  </span>
                </div>
                <div className="track-header-actions">
                  <button
                    type="button"
                    className={`track-mute-btn ${isTrackMuted ? "is-muted" : ""}`}
                    onClick={() => onToggleTrackMute?.(trackIdx, "audio")}
                    title={isTrackMuted ? "Unmute track" : "Mute track"}
                  >
                    {isTrackMuted ? "🔇" : "🔊"}
                  </button>
                  <button
                    type="button"
                    className="track-header-add"
                    onClick={onAddAudioTrack}
                    title="Add Audio Track"
                  >
                    +A
                  </button>
                </div>
              </div>
            );
          })}
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
            onClick={(e) => {
              if (
                !(e.target as HTMLElement).closest(
                  ".capcut-clip-card, .clip-trim-handle, .playhead-cap",
                )
              ) {
                onSelectClip(null);
              }
            }}
          >
            {/* Time Ruler with interactive scrubbing & hover needle */}
            <div
              className="timeline-time-ruler"
              onPointerDown={(e) => {
                e.preventDefault();
                startScrubbing(e.clientX);
              }}
              onPointerMove={(e) => {
                if (!trackRef.current) return;
                const rect = trackRef.current.getBoundingClientRect();
                const hoverSec = Math.max(0, (e.clientX - rect.left) / pxPerSec);
                setHoverTime(hoverSec);
              }}
              onPointerLeave={() => setHoverTime(null)}
            >
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

              {/* Ghost needle on ruler hover */}
              {hoverTime !== null && !isScrubbing && (
                <>
                  <div
                    className="playhead-hover-needle"
                    style={{ left: `${hoverTime * pxPerSec}px` }}
                  />
                  <div
                    className="playhead-hover-badge"
                    style={{ left: `${hoverTime * pxPerSec}px` }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                </>
              )}
            </div>

            {/* Magnetic Snap Guideline */}
            {snapGuideline && (
              <>
                <div
                  className="snap-guide-line"
                  style={{ left: `${snapGuideline.time * pxPerSec}px` }}
                />
                <div
                  className="snap-guide-badge"
                  style={{ left: `${snapGuideline.time * pxPerSec}px` }}
                >
                  {snapGuideline.label}
                </div>
              </>
            )}

            {/* Playhead needle and grab handle */}
            <div
              className="capcut-playhead"
              style={{
                left: `${currentTime * pxPerSec}px`,
              }}
            >
              <div
                className="playhead-cap"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startScrubbing(e.clientX);
                }}
                title="Drag to scrub timeline"
              >
                {/* Floating timecode badge while scrubbing or hovering */}
                {isScrubbing && (
                  <div className="playhead-time-badge">
                    ⏱ {formatTime(currentTime)}
                  </div>
                )}
              </div>
              <div className="playhead-line" />
            </div>

            {/* Dynamic Video Track Lanes */}
            {videoTracks.map((trackIdx) => {
              const isMain = trackIdx === 0;
              const isDragTarget =
                (dragOverLane?.kind === "video" && dragOverLane.track === trackIdx) ||
                (clipDragState?.moved &&
                  clipDragState.currentKind === "video" &&
                  clipDragState.currentTrack === trackIdx);

              const trackClips = clips.filter((c) => {
                const item = media.find((m) => m.id === c.mediaId);
                const isAudio = c.trackKind === "audio" || item?.type === "audio";
                if (isAudio) return false;

                // If currently being dragged, place into candidate track
                if (clipDragState?.clipId === c.id && clipDragState.moved) {
                  return clipDragState.currentKind === "video" && clipDragState.currentTrack === trackIdx;
                }

                const assigned = c.track ?? (c.pictureInPicture ? 1 : 0);
                return assigned === trackIdx;
              });

              return (
                <div
                  key={`video-lane-${trackIdx}`}
                  data-track-index={trackIdx}
                  data-track-kind="video"
                  className={`timeline-lane lane-video ${!isMain ? "lane-overlay" : ""} ${isDragTarget ? "lane-drop-target" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    setDragOverLane({ track: trackIdx, kind: "video" });
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget === e.target) {
                      setDragOverLane(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverLane(null);
                    const mediaId = e.dataTransfer.getData("mediaId");
                    if (!mediaId) return;
                    const rect = trackRef.current?.getBoundingClientRect();
                    const dropX = rect ? e.clientX - rect.left : 0;
                    const dropTime = Math.max(0, dropX / pxPerSec);
                    onAddToTimeline?.(mediaId, dropTime, trackIdx, "video");
                  }}
                >
                  {trackClips.map((clip) => {
                    const item = media.find((m) => m.id === clip.mediaId);
                    const duration = Math.max(0.1, clip.sourceEnd - clip.sourceStart);
                    const isDraggingThisClip = clipDragState?.clipId === clip.id;
                    const displayStart =
                      isDraggingThisClip && clipDragState.moved
                        ? clipDragState.currentStart
                        : clip.timelineStart;

                    const isTrimmingThis = trimDragState?.clipId === clip.id;

                    return (
                      <div
                        key={clip.id}
                        className={`capcut-clip-card ${!isMain ? "overlay-clip-card" : ""} ${selectedClipId === clip.id ? "selected" : ""} ${isDraggingThisClip ? "is-dragging" : ""}`}
                        style={{
                          left: `${displayStart * pxPerSec}px`,
                          width: `${Math.max(22, duration * pxPerSec)}px`,
                        }}
                        onPointerDown={(e) => handleClipPointerDown(e, clip)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                      >
                        {/* Drag tooltip showing exact timecode during move */}
                        {isDraggingThisClip && clipDragState.moved && (
                          <div className="clip-drag-tooltip">
                            ⏱ {formatTime(displayStart)} [V{clipDragState.currentTrack + 1}]
                          </div>
                        )}

                        {/* Active Trim Tooltip */}
                        {isTrimmingThis && (
                          <div className="clip-trim-tooltip">
                            {trimDragState.handle === "start" ? "⇤ Trim Start: " : "⇥ Trim End: "}
                            {formatTime(
                              trimDragState.handle === "start"
                                ? Math.max(0, trimDragState.initialSourceStart + trimDragState.currentDelta)
                                : Math.max(0, trimDragState.initialSourceEnd + trimDragState.currentDelta),
                            )}
                            {" "}(Dur: {formatTime(duration)})
                          </div>
                        )}

                        {/* Left Trim Handle */}
                        <div
                          className={`clip-trim-handle clip-trim-left ${isTrimmingThis && trimDragState.handle === "start" ? "is-active-trim" : ""}`}
                          onPointerDown={(e) => beginTrimDrag(e, clip, "start")}
                          title="Drag to trim start (or press Q at playhead)"
                        />

                        {/* Clip Card Content */}
                        <div className="clip-card-inner">
                          <div className="clip-card-title">
                            <span className="clip-type-glyph">
                              {!isMain ? "⧉" : "🎬"}
                            </span>
                            <strong className="clip-card-name">
                              {item?.name ?? (isMain ? "Video Clip" : "Overlay Clip")}
                            </strong>
                            <button
                              type="button"
                              className="clip-track-pill"
                              title={`Switch to ${trackIdx === 0 ? "V2 Overlay" : "V1 Main"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateClipTrack?.(
                                  clip.id,
                                  trackIdx === 0 ? 1 : 0,
                                  "video",
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

                        {/* Right Trim Handle */}
                        <div
                          className={`clip-trim-handle clip-trim-right ${isTrimmingThis && trimDragState.handle === "end" ? "is-active-trim" : ""}`}
                          onPointerDown={(e) => beginTrimDrag(e, clip, "end")}
                          title="Drag to trim end (or press W at playhead)"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Dynamic Audio Track Lanes */}
            {audioTracks.map((trackIdx) => {
              const isDragTarget =
                (dragOverLane?.kind === "audio" && dragOverLane.track === trackIdx) ||
                (clipDragState?.moved &&
                  clipDragState.currentKind === "audio" &&
                  clipDragState.currentTrack === trackIdx);

              const trackClips = clips.filter((c) => {
                const item = media.find((m) => m.id === c.mediaId);
                const isAudio = c.trackKind === "audio" || item?.type === "audio";
                if (!isAudio) return false;

                // If currently being dragged, place into candidate track
                if (clipDragState?.clipId === c.id && clipDragState.moved) {
                  return clipDragState.currentKind === "audio" && clipDragState.currentTrack === trackIdx;
                }

                const assigned = c.track ?? 0;
                return assigned === trackIdx;
              });

              return (
                <div
                  key={`audio-lane-${trackIdx}`}
                  data-track-index={trackIdx}
                  data-track-kind="audio"
                  className={`timeline-lane lane-audio ${isDragTarget ? "lane-drop-target" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    setDragOverLane({ track: trackIdx, kind: "audio" });
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget === e.target) {
                      setDragOverLane(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverLane(null);
                    const mediaId = e.dataTransfer.getData("mediaId");
                    if (!mediaId) return;
                    const rect = trackRef.current?.getBoundingClientRect();
                    const dropX = rect ? e.clientX - rect.left : 0;
                    const dropTime = Math.max(0, dropX / pxPerSec);
                    onAddToTimeline?.(mediaId, dropTime, trackIdx, "audio");
                  }}
                >
                  {trackClips.map((clip) => {
                    const item = media.find((m) => m.id === clip.mediaId);
                    const duration = Math.max(0.1, clip.sourceEnd - clip.sourceStart);
                    const isDraggingThisClip = clipDragState?.clipId === clip.id;
                    const displayStart =
                      isDraggingThisClip && clipDragState.moved
                        ? clipDragState.currentStart
                        : clip.timelineStart;

                    const isTrimmingThis = trimDragState?.clipId === clip.id;

                    return (
                      <div
                        key={clip.id}
                        className={`capcut-clip-card audio-clip-card ${selectedClipId === clip.id ? "selected" : ""} ${isDraggingThisClip ? "is-dragging" : ""}`}
                        style={{
                          left: `${displayStart * pxPerSec}px`,
                          width: `${Math.max(22, duration * pxPerSec)}px`,
                        }}
                        onPointerDown={(e) => handleClipPointerDown(e, clip)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                      >
                        {/* Drag tooltip showing exact timecode during move */}
                        {isDraggingThisClip && clipDragState.moved && (
                          <div className="clip-drag-tooltip">
                            ⏱ {formatTime(displayStart)} [A{clipDragState.currentTrack + 1}]
                          </div>
                        )}

                        {/* Active Trim Tooltip */}
                        {isTrimmingThis && (
                          <div className="clip-trim-tooltip">
                            {trimDragState.handle === "start" ? "⇤ Trim Start: " : "⇥ Trim End: "}
                            {formatTime(
                              trimDragState.handle === "start"
                                ? Math.max(0, trimDragState.initialSourceStart + trimDragState.currentDelta)
                                : Math.max(0, trimDragState.initialSourceEnd + trimDragState.currentDelta),
                            )}
                            {" "}(Dur: {formatTime(duration)})
                          </div>
                        )}

                        {/* Left Trim Handle */}
                        <div
                          className={`clip-trim-handle clip-trim-left ${isTrimmingThis && trimDragState.handle === "start" ? "is-active-trim" : ""}`}
                          onPointerDown={(e) => beginTrimDrag(e, clip, "start")}
                          title="Drag to trim audio start"
                        />

                        {/* Clip Content */}
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
                            {clip.muted && <span className="meta-tag">Muted</span>}
                          </div>
                        </div>

                        {/* Right Trim Handle */}
                        <div
                          className={`clip-trim-handle clip-trim-right ${isTrimmingThis && trimDragState.handle === "end" ? "is-active-trim" : ""}`}
                          onPointerDown={(e) => beginTrimDrag(e, clip, "end")}
                          title="Drag to trim audio end"
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
function generateTimeMarkers(
  totalDuration: number,
  pxPerSec: number,
): { seconds: number; label: string }[] {
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