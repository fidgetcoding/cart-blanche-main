export default function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-bold mb-8">{title}</h1>
      <div className="liquid-glass rounded-xl p-8 flex items-center justify-center h-64">
        <p className="text-muted-foreground font-display tracking-wider text-sm">
          Coming soon
        </p>
      </div>
    </div>
  );
}
