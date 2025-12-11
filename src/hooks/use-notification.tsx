
"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface NotificationProps {
    title?: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
}

function useNotificationInternal() {
  const [notification, setNotification] = React.useState<NotificationProps | null>(null)

  const notify = React.useCallback((props: NotificationProps) => {
    setNotification(props);
  }, [])

  const NotificationContainer = React.useCallback(() => {
      if (!notification) return null;
      
      return (
        <AlertDialog open={!!notification} onOpenChange={() => setNotification(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    {notification.icon && <div className="mx-auto h-12 w-12 flex items-center justify-center">{notification.icon}</div>}
                    {notification.title && <AlertDialogTitle className="text-center">{notification.title}</AlertDialogTitle>}
                    {notification.description && (
                        <AlertDialogDescription className="text-center">
                        {notification.description}
                        </AlertDialogDescription>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setNotification(null)}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      );
  }, [notification]);

  return { notify, NotificationContainer }
}

export const useNotification = useNotificationInternal;
