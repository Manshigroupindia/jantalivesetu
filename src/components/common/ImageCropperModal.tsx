import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ZoomIn, ZoomOut, RotateCcw, Crop } from 'lucide-react';
import { cropImageToBlob } from '../../utils/cropImage';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageFile: File | null;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob, croppedPreviewUrl: string) => void;
}

const VIEWPORT_SIZE = 280; // Size of crop square in pixels

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageFile,
  onClose,
  onCropComplete,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image & determine natural dimensions
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      setNaturalSize(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImageSrc(objectUrl);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    const img = new Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  if (!isOpen || !imageFile || !imageSrc || !naturalSize) return null;

  // Calculate scales and boundaries
  const baseScale = Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height);
  const totalScale = baseScale * zoom;

  const renderedWidth = naturalSize.width * totalScale;
  const renderedHeight = naturalSize.height * totalScale;

  const maxPanX = Math.max(0, (renderedWidth - VIEWPORT_SIZE) / 2);
  const maxPanY = Math.max(0, (renderedHeight - VIEWPORT_SIZE) / 2);

  const clampPan = (x: number, y: number) => ({
    x: Math.max(-maxPanX, Math.min(maxPanX, x)),
    y: Math.max(-maxPanY, Math.min(maxPanY, y)),
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newPanX = e.clientX - dragStart.x;
    const newPanY = e.clientY - dragStart.y;
    setPan(clampPan(newPanX, newPanY));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const newPanX = e.touches[0].clientX - dragStart.x;
    const newPanY = e.touches[0].clientY - dragStart.y;
    setPan(clampPan(newPanX, newPanY));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCrop = async () => {
    if (!imageRef.current || !naturalSize) return;
    setProcessing(true);

    try {
      const croppedBlob = await cropImageToBlob(imageRef.current, {
        naturalWidth: naturalSize.width,
        naturalHeight: naturalSize.height,
        viewportSize: VIEWPORT_SIZE,
        zoom,
        panX: pan.x,
        panY: pan.y,
        exportSize: 512,
      });

      const previewUrl = URL.createObjectURL(croppedBlob);
      onCropComplete(croppedBlob, previewUrl);
      setProcessing(false);
      onClose();
    } catch (err) {
      console.error('Crop error:', err);
      alert('Unable to process this image. Please try another image.');
      setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crop Profile Photo (1:1 Square)">
      <div className="space-y-4 py-2">
        <p className="text-xs text-gray-500 font-medium">
          Drag to align your face inside the circle. Adjust zoom using the slider.
        </p>

        {/* CROP CONTAINER VIEWPORT */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-[280px] h-[280px] mx-auto bg-black rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing border-4 border-brand-500 shadow-xl touch-none select-none"
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Crop target"
            draggable={false}
            style={{
              width: `${renderedWidth}px`,
              height: `${renderedHeight}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              position: 'absolute',
              left: `${(VIEWPORT_SIZE - renderedWidth) / 2}px`,
              top: `${(VIEWPORT_SIZE - renderedHeight) / 2}px`,
              transform: `translate(${pan.x}px, ${pan.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
            }}
          />

          {/* CIRCULAR / SQUARE OVERLAY MASK */}
          <div className="absolute inset-0 border-2 border-white/60 rounded-full pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
        </div>

        {/* CONTROLS */}
        <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => {
                const newZoom = parseFloat(e.target.value);
                setZoom(newZoom);

                // Re-clamp pan for new zoom level
                const newTotalScale = baseScale * newZoom;
                const newRW = naturalSize.width * newTotalScale;
                const newRH = naturalSize.height * newTotalScale;
                const newMaxPanX = Math.max(0, (newRW - VIEWPORT_SIZE) / 2);
                const newMaxPanY = Math.max(0, (newRH - VIEWPORT_SIZE) / 2);
                setPan((prev) => ({
                  x: Math.max(-newMaxPanX, Math.min(newMaxPanX, prev.x)),
                  y: Math.max(-newMaxPanY, Math.min(newMaxPanY, prev.y)),
                }));
              }}
              className="w-full accent-brand-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-gray-500 shrink-0" />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-200">
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Position
            </button>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Crop className="w-4 h-4" />}
            loading={processing}
            onClick={handleCrop}
          >
            Crop & Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
};
