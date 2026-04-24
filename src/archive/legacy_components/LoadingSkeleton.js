"use client";

/**
 * Reusable loading skeleton for modules.
 * Renders a shimmering placeholder that matches the module layout.
 */
export default function LoadingSkeleton({ rows = 3, cards = 0 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header skeleton */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 10 }} />
        <div>
          <div className="skeleton skeleton-text" style={{ width: 160 }} />
          <div className="skeleton skeleton-text short" style={{ width: 100 }} />
        </div>
      </div>

      {/* Cards grid skeleton */}
      {cards > 0 && (
        <div className="grid-auto">
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      )}

      {/* Content rows skeleton */}
      <div className="card" style={{ padding: 24 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="skeleton skeleton-text"
            style={{ width: `${80 - i * 15}%`, marginBottom: i < rows - 1 ? 12 : 0 }}
          />
        ))}
      </div>
    </div>
  );
}
