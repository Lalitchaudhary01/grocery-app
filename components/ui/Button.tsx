import Link from "next/link";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "accent" | "outline";
type ButtonSize = "sm" | "md";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-green-700 text-white hover:bg-green-800",
  accent: "bg-amber-400 text-green-900 hover:bg-amber-500",
  outline: "border border-green-700 text-green-800 hover:bg-green-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm sm:text-base",
};

interface SharedProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

type ButtonAsButton = SharedProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type ButtonAsLink = SharedProps & {
  href: string;
};

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const baseClasses = clsx(
    "inline-flex items-center justify-center rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    variantClasses[props.variant ?? "primary"],
    sizeClasses[props.size ?? "md"],
    props.className,
  );

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={baseClasses}>
        {props.children}
      </Link>
    );
  }

  const { children, ...buttonProps } = props;
  return (
    <button className={baseClasses} {...buttonProps}>
      {children}
    </button>
  );
}
