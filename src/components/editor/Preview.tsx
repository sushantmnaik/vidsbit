"use client";

import { useEffect, useRef } from "react";
import { MediaFile, TimelineClip } from "@/types/editor";

interface PreviewProps {
  activeClip: TimelineClip | null;
  media: MediaFile[];
  isPlaying: boolean;
  timelineTime: number;
  onVideoEnded: () => void;
  onTogglePlay: () => void;
}

export default function Preview({
  activeClip,
  media,
  isPlaying,
  timelineTime,
  onVideoEnded,
  onTogglePlay,
}: PreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const selectedMedia = activeClip
    ? media.find((item) => item.id === activeClip.mediaId)
    : null;

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !activeClip || !selectedMedia) return;

    const targetTime = activeClip.sourceStart;

    if (Math.abs(video.currentTime - targetTime) > 0.15) {
      video.currentTime = targetTime;
    }

    if (isPlaying) {
      video.play().catch(() => {
        // Browser may block autoplay until the user interacts once.
      });
    } else {
      video.pause();
    }
  }, [activeClip, selectedMedia, isPlaying]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !activeClip || !isPlaying) return;

    const relativeTime =
      timelineTime - activeClip.timelineStart + activeClip.sourceStart;

    const clampedTime = Math.max(
      activeClip.sourceStart,
      Math.min(relativeTime, activeClip.sourceEnd),
    );

    if (Math.abs(video.currentTime - clampedTime) > 0.25) {
      video.currentTime = clampedTime;
    }
  }, [timelineTime, activeClip, isPlaying]);

  if (!activeClip || !selectedMedia) {
    return (
      <section className="preview-area">
        <div className="preview-empty">
          <div className="preview-logo">
            <img src="/android-chrome-192x192.png" alt="VIDSBIT logo" />
          </div>
          <p>Add a video to the timeline to begin</p>
        </div>
      </section>
    );
  }

  if (selectedMedia.type !== "video") {
    return (
      <section className="preview-area">
        <div className="preview-empty">
          {selectedMedia.type === "image" ? (
            <img
              src={selectedMedia.url}
              alt={selectedMedia.name}
              className="preview-image"
            />
          ) : (
            <div className="audio-preview">♫</div>
          )}

          <p>{selectedMedia.name}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="preview-area">
      <div className="preview-frame">
        <video
          ref={videoRef}
          src={selectedMedia.url}
          playsInline
          onEnded={onVideoEnded}
        />
      </div>

      <div className="preview-controls">
        <button
          className="play-button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>

        <div className="preview-current-time">
          {formatTime(timelineTime)}
        </div>

        <div className="preview-clip-name">
          {selectedMedia.name}
        </div>
      </div>
    </section>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}