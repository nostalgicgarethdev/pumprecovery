// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"
import { Connection } from "@solana/web3.js"

const TOAST_LIMIT = 4
export const TOAST_REMOVE_DELAY = 500_000_000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  signature?: string
  status?: "pending" | "success" | "error"
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  // const timeout = setTimeout(() => {
  //   toastTimeouts.delete(toastId)
  //   dispatch({
  //     type: "REMOVE_TOAST",
  //     toastId: toastId,
  //   })
  // }, TOAST_REMOVE_DELAY)

  // toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

const toastTransaction = async ({...props}: Toast) => {
  if (!props.signature) {
    toast({...props})
    return;
  }

  const {update} = toast({...props, status: "pending"});

  const URLS = [
    process.env.NEXT_PUBLIC_SOLANA_API_URL as string,
    process.env.NEXT_PUBLIC_SOLANA_API_URL2 as string,
    process.env.NEXT_PUBLIC_SOLANA_API_URL3 as string,
  ].filter((v) => v);

  // Poll getSignatureStatuses (NOT confirmTransaction's blockheight strategy).
  // The blockheight strategy compares a FRESH blockhash's lastValidBlockHeight to
  // the OLD signature and spuriously throws TransactionExpiredBlockheightExceeded
  // even for a landed tx — which previously surfaced as a false "Could not submit"
  // on a bundle that actually succeeded. Polling the signature status can only
  // report the true on-chain outcome and never falsely expires.
  const sig = props.signature as string;
  const connections = URLS.map((url) => new Connection(url, "confirmed"));

  const transactionPromise = new Promise((resolve) => {
    let settled = false;
    const finish = (status: "success" | "error") => {
      if (settled) return;
      settled = true;
      update({ ...props, status, id: "" });
      resolve(sig);
    };

    const POLL_MS = 1_500;
    const MAX_MS = 90_000;
    const start = Date.now();

    const tick = async () => {
      if (settled) return;
      for (const connection of connections) {
        try {
          const st = await connection.getSignatureStatuses([sig]);
          const s = st?.value?.[0];
          if (s) {
            if (s.err) return finish("error");
            if (
              s.confirmationStatus === "confirmed" ||
              s.confirmationStatus === "finalized"
            ) {
              return finish("success");
            }
          }
        } catch {
          /* transient RPC error — keep polling */
        }
      }
      if (Date.now() - start >= MAX_MS) {
        // Timed out waiting; leave it pending rather than falsely failing a
        // trade that may still be landing. Resolve without flipping to error.
        if (!settled) {
          settled = true;
          resolve(sig);
        }
        return;
      }
      setTimeout(tick, POLL_MS);
    };
    tick();
  });

  return transactionPromise;
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    toastTransaction,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
