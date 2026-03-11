interface StatGraphProps {
  values: number[];
}

export const StatGraph = ({ values }: StatGraphProps) => {
  if (!values.length) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Selected stat trend" className="h-44 w-full">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        vectorEffect="non-scaling-stroke"
        className="text-foreground"
      />
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--highlight))"
        strokeWidth="1.2"
        strokeDasharray="2 4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
