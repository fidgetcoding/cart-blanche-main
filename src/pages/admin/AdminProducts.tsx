export default function AdminProducts() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-lg hover:opacity-90 transition-opacity">
          ADD PRODUCT
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center h-64">
        <p className="text-muted-foreground font-display tracking-wider text-sm">
          No products yet — add your first product to get started
        </p>
      </div>
    </div>
  );
}
