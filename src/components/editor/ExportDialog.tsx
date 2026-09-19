"use client";

import { ExportStage } from "@/lib/exportVideo";

interface ExportDialogProps {
  open: boolean;
  stage: ExportStage | null;
  progress: number;
  error: string | null;
  onClose: () => void;
}

export default function ExportDialog({
  open,
  stage,
  progress,
  error,
  onClose,
}: ExportDialogProps) {
  if (!open) return null;

  const percentage =
    Math.round(
      progress * 100,
    );

  const stageText =
    stage === "loading"
      ? "Loading export engine..."
      : stage === "preparing"
        ? "Preparing media..."
        : stage === "rendering"
          ? "Rendering video..."
          : stage === "finalizing"
            ? "Finalizing video..."
            : "Starting export...";

  return (
    <div className="export-overlay">
      <div className="export-dialog">
        <div className="export-dialog-header">
          <h2>Export Video</h2>

          {error && (
            <button
              className="export-close"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </div>

        {error ? (
          <div className="export-error">
            <strong>
              Export failed
            </strong>

            <p>{error}</p>

            <button
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : progress < 1 ? (
          <div className="export-progress-area">
            <div className="export-progress-info">
              <span>
                {stageText}
              </span>

              <span>
                {percentage}%
              </span>
            </div>

            <div className="export-progress-track">
              <div
                className="export-progress-bar"
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>

            <p>
              Your video is being
              processed locally in
              your browser.
            </p>

            <span className="export-note">
              Keep this tab open
              until the export
              finishes.
            </span>
          </div>
        ) : (
          <div className="export-success">
            <div className="export-success-icon">
              ✓
            </div>

            <h3>
              Export complete
            </h3>

            <p>
              Your edited video
              has been created
              locally.
            </p>

            <button
              onClick={onClose}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}