import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-[5.25rem] left-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 px-3 pb-1 sm:bottom-4 sm:left-auto sm:right-4 sm:w-full sm:max-w-[420px] sm:flex-col sm:px-0",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-2xl border p-4 pr-10 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-3 data-[state=closed]:slide-out-to-bottom-2 sm:data-[state=open]:slide-in-from-right-3 sm:data-[state=closed]:slide-out-to-right-2",
  {
    variants: {
      variant: {
        default: "border-slate-200/90 bg-white/98 text-slate-900 backdrop-blur supports-[backdrop-filter]:bg-white/90",
        destructive:
          "destructive group border-red-200 bg-red-50/95 text-red-950 shadow-[0_16px_40px_-28px_rgba(220,38,38,0.45)]",
        success: "group border-emerald-200 bg-emerald-50/95 text-emerald-950 shadow-[0_16px_40px_-28px_rgba(5,150,105,0.4)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 px-3 text-sm font-medium text-slate-700 ring-offset-background transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-red-200 group-[.destructive]:bg-white/60 group-[.destructive]:text-red-700 group-[.destructive]:hover:bg-red-100 group-[.destructive]:focus:ring-red-300 group-[.success]:border-emerald-200 group-[.success]:bg-white/60 group-[.success]:text-emerald-700 group-[.success]:hover:bg-emerald-100 group-[.success]:focus:ring-emerald-300",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-lg p-1 text-slate-400 opacity-80 transition-colors hover:bg-white/60 hover:text-slate-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-300 group-[.destructive]:text-red-400 group-[.destructive]:hover:bg-red-100 group-[.destructive]:hover:text-red-700 group-[.destructive]:focus:ring-red-300 group-[.success]:text-emerald-500 group-[.success]:hover:bg-emerald-100 group-[.success]:hover:text-emerald-700",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-5", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm leading-5 text-slate-600 opacity-100 group-[.destructive]:text-red-800/90 group-[.success]:text-emerald-800/90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}