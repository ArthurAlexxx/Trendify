
"use client"

import * as React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useToast, type Toast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ResponsiveToast extends Toast {
  // Can add specific mobile-only properties here if needed in the future
}

export function useResponsiveToast() {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const { toast: desktopToast } = useToast()
  const [mobileToast, setMobileToast] = React.useState<ResponsiveToast | null>(null)

  const toast = React.useCallback(
    (props: ResponsiveToast) => {
      if (isDesktop) {
        desktopToast(props)
      } else {
        setMobileToast(props)
      }
    },
    [isDesktop, desktopToast]
  )

  const AlertDialogComponent = mobileToast ? (
    <AlertDialog open={!!mobileToast} onOpenChange={() => setMobileToast(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
            {mobileToast.icon && <div className="mx-auto h-12 w-12 flex items-center justify-center">{mobileToast.icon}</div>}
          {mobileToast.title && <AlertDialogTitle className="text-center">{mobileToast.title}</AlertDialogTitle>}
          {mobileToast.description && (
            <AlertDialogDescription className="text-center">
              {mobileToast.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setMobileToast(null)}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null

  // It's important to return a component to be rendered at the root of your layout
  return { toast, ToastContainer: () => AlertDialogComponent }
}
