import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon =
          variant === "success"
            ? CheckCircle2
            : variant === "destructive"
              ? AlertCircle
              : variant === "warning"
                ? TriangleAlert
                : Info

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/75 shadow-sm group-[.success]:bg-emerald-100 group-[.destructive]:bg-rose-100 group-[.warning]:bg-amber-100 group-[.info]:bg-sky-100">
              <Icon className="h-5 w-5 text-slate-700 group-[.success]:text-emerald-600 group-[.destructive]:text-rose-600 group-[.warning]:text-amber-700 group-[.info]:text-sky-700" />
            </div>
            <div className="grid flex-1 gap-1 pr-2">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
