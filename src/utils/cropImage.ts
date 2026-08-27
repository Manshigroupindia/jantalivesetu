/**
 * Utility to calculate exact crop math and export a 1:1 square cropped image Blob
 */

export interface CropDimensions {
  naturalWidth: number;
  naturalHeight: number;
  viewportSize: number;
  zoom: number;
  panX: number;
  panY: number;
  exportSize?: number;
}

export async function cropImageToBlob(
  imageElement: HTMLImageElement,
  dimensions: CropDimensions
): Promise<Blob> {
  const {
    naturalWidth,
    naturalHeight,
    viewportSize,
    zoom,
    panX,
    panY,
    exportSize = 512,
  } = dimensions;

  // 1. Calculate cover base scale and total scale
  const baseScale = Math.max(viewportSize / naturalWidth, viewportSize / naturalHeight);
  const totalScale = baseScale * zoom;

  const renderedWidth = naturalWidth * totalScale;
  const renderedHeight = naturalHeight * totalScale;

  // 2. Calculate top-left of crop box relative to top-left of rendered image
  const cropLeftInRendered = (renderedWidth - viewportSize) / 2 - panX;
  const cropTopInRendered = (renderedHeight - viewportSize) / 2 - panY;

  // 3. Convert rendered crop coordinates to natural image coordinates
  const factor = 1 / totalScale;
  let sourceX = cropLeftInRendered * factor;
  let sourceY = cropTopInRendered * factor;
  let sourceSize = viewportSize * factor;

  // 4. Clamp source coordinates to ensure 100% within natural image bounds
  sourceSize = Math.min(sourceSize, Math.min(naturalWidth, naturalHeight));
  sourceX = Math.max(0, Math.min(naturalWidth - sourceSize, sourceX));
  sourceY = Math.max(0, Math.min(naturalHeight - sourceSize, sourceY));

  // 5. Create export canvas
  const canvas = document.createElement('canvas');
  canvas.width = exportSize;
  canvas.height = exportSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not obtain canvas context');
  }

  // Set high quality interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill background white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, exportSize, exportSize);

  // Draw ONLY the exact cropped region
  ctx.drawImage(
    imageElement,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    exportSize,
    exportSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate cropped image Blob'));
        }
      },
      'image/jpeg',
      0.92
    );
  });
}
