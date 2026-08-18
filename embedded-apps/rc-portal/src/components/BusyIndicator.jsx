export default function BusyIndicator() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
      <div className="rounded-2xl bg-white px-6 py-5 shadow-xl">Loading...</div>
    </div>
  );
}
