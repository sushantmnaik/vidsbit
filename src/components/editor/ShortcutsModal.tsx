"use client";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;

  const shortcutGroups = [
    {
      category: "Playback & Navigation",
      items: [
        { keys: ["Space"], description: "Play / Pause playback" },
        { keys: ["Home"], description: "Jump to start of timeline" },
        { keys: ["End"], description: "Jump to end of timeline" },
        { keys: ["←", "→"], description: "Step 0.1s frame backward / forward" },
        { keys: ["Shift", "← / →"], description: "Step 1 second backward / forward" },
        { keys: ["M"], description: "Toggle audio mute" },
        { keys: ["F"], description: "Toggle fullscreen monitor" },
      ],
    },
    {
      category: "Timeline Editing",
      items: [
        { keys: ["S", "or", "Ctrl", "B"], description: "Split clip at playhead position" },
        { keys: ["Q", "or", "["], description: "Ripple trim start to playhead" },
        { keys: ["W", "or", "]"], description: "Ripple trim end to playhead" },
        { keys: ["Del", "or", "Backspace"], description: "Delete selected clip" },
        { keys: ["Ctrl", "D"], description: "Duplicate selected clip" },
        { keys: ["N"], description: "Toggle timeline magnet / snapping" },
        { keys: ["T"], description: "Add title text overlay" },
      ],
    },
    {
      category: "Timeline Zoom & View",
      items: [
        { keys: ["+"], description: "Zoom in timeline" },
        { keys: ["-"], description: "Zoom out timeline" },
        { keys: ["Ctrl", "0"], description: "Fit timeline to 100% view" },
        { keys: ["Ctrl", "Wheel"], description: "Zoom in/out with mouse wheel" },
        { keys: ["Pinch"], description: "Two-finger touch/trackpad pinch to zoom" },
      ],
    },
    {
      category: "Project & History",
      items: [
        { keys: ["Ctrl", "Z"], description: "Undo last edit" },
        { keys: ["Ctrl", "Y", "or", "Ctrl", "Shift", "Z"], description: "Redo last edit" },
        { keys: ["Ctrl", "S"], description: "Save project immediately" },
        { keys: ["Ctrl", "O"], description: "Open Project Manager" },
        { keys: ["?"], description: "Toggle this Keyboard Shortcuts guide" },
      ],
    },
  ];

  return (
    <div className="shortcuts-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="shortcuts-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <div className="shortcuts-header-title">
            <span className="shortcuts-icon">⌨</span>
            <h3>Keyboard Shortcuts & Controls</h3>
          </div>
          <button type="button" className="shortcuts-close-btn" onClick={onClose} aria-label="Close shortcuts">
            ×
          </button>
        </div>

        <div className="shortcuts-modal-body">
          {shortcutGroups.map((group) => (
            <div key={group.category} className="shortcuts-group">
              <h4 className="shortcuts-group-title">{group.category}</h4>
              <div className="shortcuts-list">
                {group.items.map((item, idx) => (
                  <div key={idx} className="shortcut-row">
                    <span className="shortcut-desc">{item.description}</span>
                    <div className="shortcut-keys">
                      {item.keys.map((k, kIdx) =>
                        k === "or" ? (
                          <span key={kIdx} className="key-separator">
                            or
                          </span>
                        ) : (
                          <kbd key={kIdx}>{k}</kbd>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shortcuts-modal-footer">
          <span>VIDSBIT Studio • Professional Web Video Editor</span>
          <button type="button" className="shortcuts-done-btn" onClick={onClose}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
