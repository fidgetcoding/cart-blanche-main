export default function AdminDashboard() {
  const stats = [
    { label: 'TOTAL ORDERS', value: '0' },
    { label: 'REVENUE', value: '$0' },
    { label: 'AVG ORDER', value: '$0' },
    { label: 'PRODUCTS', value: '0' },
  ];

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-6">
            <p className="text-xs font-display tracking-widest text-muted-foreground">{s.label}</p>
            <p className="font-display text-3xl font-bold mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center h-64">
        <p className="text-muted-foreground font-display tracking-wider text-sm">
          Complete onboarding to see your analytics here
        </p>
      </div>
    </div>
  );
}
