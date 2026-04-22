import type { LucideProps } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  color?: 'green' | 'blue' | 'purple' | 'orange';
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color = 'green'
}: StatCardProps) {
  const colorClasses = {
    green: 'bg-success-subtle text-success',
    blue: 'bg-info-subtle text-info',
    purple: 'bg-purple-subtle text-purple',
    orange: 'bg-warning-subtle text-warning',
  };

  return (
    <div className="card border shadow-sm card-hover">
      <div className="card-body p-4">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <p className="small fw-medium text-muted mb-0">{title}</p>
            <h2 className="mt-2 fw-bold mb-0">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h2>
            {description && (
              <p className="mt-1 small text-secondary mb-0">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-3 ${colorClasses[color]}`}>
            <Icon size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}