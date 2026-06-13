import { useTranslation } from "react-i18next";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[10px] border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        superadmin: "border-transparent bg-role-superadmin text-white hover:bg-role-superadmin/80",
        admin: "border-transparent bg-role-admin text-white hover:bg-role-admin/80",
        payment: "border-transparent bg-role-payment text-white hover:bg-role-payment/80",
        teacher: "border-transparent bg-role-teacher text-white hover:bg-role-teacher/80",
        student: "border-transparent bg-role-student text-white hover:bg-role-student/80",
        moderator: "border-transparent bg-role-moderator text-white hover:bg-role-moderator/80",
        support: "border-transparent bg-role-support text-white hover:bg-role-support/80",
        content: "border-transparent bg-role-content text-white hover:bg-role-content/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
