import type { ComponentPropsWithoutRef } from "react";

const accentColors = {
  blue: "border-l-brand-blue",
  cyan: "border-l-brand-cyan",
  orange: "border-l-brand-orange",
  coral: "border-l-brand-coral",
  teal: "border-l-brand-teal",
  purple: "border-l-brand-purple",
  green: "border-l-brand-green",
} as const;

interface CardProps extends ComponentPropsWithoutRef<"div"> {
  accent?: keyof typeof accentColors;
}

export function Card({ children, className = "", accent, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${
        accent ? `border-l-4 ${accentColors[accent]}` : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
