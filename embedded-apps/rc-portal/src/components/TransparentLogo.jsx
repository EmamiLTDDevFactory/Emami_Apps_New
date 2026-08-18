import { useEffect, useState } from 'react';

export default function TransparentLogo({ src = '/apps/rc-portal/emami-logo-new.jpg', alt = 'Emami Group', className = '' }) {
  const [processedSrc, setProcessedSrc] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        let foundNonWhite = false;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Near-white background pixels (threshold > 220) made transparent
          if (r > 220 && g > 220 && b > 220) {
            data[i + 3] = 0;
          } else {
            foundNonWhite = true;
            // High-contrast brightness boost for maximum color shine & sharpness
            data[i] = Math.min(255, Math.round(r * 1.35 + 20));
            data[i + 1] = Math.min(255, Math.round(g * 1.35 + 20));
            data[i + 2] = Math.min(255, Math.round(b * 1.35 + 20));

            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }

        if (!foundNonWhite) {
          if (isMounted) setProcessedSrc(src);
          return;
        }

        ctx.putImageData(imgData, 0, 0);

        // Crop tightly around the logo graphic to eliminate empty space
        const cropW = Math.max(1, maxX - minX + 1);
        const cropH = Math.max(1, maxY - minY + 1);
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

        const resultUrl = cropCanvas.toDataURL('image/png');
        if (isMounted) setProcessedSrc(resultUrl);
      } catch (err) {
        console.warn('Failed to process transparent logo:', err);
        if (isMounted) setProcessedSrc(src);
      }
    };

    img.onerror = () => {
      if (isMounted) setProcessedSrc(src);
    };

    return () => {
      isMounted = false;
    };
  }, [src]);

  return (
    <img 
      src={processedSrc || src} 
      alt={alt} 
      className={className} 
    />
  );
}
