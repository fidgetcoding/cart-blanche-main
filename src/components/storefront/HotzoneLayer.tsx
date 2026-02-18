import type { DemoHotzone } from '@/data/demo-data';

interface HotzoneLayerProps {
  hotzones: DemoHotzone[];
  scale: number;
}

export function HotzoneLayer({ hotzones, scale }: HotzoneLayerProps) {
  const labelOpacity = scale < 0.5 ? 1 : scale < 0.7 ? 1 - (scale - 0.5) / 0.2 : 0;

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
          {/* Subtle background — no border */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ opacity: labelOpacity * 0.04, backgroundColor: hz.style_config.color }}
          />

          {/* Label */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: labelOpacity }}
          >
            <span
              className="font-display text-3xl font-bold tracking-[0.3em] select-none"
              style={{ color: hz.style_config.color, opacity: 0.25 }}
            >
              {hz.name}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}
