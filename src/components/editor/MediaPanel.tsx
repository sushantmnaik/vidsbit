"use client";

import { ChangeEvent, useRef } from "react";
import { MediaFile } from "@/types/editor";

interface MediaPanelProps {
  media: MediaFile[];
  onImport: (files: FileList) => void;
  onAddToTimeline: (mediaId: string) => void;
}

export default function MediaPanel({
  media,
  onImport,
  onAddToTimeline,
}: MediaPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImport(event.target.files);
    }

    event.target.value = "";
  };

  return (
    <aside className="media-panel">
      <div className="panel-header">
        <h2>Media</h2>

        <button
          className="import-button"
          onClick={() => inputRef.current?.click()}
        >
          + Import
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*,image/*"
          multiple
          hidden
          onChange={handleFileChange}
        />
      </div>

      {media.length === 0 ? (
        <div className="empty-media">
          <div className="empty-icon">＋</div>
          <p>Import videos, audio or images</p>
          <span>Your files stay on your device.</span>
        </div>
      ) : (
        <div className="media-list">
          {media.map((item) => (
            <div className="media-item" key={item.id}>
              <div className="media-thumbnail">
                {item.type === "video" ? (
                  <video src={item.url} muted preload="metadata" />
                ) : item.type === "image" ? (
                  <img src={item.url} alt="" />
                ) : (
                  <div className="audio-icon">♫</div>
                )}
              </div>

              <div className="media-info">
                <strong title={item.name}>{item.name}</strong>

                <span>
                  {item.type}
                  {item.duration !== undefined
                    ? ` • ${formatTime(item.duration)}`
                    : ""}
                </span>
              </div>

              <button
                className="add-media-button"
                onClick={() => onAddToTimeline(item.id)}
                title="Add to timeline"
              >
                +
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}