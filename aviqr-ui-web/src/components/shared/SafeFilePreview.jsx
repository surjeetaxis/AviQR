import { useEffect, useRef } from 'react';

export default function SafeFilePreview({ file, ...props }) {
  const canvas = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const context = canvas.current.getContext('2d');
    context.clearRect(0, 0, canvas.current.width, canvas.current.height);
    if (typeof createImageBitmap !== 'function') return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file?.type)) return;
    createImageBitmap(file, { resizeWidth: 240, resizeHeight: 240, resizeQuality: 'high' })
      .then(bitmap => {
        if (!cancelled) context.drawImage(bitmap, 0, 0, 240, 240);
        bitmap.close();
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [file]);
  return <canvas ref={canvas} width={240} height={240} role="img" aria-label="Menu file preview" {...props} />;
}
