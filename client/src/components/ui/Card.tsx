import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  borderColor?: string;
  children: ReactNode;
}

export function Card({
  borderColor,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-[var(--pf-bg-card)] rounded-pf shadow-pf border border-[var(--pf-border-color)] ${className}`}
      style={
        borderColor
          ? { borderLeftWidth: "4px", borderLeftColor: borderColor }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-5 py-4 border-b border-[var(--pf-border-color)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-5 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
