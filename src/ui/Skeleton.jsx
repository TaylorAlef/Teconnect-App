export function SkeletonLine({ width = '100%', height = 13 }) {
  return <span className="ng-skel" style={{ width, height }} aria-hidden="true" />;
}
export function SkeletonCard({ lines = 3 }) {
  return <div className="ng-skel-card" aria-hidden="true">
    {Array.from({ length: lines }).map((_, index) => <SkeletonLine key={index} width={index === 0 ? '55%' : `${92 - index * 8}%`} />)}
  </div>;
}
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return <div className="ng-skel-table" role="status" aria-label="A carregar dados">
    {Array.from({ length: rows }).map((_, row) => <div className="ng-skel-row" key={row}>
      {Array.from({ length: cols }).map((_, col) => <SkeletonLine key={col} width={col === 0 ? '32%' : '16%'} />)}
    </div>)}
  </div>;
}
export function SkeletonKpiRow({ count = 4 }) {
  return <div className="ng-skel-kpi-row" role="status" aria-label="A carregar indicadores">
    {Array.from({ length: count }).map((_, index) => <div className="ng-skel-kpi" key={index}>
      <SkeletonLine width="46%" height={10} /><SkeletonLine width="70%" height={26} />
    </div>)}
  </div>;
}
