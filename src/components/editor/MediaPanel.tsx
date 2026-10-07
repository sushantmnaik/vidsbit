"use client";

import { ChangeEvent, useRef, useState } from "react";
import { MediaFile, FilterPreset, TransitionType, MediaType } from "@/types/editor";
import { ONLINE_MUSIC_CATALOG } from "@/lib/music/catalog";

interface MediaPanelProps {
  media: MediaFile[];
  onImport: (files: FileList) => void;
  onAddToTimeline: (mediaId: string) => void;
  onAddStockAudio?: (track: { title: string; url: string; duration: number }) => void;
  onApplyFilter?: (filter: FilterPreset) => void;
  onApplyTransition?: (transition: TransitionType) => void;
  onAddTextOverlay?: (text: string) => void;
  selectedClipId?: string | null;
}

type LibraryTab = "media" | "audio" | "text" | "effects" | "transitions";

export default function MediaPanel({
  media,
  onImport,
  onAddToTimeline,
  onAddStockAudio,
  onApplyFilter,
  onApplyTransition,
  onAddTextOverlay,
  selectedClipId,
}: MediaPanelProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>("media");
  const [mediaFilter, setMediaFilter] = useState<"all" | MediaType>("all");
  const [previewingAudio, setPreviewingAudio] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImport(event.target.files);
    }
    event.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImport(e.dataTransfer.files);
    }
  };

  const toggleAudioPreview = (url: string) => {
    if (previewingAudio === url) {
      audioPreviewRef.current?.pause();
      setPreviewingAudio(null);
    } else {
      setPreviewingAudio(url);
      if (audioPreviewRef.current) {
        audioPreviewRef.current.src = url;
        audioPreviewRef.current.play().catch(() => {});
      }
    }
  };

  const filteredMedia = media.filter((item) => {
    if (mediaFilter === "all") return true;
    return item.type === mediaFilter;
  });

  const textTemplates = [
    { title: "Default Title", subtitle: "Clean standard title", sample: "Title Here" },
    { title: "Lower Third", subtitle: "Name & designation bar", sample: "Speaker Name" },
    { title: "Headline", subtitle: "Bold headline banner", sample: "BREAKING NEWS" },
    { title: "Minimal Caption", subtitle: "Subtle bottom subtitle", sample: "Subtitle caption text" },
    { title: "Neon Title", subtitle: "Vibrant glowing title", sample: "VIDSBIT CREATIVE" },
    { title: "Outro Credits", subtitle: "Ending card / Thanks", sample: "Thanks for watching!" },
  ];

  const filterPresets: { id: FilterPreset; name: string; desc: string }[] = [
    { id: "none", name: "Original", desc: "No color alteration" },
    { id: "brightness", name: "Bright Studio", desc: "Clean studio lighting" },
    { id: "contrast", name: "High Contrast", desc: "Punchy deep shadows" },
    { id: "saturation", name: "Vibrant Pop", desc: "Rich saturated colors" },
    { id: "grayscale", name: "Noir Mono", desc: "Black & white cinema" },
    { id: "sepia", name: "Vintage 1970s", desc: "Warm nostalgic look" },
    { id: "blur", name: "Soft Focus", desc: "Dreamy diffused blur" },
  ];

  const transitionPresets: { id: TransitionType; name: string; icon: string }[] = [
    { id: "none", name: "Hard Cut", icon: "✂" },
    { id: "fade", name: "Fade In / Out", icon: "◐" },
    { id: "crossfade", name: "Crossfade", icon: "⧉" },
    { id: "dipToBlack", name: "Dip to Black", icon: "⬛" },
    { id: "slide", name: "Slide Left", icon: "➡" },
  ];

  return (
    <aside className="capcut-asset-panel">
      {/* Hidden audio element for previewing sounds */}
      <audio
        ref={audioPreviewRef}
        onEnded={() => setPreviewingAudio(null)}
        style={{ display: "none" }}
      />

      {/* CapCut Sidebar Navigation Strip */}
      <div className="asset-sidebar-strip">
        <button
          type="button"
          className={`strip-btn ${activeTab === "media" ? "active" : ""}`}
          onClick={() => setActiveTab("media")}
          title="Project Media"
        >
          <span className="strip-icon">📁</span>
          <span className="strip-label">Media</span>
        </button>

        <button
          type="button"
          className={`strip-btn ${activeTab === "audio" ? "active" : ""}`}
          onClick={() => setActiveTab("audio")}
          title="Stock Music & SFX"
        >
          <span className="strip-icon">🎵</span>
          <span className="strip-label">Audio</span>
        </button>

        <button
          type="button"
          className={`strip-btn ${activeTab === "text" ? "active" : ""}`}
          onClick={() => setActiveTab("text")}
          title="Titles & Captions"
        >
          <span className="strip-icon">🔤</span>
          <span className="strip-label">Text</span>
        </button>

        <button
          type="button"
          className={`strip-btn ${activeTab === "effects" ? "active" : ""}`}
          onClick={() => setActiveTab("effects")}
          title="Video Effects & Filters"
        >
          <span className="strip-icon">✨</span>
          <span className="strip-label">Effects</span>
        </button>

        <button
          type="button"
          className={`strip-btn ${activeTab === "transitions" ? "active" : ""}`}
          onClick={() => setActiveTab("transitions")}
          title="Transitions"
        >
          <span className="strip-icon">🔄</span>
          <span className="strip-label">Transitions</span>
        </button>
      </div>

      {/* Asset Content Area */}
      <div className="asset-content-panel">
        {/* TAB 1: MEDIA */}
        {activeTab === "media" && (
          <div className="asset-tab-body">
            <div className="asset-header">
              <h3>Media Library</h3>
              <button
                type="button"
                className="capcut-primary-btn"
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

            {/* Media type filter pills */}
            <div className="media-filter-pills">
              <button
                type="button"
                className={`filter-pill ${mediaFilter === "all" ? "active" : ""}`}
                onClick={() => setMediaFilter("all")}
              >
                All ({media.length})
              </button>
              <button
                type="button"
                className={`filter-pill ${mediaFilter === "video" ? "active" : ""}`}
                onClick={() => setMediaFilter("video")}
              >
                Videos
              </button>
              <button
                type="button"
                className={`filter-pill ${mediaFilter === "audio" ? "active" : ""}`}
                onClick={() => setMediaFilter("audio")}
              >
                Audios
              </button>
              <button
                type="button"
                className={`filter-pill ${mediaFilter === "image" ? "active" : ""}`}
                onClick={() => setMediaFilter("image")}
              >
                Images
              </button>
            </div>

            {/* Drag & drop dropzone or media list */}
            {filteredMedia.length === 0 ? (
              <div
                className={`media-dropzone ${isDraggingOver ? "drag-over" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <div className="dropzone-icon">＋</div>
                <p>Import or drag & drop files here</p>
                <span>Supports MP4, WebM, MP3, WAV, JPG, PNG</span>
              </div>
            ) : (
              <div
                className="asset-items-list"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {filteredMedia.map((item) => (
                  <div key={item.id} className="capcut-media-card">
                    <div className="card-thumb">
                      {item.type === "video" ? (
                        <video src={item.url ?? undefined} muted preload="metadata" />
                      ) : item.type === "image" ? (
                        <img src={item.url ?? undefined} alt="" />
                      ) : (
                        <div className="card-audio-icon">♫</div>
                      )}
                      <span className="card-type-tag">{item.type}</span>
                    </div>

                    <div className="card-info">
                      <strong title={item.name}>{item.name}</strong>
                      <span>
                        {item.duration !== undefined
                          ? formatTime(item.duration)
                          : item.type === "image"
                            ? "Image"
                            : ""}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="add-to-timeline-btn"
                      onClick={() => onAddToTimeline(item.id)}
                      title="Add to timeline"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AUDIO / MUSIC */}
        {activeTab === "audio" && (
          <div className="asset-tab-body">
            <div className="asset-header">
              <h3>Stock Music & SFX</h3>
            </div>
            <p className="tab-description">
              Royalty-free music and ambient soundscapes ready to drop onto your audio tracks.
            </p>

            <div className="asset-items-list">
              {ONLINE_MUSIC_CATALOG.map((track) => (
                <div key={track.id} className="stock-audio-card">
                  <button
                    type="button"
                    className={`preview-play-btn ${previewingAudio === track.url ? "playing" : ""}`}
                    onClick={() => toggleAudioPreview(track.url)}
                    title={previewingAudio === track.url ? "Pause preview" : "Play preview"}
                  >
                    {previewingAudio === track.url ? "❚❚" : "▶"}
                  </button>

                  <div className="stock-audio-info">
                    <strong>{track.title}</strong>
                    <span>
                      {track.creator} • {track.genre} • {formatTime(track.duration)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="add-to-timeline-btn"
                    onClick={() => {
                      if (onAddStockAudio) {
                        onAddStockAudio({
                          title: track.title,
                          url: track.url,
                          duration: track.duration,
                        });
                      }
                    }}
                    title="Add track to timeline"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TEXT & TITLES */}
        {activeTab === "text" && (
          <div className="asset-tab-body">
            <div className="asset-header">
              <h3>Text & Titles</h3>
            </div>
            <p className="tab-description">
              Click any template to apply or add title overlays to your timeline.
            </p>

            <div className="text-templates-grid">
              {textTemplates.map((template, idx) => (
                <div key={idx} className="text-template-card">
                  <div className="template-preview">
                    <span>{template.sample}</span>
                  </div>
                  <div className="template-details">
                    <strong>{template.title}</strong>
                    <span>{template.subtitle}</span>
                  </div>
                  <button
                    type="button"
                    className="apply-template-btn"
                    onClick={() => onAddTextOverlay?.(template.sample)}
                  >
                    + Add Title
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: EFFECTS & FILTERS */}
        {activeTab === "effects" && (
          <div className="asset-tab-body">
            <div className="asset-header">
              <h3>Video Filters</h3>
            </div>
            <p className="tab-description">
              {selectedClipId
                ? "Click any preset to apply to the currently selected clip."
                : "Select a clip in the timeline first to apply filters."}
            </p>

            <div className="filter-presets-grid">
              {filterPresets.map((filter) => (
                <div
                  key={filter.id}
                  className="filter-card"
                  onClick={() => onApplyFilter?.(filter.id)}
                >
                  <div className="filter-thumb" data-filter={filter.id}>
                    <span className="filter-preview-tag">{filter.name}</span>
                  </div>
                  <div className="filter-info">
                    <strong>{filter.name}</strong>
                    <span>{filter.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: TRANSITIONS */}
        {activeTab === "transitions" && (
          <div className="asset-tab-body">
            <div className="asset-header">
              <h3>Transitions</h3>
            </div>
            <p className="tab-description">
              {selectedClipId
                ? "Click a transition to apply to the selected clip cut."
                : "Select a clip in the timeline to apply transitions."}
            </p>

            <div className="transitions-grid">
              {transitionPresets.map((trans) => (
                <div
                  key={trans.id}
                  className="transition-card"
                  onClick={() => onApplyTransition?.(trans.id)}
                >
                  <div className="trans-icon">{trans.icon}</div>
                  <strong>{trans.name}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}