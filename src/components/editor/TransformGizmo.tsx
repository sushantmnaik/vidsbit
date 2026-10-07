"use client";

import React, { useRef } from "react";
import { TimelineClip } from "@/types/editor";

interface TransformGizmoProps {
  clip: TimelineClip;
  onUpdateClip?: (partial: Partial<TimelineClip>) => void;
}

export default function TransformGizmo({
  clip,
  onUpdateClip,
}: TransformGizmoProps) {
  const gizmoRef = useRef<HTMLDivElement>(null);

  const posX = clip.posX ?? 0;
  const posY = clip.posY ?? 0;
  const scale = clip.scale ?? 1;
  const rotation = clip.rotation ?? 0;

  // --- MOVE HANDLER (Drag anywhere on gizmo surface) ---
  const handleMovePointerDown = (e: React.PointerEvent) => {
    // Only handle primary button
    if (e.button !== 0) return;
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialPosX = clip.posX ?? 0;
    const initialPosY = clip.posY ?? 0;

    const handlePointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - startX;
      const deltaY = moveEv.clientY - startY;
      onUpdateClip?.({
        posX: Math.round(initialPosX + deltaX),
        posY: Math.round(initialPosY + deltaY),
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // --- SCALE HANDLER (Drag any corner or edge handle) ---
  const handleScalePointerDown = (
    e: React.PointerEvent,
    _handleType: "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w",
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    // Determine the center of the clip in viewport space
    const parentEl = gizmoRef.current?.parentElement;
    if (!parentEl) return;
    const rect = parentEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
    const initialScale = clip.scale ?? 1;

    const handlePointerMove = (moveEv: PointerEvent) => {
      const currentDist = Math.hypot(moveEv.clientX - centerX, moveEv.clientY - centerY);
      const ratio = startDist > 5 ? currentDist / startDist : 1;
      const nextScale = Math.max(0.1, Math.min(3.5, Number((initialScale * ratio).toFixed(2))));
      onUpdateClip?.({ scale: nextScale });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // --- ROTATION HANDLER (Drag top knob) ---
  const handleRotatePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const parentEl = gizmoRef.current?.parentElement;
    if (!parentEl) return;
    const rect = parentEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const initialRotation = clip.rotation ?? 0;

    const handlePointerMove = (moveEv: PointerEvent) => {
      const currentAngle = Math.atan2(moveEv.clientY - centerY, moveEv.clientX - centerX) * (180 / Math.PI);
      const diff = currentAngle - startAngle;
      let nextRotation = Math.round(initialRotation + diff);

      // Snap to 0, 90, 180, -90 if close
      if (Math.abs(nextRotation) <= 3) nextRotation = 0;
      if (Math.abs(nextRotation - 90) <= 3) nextRotation = 90;
      if (Math.abs(nextRotation + 90) <= 3) nextRotation = -90;
      if (Math.abs(nextRotation - 180) <= 3 || Math.abs(nextRotation + 180) <= 3) nextRotation = 180;

      while (nextRotation > 180) nextRotation -= 360;
      while (nextRotation < -180) nextRotation += 360;

      onUpdateClip?.({ rotation: nextRotation });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleResetTransform = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateClip?.({
      posX: 0,
      posY: 0,
      scale: 1,
      rotation: 0,
    });
  };

  return (
    <div
      ref={gizmoRef}
      className="transform-gizmo-box"
      onPointerDown={handleMovePointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onUpdateClip?.({ posX: 0, posY: 0 });
      }}
      title="Drag to reposition • Double-click to center"
    >
      {/* 1. Corner Handles (Scale) */}
      <div
        className="gizmo-handle gizmo-corner-nw"
        onPointerDown={(e) => handleScalePointerDown(e, "nw")}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onUpdateClip?.({ scale: 1 });
        }}
        title="Drag to scale (Double click to reset 100%)"
      />
      <div
        className="gizmo-handle gizmo-corner-ne"
        onPointerDown={(e) => handleScalePointerDown(e, "ne")}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onUpdateClip?.({ scale: 1 });
        }}
        title="Drag to scale (Double click to reset 100%)"
      />
      <div
        className="gizmo-handle gizmo-corner-se"
        onPointerDown={(e) => handleScalePointerDown(e, "se")}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onUpdateClip?.({ scale: 1 });
        }}
        title="Drag to scale (Double click to reset 100%)"
      />
      <div
        className="gizmo-handle gizmo-corner-sw"
        onPointerDown={(e) => handleScalePointerDown(e, "sw")}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onUpdateClip?.({ scale: 1 });
        }}
        title="Drag to scale (Double click to reset 100%)"
      />

      {/* 2. Edge Handles (Scale) */}
      <div
        className="gizmo-handle gizmo-edge-n"
        onPointerDown={(e) => handleScalePointerDown(e, "n")}
        title="Drag to scale"
      />
      <div
        className="gizmo-handle gizmo-edge-s"
        onPointerDown={(e) => handleScalePointerDown(e, "s")}
        title="Drag to scale"
      />
      <div
        className="gizmo-handle gizmo-edge-w"
        onPointerDown={(e) => handleScalePointerDown(e, "w")}
        title="Drag to scale"
      />
      <div
        className="gizmo-handle gizmo-edge-e"
        onPointerDown={(e) => handleScalePointerDown(e, "e")}
        title="Drag to scale"
      />

      {/* 3. Rotation Stalk and Knob */}
      <div className="gizmo-rotator-stalk" />
      <div
        className="gizmo-rotator-knob"
        onPointerDown={handleRotatePointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onUpdateClip?.({ rotation: 0 });
        }}
        title="Drag to rotate (Double-click to reset 0°)"
      >
        ↻
      </div>

      {/* 4. Floating HUD / Info Badge */}
      <div
        className="gizmo-hud-pill"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span>
          X: <strong className="hud-highlight">{posX}px</strong>
        </span>
        <span className="hud-sep">•</span>
        <span>
          Y: <strong className="hud-highlight">{posY}px</strong>
        </span>
        <span className="hud-sep">•</span>
        <span>
          Scale: <strong className="hud-highlight">{Math.round(scale * 100)}%</strong>
        </span>
        <span className="hud-sep">•</span>
        <span>
          Rot: <strong className="hud-highlight">{rotation}°</strong>
        </span>
        <button
          type="button"
          className="gizmo-hud-reset-btn"
          onClick={handleResetTransform}
          title="Reset transform to default"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
