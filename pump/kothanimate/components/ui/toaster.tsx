"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { TOAST_REMOVE_DELAY, useToast } from "@/components/ui/use-toast";
import clsx from "clsx";
import { FaCheck, FaCross } from "react-icons/fa";
import { Oval } from "react-loader-spinner";
import { RxCross1 } from "react-icons/rx";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function({
        id,
        title,
        signature,
        description,
        action,
        className,
        status,
        ...props
      }) {
        return (
          <Toast
            duration={TOAST_REMOVE_DELAY}
            key={id}
            className={clsx(
              status === "error" && "border-red-400",
              status === "success" && "border-green-400",
              className
            )}
            {...props}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}

              {status === "pending" && (
                <ToastDescription>Confirming transaction</ToastDescription>
              )}

              {status === "error" && signature && (
                <ToastDescription>Transaction failed</ToastDescription>
              )}

              {status === "success" && (
                <ToastDescription>Transaction confirmed</ToastDescription>
              )}
            </div>

            {action}

            {signature && (
              <div className="flex gap-2 items-center whitespace-nowrap">
                {status === "pending" && (
                  <Oval color="white" height={24} width={24} />
                )}

                {status === "success" && <FaCheck height={24} width={24} />}

                {status === "error" && <RxCross1 height={24} width={24} />}

                <a
                  href={`https://solscan.io/tx/${signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="border border-white py-2 px-4 rounded-lg text-sm hover:bg-gray-900">
                    View tx
                  </button>
                </a>
              </div>
            )}

            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
