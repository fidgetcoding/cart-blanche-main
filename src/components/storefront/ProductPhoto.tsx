import { useEffect, useState } from 'react';

/**
 * The product view's photo. It never paints an empty frame: until the wanted photo has downloaded and
 * decoded, it keeps showing the one already on screen. A product that has just opened starts on its
 * tile's thumbnail, which the canvas has already loaded, so it opens with its photo in place and
 * sharpens a moment later.
 */
export function ProductPhoto({ src, placeholder, alt }: { src: string; placeholder: string; alt: string }) {
  const [shown, setShown] = useState(placeholder);
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.src = src;
    const show = () => { if (live) setShown(src); };
    (img.decode ? img.decode() : Promise.resolve()).then(show, show);
    return () => { live = false; };
  }, [src]);
  return <img src={shown} alt={alt} className="w-full h-full object-cover" draggable={false} />;
}
