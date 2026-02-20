import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  tone?: "success" | "danger" | "neutral" | "accent";
  className?: string;
}

const toneClasses: Record<NonNullable<BadgeProps["tone"]>, string> = {
  success: "bg-green-100 text-green-800",
  danger: "bg-red-100 text-red-700",
  neutral: "bg-neutral-100 text-neutral-700",
  accent: "bg-amber-100 text-amber-800",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
