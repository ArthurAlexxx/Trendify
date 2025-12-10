
"use client"

import * as React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useToast as useDesktopToast, type Toast } from "@/hooks/use-toast"
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

function useResponsiveToastInternal() {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const { toast: desktopToast } = useDesktopToast()
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

  const ToastContainer = React.useCallback(() => {
      if (!mobileToast) return null;
      
      return (
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
      );
  }, [mobileToast]);

  return { toast, ToastContainer }
}

// Export the hook with the correct name
export const useToast = useResponsiveToastInternal;

// Keep the old name for backwards compatibility if needed, but export the hook itself
export const useResponsiveToast = useResponsiveToastInternal;
