
import type { LucideIcon } from "lucide-react";
import "./StatCard.css";

interface StatCardProps {
  title: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  variant?: "default" | "green" | "gold";
}

export default function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  variant = "default",
}: StatCardProps) {
  return (
    <article className={`stat-card stat-card-${variant}`}>
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>

        <div className="stat-card-icon">
          <Icon size={21} strokeWidth={1.8} />
        </div>
      </div>

      <div className="stat-card-value">{value}</div>

      {detail && (
        <p className="stat-card-detail">{detail}</p>
      )}
    </article>
  );
}
