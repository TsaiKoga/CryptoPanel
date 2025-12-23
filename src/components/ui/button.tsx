import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:from-primary/90 hover:to-primary active:scale-[0.98]",
        destructive:
          "bg-gradient-to-r from-destructive to-destructive/90 text-white shadow-lg shadow-destructive/25 hover:shadow-xl hover:from-destructive/90 hover:to-destructive active:scale-[0.98]",
        outline:
          "border-2 border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-md active:scale-[0.98] [&_svg]:text-foreground",
        secondary:
          "bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground shadow-md hover:shadow-lg hover:from-secondary/90 hover:to-secondary active:scale-[0.98]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2.5 min-w-[2.5rem] has-[>svg]:px-5",
        sm: "h-9 rounded-lg gap-2 px-4 py-2 min-w-[2rem] has-[>svg]:px-3.5",
        lg: "h-12 rounded-xl px-8 py-3 min-w-[3rem] has-[>svg]:px-6 text-base gap-3",
        icon: "size-11 rounded-xl p-0",
        "icon-sm": "size-9 rounded-lg p-0",
        "icon-lg": "size-12 rounded-xl p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
