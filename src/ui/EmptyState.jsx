export function EmptyState({ icon: Icon, title, description, action }) {
  return <div className="ng-empty">
    {Icon && <div className="ng-empty-icon"><Icon size={26} /></div>}
    <strong>{title}</strong>
    {description && <span>{description}</span>}
    {action && <div className="ng-empty-action">{action}</div>}
  </div>;
}
