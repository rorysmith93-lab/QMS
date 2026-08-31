import { FISHBONE_CATEGORIES, type FishboneData } from "@/lib/root-cause-tools";

const WIDTH = 860;
const LINE_HEIGHT = 14;
const TOP_CATEGORIES = FISHBONE_CATEGORIES.slice(0, 3);
const BOTTOM_CATEGORIES = FISHBONE_CATEGORIES.slice(3);

// A genuine visual fishbone (Ishikawa) diagram, laid out from the same
// structured category data the editor collects — not a static image, the
// branch lengths and label positions adapt to how many causes are listed.
export function FishboneDiagram({ data }: { data: FishboneData }) {
  const maxTop = Math.max(1, ...TOP_CATEGORIES.map((c) => data[c.key]?.length ?? 0));
  const maxBottom = Math.max(1, ...BOTTOM_CATEGORIES.map((c) => data[c.key]?.length ?? 0));

  const topBlock = 26 + maxTop * LINE_HEIGHT;
  const bottomBlock = 26 + maxBottom * LINE_HEIGHT;
  const spineY = topBlock + 24;
  const height = spineY + bottomBlock + 24;

  const spineStartX = 60;
  const spineEndX = WIDTH - 150;
  const branchXs = [0.2, 0.5, 0.8].map((f) => spineStartX + (spineEndX - spineStartX) * f);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" role="img" aria-label="Fishbone diagram">
      <line
        x1={spineStartX}
        y1={spineY}
        x2={spineEndX}
        y2={spineY}
        stroke="var(--text-primary)"
        strokeWidth={2}
      />
      <polygon
        points={`${spineEndX},${spineY - 10} ${spineEndX + 22},${spineY} ${spineEndX},${spineY + 10}`}
        fill="var(--text-primary)"
      />
      <rect
        x={spineEndX + 18}
        y={spineY - 28}
        width={120}
        height={56}
        rx={6}
        fill="var(--danger-bg)"
        stroke="var(--danger)"
      />
      <foreignObject x={spineEndX + 24} y={spineY - 24} width={108} height={48}>
        <div
          style={{
            fontSize: 10,
            lineHeight: "12px",
            color: "var(--text-primary)",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
          }}
        >
          {data.problem || "Problem / Effect"}
        </div>
      </foreignObject>

      {TOP_CATEGORIES.map((cat, i) => {
        const x = branchXs[i];
        const causes = data[cat.key] ?? [];
        const labelY = topBlock - 8;
        return (
          <g key={cat.key}>
            <line x1={x} y1={spineY} x2={x - 36} y2={labelY + 4} stroke="var(--brand)" strokeWidth={1.5} />
            <text x={x - 40} y={labelY} textAnchor="end" fontSize="11" fontWeight={600} fill="var(--text-primary)">
              {cat.label}
            </text>
            {causes.map((cause, ci) => (
              <text
                key={ci}
                x={x - 40}
                y={labelY - (ci + 1) * LINE_HEIGHT}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-secondary)"
              >
                {cause}
              </text>
            ))}
          </g>
        );
      })}

      {BOTTOM_CATEGORIES.map((cat, i) => {
        const x = branchXs[i];
        const causes = data[cat.key] ?? [];
        const labelY = spineY + bottomBlock - 8;
        return (
          <g key={cat.key}>
            <line x1={x} y1={spineY} x2={x - 36} y2={labelY - 4} stroke="var(--brand)" strokeWidth={1.5} />
            <text x={x - 40} y={labelY} textAnchor="end" fontSize="11" fontWeight={600} fill="var(--text-primary)">
              {cat.label}
            </text>
            {causes.map((cause, ci) => (
              <text
                key={ci}
                x={x - 40}
                y={labelY + (ci + 1) * LINE_HEIGHT}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-secondary)"
              >
                {cause}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
