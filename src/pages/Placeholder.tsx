export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="h-[80vh] flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl mb-6 flex items-center justify-center">
        <span className="text-2xl">✨</span>
      </div>
      <h1 className="text-2xl font-display font-semibold mb-2">{title}</h1>
      <p className="text-zinc-500 max-w-sm">This module is part of the architecture, ready to be connected to the backend services.</p>
    </div>
  );
}
