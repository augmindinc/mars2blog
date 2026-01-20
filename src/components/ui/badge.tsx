import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-none border border-black px-3 py-0.5 text-[10px] uppercase tracking-widest font-bold transition-all focus:outline-none",
    {
        variants: {
            variant: {
                default:
                    "bg-black text-white hover:bg-white hover:text-black",
                secondary:
                    "bg-white text-black hover:bg-black hover:text-white",
                destructive:
                    "border-destructive bg-destructive text-white hover:bg-white hover:text-destructive",
                success:
                    "border-black bg-white text-black",
                warning:
                    "border-black bg-white text-black",
                outline: "text-black bg-transparent hover:bg-black hover:text-white",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
