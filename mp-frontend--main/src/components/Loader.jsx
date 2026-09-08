// Skeleton card
function CardSkeleton() {
  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="skeleton h-4 w-3/4 mb-2" />
          <div className="skeleton h-3 w-1/2" />
        </div>
        <div className="skeleton w-14 h-14 rounded-full" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-5 w-20 rounded-full" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-5/6" />
      <div className="skeleton h-8 w-28 rounded-lg ml-auto" />
    </div>
  );
}

// Skeleton grid
export function SchemeGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

// Inline spinner
export function Spinner({ size = 20 }) {
  return (
    <div className="flex items-center justify-center p-4">
      <div style={{
        width: size, height: size,
        border: "3px solid var(--border)",
        borderTop: "3px solid var(--accent)",
        borderRadius: "50%",
        animation: "spin 0.75s linear infinite"
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Full-page loader
export default function Loader({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <div style={{
        width: 44, height: 44,
        border: "4px solid var(--border)",
        borderTop: "4px solid var(--accent)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }} />
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
