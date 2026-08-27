import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ZoomIn, ZoomOut, RotateCcw, Crop, X } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageFile: File | null;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob, croppedPreviewUrl: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageFile,
  onClose,
  onCropComplete,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load image when file changes
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImageSrc(objectUrl);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  if (!isOpen || !imageFile || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
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
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCrop = async () => {
    if (!imageRef.current) return;
    setProcessing(true);

    try {
      const img = imageRef.current;
      const exportCanvas = document.createElement('canvas');
      const exportSize = 512; // 512x512 high quality square crop
      exportCanvas.width = exportSize;
      exportCanvas.height = exportSize;
      const ctx = exportCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Calculate source crop area based on zoom & pan
      const viewSize = 280; // Size of the crop container box in UI
      const baseScale = Math.max(viewSize / img.naturalWidth, viewSize / img.naturalHeight);
      const totalScale = baseScale * zoom;

      const renderedWidth = img.naturalWidth * totalScale;
      const renderedHeight = img.naturalHeight * totalScale;

      // Position of center of crop box relative to image center
      const imgCenterX = renderedWidth / 2 + pan.x;
      const imgCenterY = renderedHeight / 2 + pan.y;

      const cropSourceSize = viewSize / totalScale;
      const sourceX = (img.naturalWidth / 2) - (imgCenterX - viewSize / 2) / totalScale;
      const sourceY = (img.naturalHeight / 2) - (imgCenterY - viewSize / 2) / totalScale;

      // Fill background with white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, exportSize, exportSize);

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        cropSourceSize,
        cropSourceSize,
        0,
        0,
        exportSize,
        exportSize
      );

      exportCanvas.toBlob(
        (blob) => {
          if (!blob) {
            alert('Unable to process this image. Please try another image.');
            setProcessing(false);
            return;
          }

          const previewUrl = URL.createObjectURL(blob);
          onCropComplete(blob, previewUrl);
          setProcessing(false);
          onClose();
        },
        'image/jpeg',
        0.92
      );
    } catch (err) {
      console.error('Crop error:', err);
      alert('Unable to process this image. Please try another image.');
      setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crop Profile Photo (1:1 Aspect Ratio)">
      <div className="space-y-4 py-2">
        <p className="text-xs text-gray-500 font-medium">
          Drag to position and use the zoom slider to adjust your profile photo crop.
        </p>

        {/* CROP CONTAINER VIEWPORT */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-[280px] h-[280px] mx-auto bg-gray-900 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing border-4 border-brand-500 shadow-xl touch-none flex items-center justify-center select-none"
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Crop candidate"
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
            }}
          />

          {/* OVERLAY MASK GUIDE */}
          <div className="absolute inset-0 border-2 border-white/40 rounded-full pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
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
              onChange={(e) => setZoom(parseFloat(e.target.value))}
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
