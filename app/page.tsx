"use client";

import { useState } from "react";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleVideoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const url = URL.createObjectURL(file);

    setVideoUrl(url);
    setFileName(file.name);
  }

  return (
    <main className="flex h-screen flex-col bg-[#111111] text-white">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-white/10 px-5">
        <h1 className="text-xl font-bold tracking-tight">VIDSBIT</h1>

        <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200">
          Export
        </button>
      </header>

      {/* Main Editor */}
      <section className="flex flex-1 overflow-hidden">
        {/* Media Panel */}
        <aside className="w-64 border-r border-white/10 p-4">
          <h2 className="mb-4 text-sm font-semibold text-gray-300">
            Media
          </h2>

          <label className="block w-full cursor-pointer rounded-lg border border-dashed border-white/20 p-6 text-center text-sm text-gray-400 transition hover:border-white/40 hover:text-white">
            + Add Media

            <input
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />
          </label>

          {fileName && (
            <div className="mt-4 rounded-lg bg-white/5 p-3">
              <p className="truncate text-sm text-gray-300">
                {fileName}
              </p>
            </div>
          )}
        </aside>

        {/* Preview */}
        <section className="flex flex-1 items-center justify-center bg-[#181818] p-8">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="max-h-full max-w-full rounded-lg shadow-2xl"
            />
          ) : (
            <div className="flex aspect-video w-[70%] items-center justify-center rounded-lg bg-black shadow-2xl">
              <span className="text-sm text-gray-500">
                Video Preview
              </span>
            </div>
          )}
        </section>
      </section>

      {/* Timeline */}
      <section className="h-64 border-t border-white/10 bg-[#141414] p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">
          Timeline
        </h2>

        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-white/10">
          <span className="text-sm text-gray-600">
            Drag your media here
          </span>
        </div>
      </section>
    </main>
  );
}