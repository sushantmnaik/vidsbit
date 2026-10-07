"use client";

import { useState } from "react";
import { TimelineClip, MediaFile, FilterPreset, AdvancedEffect } from "@/types/editor";

interface InspectorProps {
  selectedClip: TimelineClip | null;
  media: MediaFile[];
  currentTime?: number;
  onUpdateSelectedClip: (partial: Partial<TimelineClip>) => void;
  onDeleteClip: (id: string) => void;
  onDuplicateClip: (id: string) => void;
  onSplitClip: (id: string) => void;
  selectedVideoTrack: number;
  selectedAudioTrack: number;
  videoTrackCount: number;
  audioTrackCount: number;
  onChangeSelectedVideoTrack: (track: number) => void;
  onChangeSelectedAudioTrack: (track: number) => void;
  onAddVideoTrack: () => void;
  onAddAudioTrack: () => void;
}

type InspectorTab = "video" | "audio" | "speed" | "filter" | "text";

export default function Inspector({
  selectedClip,
  media,
  currentTime,
  onUpdateSelectedClip,
  onDeleteClip,
  onDuplicateClip,
  onSplitClip,
  selectedVideoTrack,
  selectedAudioTrack,
  videoTrackCount,
  audioTrackCount,
  onChangeSelectedVideoTrack,
  onChangeSelectedAudioTrack,
  onAddVideoTrack,
  onAddAudioTrack,
}: InspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("video");

  if (!selectedClip) {
    return (
      <aside className="capcut-inspector empty-state">
        <div className="inspector-top-bar">
          <span className="inspector-panel-title">Properties</span>
        </div>
        <div className="inspector-placeholder">
          <div className="placeholder-icon">⚙</div>
          <h3>No Clip Selected</h3>
          <p>Click on any clip in the timeline to customize transform, speed, audio, filters, and titles.</p>
          <div className="quick-hints">
            <span className="hint-pill"><kbd>Space</kbd> Play / Pause</span>
            <span className="hint-pill"><kbd>S</kbd> Split</span>
            <span className="hint-pill"><kbd>Del</kbd> Delete</span>
          </div>
        </div>
      </aside>
    );
  }

  const mediaItem = media.find((m) => m.id === selectedClip.mediaId);
  const isAudioOnly = mediaItem?.type === "audio";

  const speedPresets = [0.25, 0.5, 1, 1.25, 1.5, 2, 4];
  const filterPresets: { id: FilterPreset; label: string }[] = [
    { id: "none", label: "Normal" },
    { id: "brightness", label: "Bright" },
    { id: "contrast", label: "Vivid" },
    { id: "saturation", label: "Pop" },
    { id: "grayscale", label: "B&W" },
    { id: "sepia", label: "Vintage" },
    { id: "blur", label: "Blur" },
  ];

  const advancedEffects: { id: AdvancedEffect; label: string }[] = [
    { id: "none", label: "None" },
    { id: "cinematic", label: "Cinematic" },
    { id: "dramatic", label: "Dramatic" },
    { id: "sharpen", label: "Sharpen" },
    { id: "vignette", label: "Vignette" },
    { id: "glow", label: "Glow" },
  ];

  return (
    <aside className="capcut-inspector">
      {/* Header with clip identity & quick actions */}
      <div className="inspector-top-bar">
        <div className="inspector-clip-meta">
          <span className="clip-type-badge">{mediaItem?.type ?? "clip"}</span>
          <span className="clip-name" title={mediaItem?.name ?? selectedClip.id}>
            {mediaItem?.name ?? selectedClip.id}
          </span>
        </div>
        <div className="inspector-quick-tools">
          <button
            type="button"
            className="tool-btn"
            title="Split clip at playhead (S)"
            onClick={() => onSplitClip(selectedClip.id)}
          >
            ✂
          </button>
          <button
            type="button"
            className="tool-btn"
            title="Duplicate clip (Ctrl+D)"
            onClick={() => onDuplicateClip(selectedClip.id)}
          >
            📑
          </button>
          <button
            type="button"
            className="tool-btn tool-danger"
            title="Delete clip (Del)"
            onClick={() => onDeleteClip(selectedClip.id)}
          >
            🗑
          </button>
        </div>
      </div>

      {/* Navigation tabs: Video | Audio | Speed | Filter | Text */}
      <nav className="inspector-tabs" aria-label="Properties tabs">
        {!isAudioOnly && (
          <button
            type="button"
            className={`tab-btn ${activeTab === "video" ? "active" : ""}`}
            onClick={() => setActiveTab("video")}
          >
            Video
          </button>
        )}
        <button
          type="button"
          className={`tab-btn ${activeTab === "audio" ? "active" : ""}`}
          onClick={() => setActiveTab("audio")}
        >
          Audio
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "speed" ? "active" : ""}`}
          onClick={() => setActiveTab("speed")}
        >
          Speed
        </button>
        {!isAudioOnly && (
          <button
            type="button"
            className={`tab-btn ${activeTab === "filter" ? "active" : ""}`}
            onClick={() => setActiveTab("filter")}
          >
            Filters
          </button>
        )}
        <button
          type="button"
          className={`tab-btn ${activeTab === "text" ? "active" : ""}`}
          onClick={() => setActiveTab("text")}
        >
          Text
        </button>
      </nav>

      {/* Tab Panels */}
      <div className="inspector-scroll-area">
        {/* VIDEO TAB */}
        {activeTab === "video" && !isAudioOnly && (
          <div className="inspector-section">
            <h4 className="section-title">Transform</h4>

            <div className="property-row">
              <label>Scale</label>
              <div className="slider-with-value">
                <input
                  type="range"
                  min={0.2}
                  max={2.5}
                  step={0.05}
                  value={selectedClip.scale ?? 1}
                  onChange={(e) => onUpdateSelectedClip({ scale: Number(e.target.value) })}
                />
                <span className="value-display">{Math.round((selectedClip.scale ?? 1) * 100)}%</span>
              </div>
            </div>

            <div className="property-row">
              <div className="label-with-reset">
                <label>Rotation</label>
                {(selectedClip.rotation ?? 0) !== 0 && (
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={() => onUpdateSelectedClip({ rotation: 0 })}
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="slider-with-value">
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={5}
                  value={selectedClip.rotation ?? 0}
                  onChange={(e) => onUpdateSelectedClip({ rotation: Number(e.target.value) })}
                />
                <span className="value-display">{selectedClip.rotation ?? 0}°</span>
              </div>
            </div>

            <div className="property-row">
              <label>Opacity</label>
              <div className="slider-with-value">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selectedClip.opacity ?? 1}
                  onChange={(e) => onUpdateSelectedClip({ opacity: Number(e.target.value) })}
                />
                <span className="value-display">{Math.round((selectedClip.opacity ?? 1) * 100)}%</span>
              </div>
            </div>

            <div className="property-row">
              <div className="label-with-reset">
                <label>Position X</label>
                {(selectedClip.posX ?? 0) !== 0 && (
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={() => onUpdateSelectedClip({ posX: 0 })}
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="slider-with-value">
                <input
                  type="range"
                  min={-300}
                  max={300}
                  step={5}
                  value={selectedClip.posX ?? 0}
                  onChange={(e) => onUpdateSelectedClip({ posX: Number(e.target.value) })}
                />
                <span className="value-display">{selectedClip.posX ?? 0}px</span>
              </div>
            </div>

            <div className="property-row">
              <div className="label-with-reset">
                <label>Position Y</label>
                {(selectedClip.posY ?? 0) !== 0 && (
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={() => onUpdateSelectedClip({ posY: 0 })}
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="slider-with-value">
                <input
                  type="range"
                  min={-300}
                  max={300}
                  step={5}
                  value={selectedClip.posY ?? 0}
                  onChange={(e) => onUpdateSelectedClip({ posY: Number(e.target.value) })}
                />
                <span className="value-display">{selectedClip.posY ?? 0}px</span>
              </div>
            </div>

            <h4 className="section-title">Framing & Overlay</h4>

            <div className="property-row">
              <label>Timeline Start (sec)</label>
              <div className="timing-controls-row">
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  className="timing-num-input"
                  value={Math.round((selectedClip.timelineStart ?? 0) * 100) / 100}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onUpdateSelectedClip({ timelineStart: Math.max(0, val) });
                  }}
                />
                <button
                  type="button"
                  className="nudge-btn"
                  onClick={() => onUpdateSelectedClip({ timelineStart: Math.max(0, (selectedClip.timelineStart ?? 0) - 0.5) })}
                  title="Nudge 0.5s earlier"
                >
                  -0.5s
                </button>
                <button
                  type="button"
                  className="nudge-btn"
                  onClick={() => onUpdateSelectedClip({ timelineStart: (selectedClip.timelineStart ?? 0) + 0.5 })}
                  title="Nudge 0.5s later"
                >
                  +0.5s
                </button>
                {currentTime !== undefined && (
                  <button
                    type="button"
                    className="nudge-btn snap-btn"
                    onClick={() => onUpdateSelectedClip({ timelineStart: Math.max(0, Math.round(currentTime * 100) / 100) })}
                    title="Snap clip start to current playhead"
                  >
                    📍 At Playhead
                  </button>
                )}
              </div>
            </div>

            <div className="property-row">
              <label>Track Assignment</label>
              <select
                className="select-input"
                value={selectedClip.track}
                onChange={(e) => onUpdateSelectedClip({ track: Number(e.target.value) })}
              >
                <option value={0}>V1 (Main Track)</option>
                <option value={1}>V2 (Overlay / PiP 1)</option>
                <option value={2}>V3 (Overlay / PiP 2)</option>
              </select>
            </div>

            <div className="property-row">
              <label>Crop / Fit</label>
              <select
                className="select-input"
                value={selectedClip.crop ?? "none"}
                onChange={(e) =>
                  onUpdateSelectedClip({
                    crop: e.target.value as TimelineClip["crop"],
                  })
                }
              >
                <option value="none">Original Aspect</option>
                <option value="16:9">16:9 Landscape</option>
                <option value="9:16">9:16 Vertical / Reels</option>
                <option value="1:1">1:1 Square</option>
                <option value="cinematic">Cinematic 21:9</option>
              </select>
            </div>

            <div className="property-row checkbox-row">
              <label htmlFor="pip-toggle">Picture in Picture (PIP)</label>
              <input
                id="pip-toggle"
                type="checkbox"
                checked={selectedClip.pictureInPicture ?? false}
                onChange={(e) => onUpdateSelectedClip({ pictureInPicture: e.target.checked })}
              />
            </div>

            <h4 className="section-title">Cutout & Chroma Key</h4>

            <div className="property-row">
              <label>Chroma Screen</label>
              <select
                className="select-input"
                value={selectedClip.chromaKey ?? "none"}
                onChange={(e) =>
                  onUpdateSelectedClip({
                    chromaKey: e.target.value as TimelineClip["chromaKey"],
                  })
                }
              >
                <option value="none">Disabled</option>
                <option value="green">Green Screen</option>
                <option value="blue">Blue Screen</option>
                <option value="magenta">Magenta Screen</option>
              </select>
            </div>

            <h4 className="section-title">Track Routing</h4>

            <div className="property-row">
              <label>Video Track</label>
              <div className="track-picker-row">
                <select
                  className="select-input"
                  value={selectedVideoTrack}
                  onChange={(e) => onChangeSelectedVideoTrack(Number(e.target.value))}
                >
                  {Array.from({ length: videoTrackCount }, (_, index) => (
                    <option key={index} value={index}>
                      Track V{index + 1}
                    </option>
                  ))}
                </select>
                <button type="button" className="add-track-btn" onClick={onAddVideoTrack}>
                  + New
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === "audio" && (
          <div className="inspector-section">
            <h4 className="section-title">Volume & Audio</h4>

            <div className="property-row checkbox-row">
              <label htmlFor="audio-mute-toggle">Mute Clip</label>
              <input
                id="audio-mute-toggle"
                type="checkbox"
                checked={selectedClip.muted ?? false}
                onChange={(e) => onUpdateSelectedClip({ muted: e.target.checked })}
              />
            </div>

            <div className="property-row">
              <label>Volume</label>
              <div className="slider-with-value">
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  disabled={selectedClip.muted}
                  value={selectedClip.volume ?? 100}
                  onChange={(e) => onUpdateSelectedClip({ volume: Number(e.target.value) })}
                />
                <span className="value-display">{selectedClip.volume ?? 100}%</span>
              </div>
            </div>

            <h4 className="section-title">Fade Curves</h4>

            <div className="property-row">
              <label>Fade In</label>
              <div className="slider-with-value">
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={selectedClip.fadeIn ?? 0}
                  onChange={(e) => onUpdateSelectedClip({ fadeIn: Number(e.target.value) })}
                />
                <span className="value-display">{(selectedClip.fadeIn ?? 0).toFixed(1)}s</span>
              </div>
            </div>

            <div className="property-row">
              <label>Fade Out</label>
              <div className="slider-with-value">
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={selectedClip.fadeOut ?? 0}
                  onChange={(e) => onUpdateSelectedClip({ fadeOut: Number(e.target.value) })}
                />
                <span className="value-display">{(selectedClip.fadeOut ?? 0).toFixed(1)}s</span>
              </div>
            </div>

            <h4 className="section-title">Timeline Placement & Routing</h4>

            <div className="property-row">
              <label>Timeline Start (sec)</label>
              <div className="timing-controls-row">
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  className="timing-num-input"
                  value={Math.round((selectedClip.timelineStart ?? 0) * 100) / 100}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onUpdateSelectedClip({ timelineStart: Math.max(0, val) });
                  }}
                />
                <button
                  type="button"
                  className="nudge-btn"
                  onClick={() => onUpdateSelectedClip({ timelineStart: Math.max(0, (selectedClip.timelineStart ?? 0) - 0.5) })}
                  title="Nudge 0.5s earlier"
                >
                  -0.5s
                </button>
                <button
                  type="button"
                  className="nudge-btn"
                  onClick={() => onUpdateSelectedClip({ timelineStart: (selectedClip.timelineStart ?? 0) + 0.5 })}
                  title="Nudge 0.5s later"
                >
                  +0.5s
                </button>
                {currentTime !== undefined && (
                  <button
                    type="button"
                    className="nudge-btn snap-btn"
                    onClick={() => onUpdateSelectedClip({ timelineStart: Math.max(0, Math.round(currentTime * 100) / 100) })}
                    title="Snap audio start to current playhead"
                  >
                    📍 At Playhead
                  </button>
                )}
              </div>
            </div>

            <div className="property-row">
              <label>Audio Track</label>
              <div className="track-picker-row">
                <select
                  className="select-input"
                  value={selectedAudioTrack}
                  onChange={(e) => onChangeSelectedAudioTrack(Number(e.target.value))}
                >
                  {Array.from({ length: audioTrackCount }, (_, index) => (
                    <option key={index} value={index}>
                      Track A{index + 1}
                    </option>
                  ))}
                </select>
                <button type="button" className="add-track-btn" onClick={onAddAudioTrack}>
                  + New
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SPEED TAB */}
        {activeTab === "speed" && (
          <div className="inspector-section">
            <h4 className="section-title">Playback Rate</h4>

            <div className="speed-pills">
              {speedPresets.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  className={`speed-pill ${(selectedClip.speed ?? 1) === rate ? "active" : ""}`}
                  onClick={() => onUpdateSelectedClip({ speed: rate })}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <div className="property-row" style={{ marginTop: "14px" }}>
              <label>Custom Speed</label>
              <div className="slider-with-value">
                <input
                  type="range"
                  min={0.2}
                  max={4}
                  step={0.1}
                  value={selectedClip.speed ?? 1}
                  onChange={(e) => onUpdateSelectedClip({ speed: Number(e.target.value) })}
                />
                <span className="value-display">{(selectedClip.speed ?? 1).toFixed(1)}x</span>
              </div>
            </div>

            <p className="field-note">
              Higher speeds compress playback duration; lower speeds create slow motion.
            </p>
          </div>
        )}

        {/* FILTER TAB */}
        {activeTab === "filter" && !isAudioOnly && (
          <div className="inspector-section">
            <h4 className="section-title">Color Presets</h4>

            <div className="presets-grid">
              {filterPresets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`preset-card ${(selectedClip.filter ?? "none") === item.id ? "active" : ""}`}
                  onClick={() => onUpdateSelectedClip({ filter: item.id })}
                >
                  <span className="preset-swatch filter-swatch" data-filter={item.id} />
                  <span className="preset-name">{item.label}</span>
                </button>
              ))}
            </div>

            <h4 className="section-title">Advanced Effects</h4>

            <div className="presets-grid">
              {advancedEffects.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`preset-card ${(selectedClip.advancedEffect ?? "none") === item.id ? "active" : ""}`}
                  onClick={() => onUpdateSelectedClip({ advancedEffect: item.id })}
                >
                  <span className="preset-name">{item.label}</span>
                </button>
              ))}
            </div>

            <h4 className="section-title">Transition</h4>

            <div className="property-row">
              <label>Cut Transition</label>
              <select
                className="select-input"
                value={selectedClip.transition ?? "none"}
                onChange={(e) =>
                  onUpdateSelectedClip({
                    transition: e.target.value as TimelineClip["transition"],
                  })
                }
              >
                <option value="none">None (Hard Cut)</option>
                <option value="fade">Fade In</option>
                <option value="crossfade">Crossfade</option>
                <option value="dipToBlack">Dip to Black</option>
                <option value="slide">Slide Left</option>
              </select>
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === "text" && (
          <div className="inspector-section">
            <h4 className="section-title">Title / Text Overlay</h4>

            <div className="property-row vertical">
              <label>Text Content</label>
              <textarea
                className="text-input-area"
                rows={3}
                placeholder="Enter title or captions..."
                value={selectedClip.textOverlay ?? ""}
                onChange={(e) => onUpdateSelectedClip({ textOverlay: e.target.value })}
              />
            </div>

            <div className="property-row">
              <label>Style</label>
              <select
                className="select-input"
                value={selectedClip.captionStyle ?? "classic"}
                onChange={(e) =>
                  onUpdateSelectedClip({
                    captionStyle: e.target.value as TimelineClip["captionStyle"],
                  })
                }
              >
                <option value="classic">Classic Clean</option>
                <option value="bold">Bold Impact</option>
                <option value="minimal">Minimal</option>
                <option value="cinematic">Cinematic Subtitle</option>
              </select>
            </div>

            <div className="property-row">
              <label>Animation</label>
              <select
                className="select-input"
                value={selectedClip.captionAnimation ?? "none"}
                onChange={(e) =>
                  onUpdateSelectedClip({
                    captionAnimation: e.target.value as TimelineClip["captionAnimation"],
                  })
                }
              >
                <option value="none">None (Static)</option>
                <option value="fade">Fade In</option>
                <option value="slide-up">Slide Up</option>
                <option value="typewriter">Typewriter</option>
                <option value="bounce">Bounce</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
