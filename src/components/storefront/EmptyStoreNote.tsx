/** What a shopper sees on a real store before it has anything to sell. */
export function EmptyStoreNote({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center pointer-events-none ${className}`}>
      <p className="text-muted-foreground tracking-[0.3em] text-[11px] uppercase" style={{ fontFamily: 'var(--font-display)' }}>
        Nothing here yet
      </p>
    </div>
  );
}
