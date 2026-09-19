"use client";

import { TimelineClip, MediaFile } from "@/types/editor";

interface TimelineProps {
  clips: TimelineClip[];
  media: MediaFile[];
  selectedClipId: string | null;
  currentTime: number;
  isPlaying: boolean;

  onSelectClip: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onSplitClip: (clipId: string) => void;
  onTrimStart: (clipId: string) => void;
  onTrimEnd: (clipId: string) => void;
  onMoveClip: (clipId: string, direction: "left" | "right") => void;

  onTogglePlay: () => void;
  onSeek: (time: number) => void;
}

export default function Timeline({
  clips,
  media,
  selectedClipId,
  currentTime,
  isPlaying,
  onSelectClip,
  onDeleteClip,
  onSplitClip,
  onTrimStart,
  onTrimEnd,
  onMoveClip,
  onTogglePlay,
  onSeek,
}: TimelineProps) {
  const timelineDuration = Math.max(
    0.1,
    clips.reduce(
      (max, clip) =>
        Math.max(
          max,
          clip.timelineStart + (clip.sourceEnd - clip.sourceStart),
        ),
      0,
    ),
  );

  const handleTimelineClick = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();

    const position = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width),
    );

    onSeek(position * timelineDuration);
  };

  return (
    <section className="timeline-panel">
      <div className="timeline-toolbar">
        <div className="timeline-title">
          <strong>Timeline</strong>

          <span className="timeline-duration">
            {formatTime(currentTime)} / {formatTime(timelineDuration)}
          </span>
        </div>

        <div className="timeline-actions">
          <button
            onClick={onTogglePlay}
            disabled={clips.length === 0}
            className="main-play-button"
          >
            {isPlaying ? "❚❚ Pause" : "▶ Play"}
          </button>

          <button
            disabled={!selectedClipId}
            onClick={() => selectedClipId && onTrimStart(selectedClipId)}
          >
            Trim Start
          </button>

          <button
            disabled={!selectedClipId}
            onClick={() => selectedClipId && onTrimEnd(selectedClipId)}
          >
            Trim End
          </button>

          <button
            disabled={!selectedClipId}
            onClick={() => selectedClipId && onSplitClip(selectedClipId)}
          >
            Split
          </button>

          <button
            disabled={!selectedClipId}
            onClick={() => selectedClipId && onDeleteClip(selectedClipId)}
          >
            Delete
          </button>
        </div>
      </div>

      {clips.length === 0 ? (
        <div className="timeline-empty">
          Add media to the timeline to start editing.
        </div>
      ) : (
        <div className="timeline-scroll">
          <div
            className="timeline-track"
            style={{
              minWidth: `${Math.max(900, timelineDuration * 100)}px`,
            }}
            onClick={handleTimelineClick}
          >
            <div
              className="playhead"
              style={{
                left: `${(currentTime / timelineDuration) * 100}%`,
              }}
            />

            {clips.map((clip, index) => {
              const item = media.find(
                (mediaItem) => mediaItem.id === clip.mediaId,
              );

              if (!item) return null;

              const duration = clip.sourceEnd - clip.sourceStart;

              return (
                <div
                  key={clip.id}
                  className={`timeline-clip ${
                    selectedClipId === clip.id ? "selected" : ""
                  }`}
                  style={{
                    left: `${(clip.timelineStart / timelineDuration) * 100}%`,
                    width: `${Math.max(
                      8,
                      (duration / timelineDuration) * 100,
                    )}%`,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectClip(clip.id);
                  }}
                >
                  <div className="clip-color" />

                  <div className="clip-content">
                    <strong>{item.name}</strong>
                    <span>{formatTime(duration)}</span>
                  </div>

                  <div className="clip-index">{index + 1}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedClipId && (
        <div className="selected-clip-controls">
          <button onClick={() => onMoveClip(selectedClipId, "left")}>
            ← Move Left
          </button>

          <button onClick={() => onMoveClip(selectedClipId, "right")}>
            Move Right →
          </button>
        </div>
      )}
    </section>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}