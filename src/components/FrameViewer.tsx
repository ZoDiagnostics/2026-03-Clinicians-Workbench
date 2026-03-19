import React, { useState, useEffect, useCallback } from 'react';

interface FrameViewerProps {
  /** Array of frame URLs (from Firebase Storage or local) */
  frames: string[];
  /** Current frame index */
  currentFrame?: number;
  /** Callback when frame changes */
  onFrameChange?: (frameIndex: number) => void;
  /** Playback speed in frames per second */
  fps?: number;
}

/**
 * FrameViewer — Capsule endoscopy image frame viewer
 * Displays individual JPG/PNG frames with playback controls.
 * Supports play/pause, frame stepping, speed control, and timeline scrubbing.
 */
export const FrameViewer: React.FC<FrameViewerProps> = ({
  frames,
  currentFrame: externalFrame,
  onFrameChange,
  fps = 4,
}) => {
  const [currentIndex, setCurrentIndex] = useState(externalFrame || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);

  const totalFrames = frames.length;
  const hasFrames = totalFrames > 0;

  // Sync with external frame control
  useEffect(() => {
    if (externalFrame !== undefined) {
      setCurrentIndex(externalFrame);
    }
  }, [externalFrame]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || !hasFrames) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= totalFrames) {
          setIsPlaying(false);
          return prev;
        }
        onFrameChange?.(next);
        return next;
      });
    }, 1000 / (fps * playbackSpeed));

    return () => clearInterval(interval);
  }, [isPlaying, fps, playbackSpeed, totalFrames, hasFrames, onFrameChange]);

  const goToFrame = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, totalFrames - 1));
    setCurrentIndex(clamped);
    onFrameChange?.(clamped);
  }, [totalFrames, onFrameChange]);

  const stepForward = () => goToFrame(currentIndex + 1);
  const stepBackward = () => goToFrame(currentIndex - 1);
  const skipForward = () => goToFrame(currentIndex + 10);
  const skipBackward = () => goToFrame(currentIndex - 10);
  const togglePlay = () => setIsPlaying(!isPlaying);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight': e.preventDefault(); stepForward(); break;
        case 'ArrowLeft': e.preventDefault(); stepBackward(); break;
        case 'ArrowUp': e.preventDefault(); skipForward(); break;
        case 'ArrowDown': e.preventDefault(); skipBackward(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Demo mode: generate placeholder frames if none provided
  const renderFrame = () => {
    if (!hasFrames) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-gray-400">
          <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium">No Capsule Frames Loaded</p>
          <p className="text-sm mt-2">Upload capsule endoscopy frames to begin review</p>
          <p className="text-xs mt-4 text-gray-600">Supported formats: JPG, PNG</p>
          <p className="text-xs text-gray-600">Keyboard: Space=play, ←→=step, ↑↓=skip 10</p>
        </div>
      );
    }

    return (
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <img
          src={frames[currentIndex]}
          alt={`Frame ${currentIndex + 1}`}
          className="max-h-full max-w-full object-contain"
        />
        {/* Frame counter overlay */}
        <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded text-sm font-mono">
          {currentIndex + 1} / {totalFrames}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Frame display area */}
      {renderFrame()}

      {/* Controls bar */}
      <div className="bg-gray-900 border-t border-gray-700 px-4 py-2">
        {/* Timeline scrubber */}
        {hasFrames && (
          <div className="mb-2">
            <input
              type="range"
              min={0}
              max={totalFrames - 1}
              value={currentIndex}
              onChange={(e) => goToFrame(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        )}

        {/* Playback controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={skipBackward} className="text-gray-400 hover:text-white px-2 py-1 text-sm" title="Skip back 10">
              ⏪
            </button>
            <button onClick={stepBackward} className="text-gray-400 hover:text-white px-2 py-1 text-sm" title="Previous frame">
              ◀
            </button>
            <button
              onClick={togglePlay}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded text-sm font-medium"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button onClick={stepForward} className="text-gray-400 hover:text-white px-2 py-1 text-sm" title="Next frame">
              ▶
            </button>
            <button onClick={skipForward} className="text-gray-400 hover:text-white px-2 py-1 text-sm" title="Skip forward 10">
              ⏩
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Speed control */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">Speed:</span>
              {[0.5, 1, 2, 4].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-0.5 rounded text-xs ${
                    playbackSpeed === speed
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Frame info */}
            <span className="text-gray-500 text-xs font-mono">
              {hasFrames ? `Frame ${currentIndex + 1}/${totalFrames} @ ${fps * playbackSpeed} fps` : 'No frames'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
