import { initialOf } from '../api/client.js';

// One icon family site-wide: Phosphor (regular). strokeWidth is fixed by the lib.
export function Avatar({ name }) {
  return <span className="avatar" aria-hidden="true">{initialOf(name)}</span>;
}

export function SkeletonList({ rows = 3 }) {
  return (
    <div className="list" aria-label="Đang tải">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card card-flat">
          <div className="skel" style={{ width: '55%', height: 18 }} />
          <div className="skel" style={{ width: '90%', marginTop: 10 }} />
          <div className="skel" style={{ width: '35%', marginTop: 10 }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="card card-flat" style={{ textAlign: 'left' }}>
      <strong>{title}</strong>
      {hint && <p className="muted" style={{ margin: '6px 0 0' }}>{hint}</p>}
      {action && <div className="row" style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
