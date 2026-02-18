import type { DemoHotzone } from '@/data/demo-data';

interface HotzoneLayerProps {
  hotzones: DemoHotzone[];
  scale: number;
  getEmphasis?: (hotzoneId: string) => number;
}

export function HotzoneLayer({ hotzones, scale, getEmphasis }: HotzoneLayerProps) {
  // Labels visible when zoomed out, fade as you zoom in
  const labelOpacity = scale < 0.6 ? 0.2 : scale < 0.8 ? 0.2 * (1 - (scale - 0.6) / 0.2) : 0;

  return (
    <>
      {hotzones.map(hz => (
        <div
          key={hz.id}
          className="absolute pointer-events-none"
          style={{
            left: hz.position.x,
            top: hz.position.y,
            width: hz.position.width,
            height: hz.position.height,
          }}
        >
          {/* Category label — just text, no box */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: labelOpacity * (getEmphasis?.(hz.id) ?? 1.0) }}
          >
            <span
              className="font-display text-2xl font-bold tracking-[0.35em] select-none"
              style={{
                color: hz.style_config.color,
                transform: `scale(${getEmphasis?.(hz.id) ?? 1.0})`,
                transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
              }}
            >
              {hz.name}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}
