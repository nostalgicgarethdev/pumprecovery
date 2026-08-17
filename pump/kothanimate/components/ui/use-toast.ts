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
    process.env.NEXT_PUBLIC_SOLANA_API_URL5 as string,
    process.env.NEXT_PUBLIC_SOLANA_API_URL6 as string,
  ].filter((v) => v);

  const transactionPromise = new Promise((resolve, reject) => {
    URLS.map(async url => {
      const connection = new Connection(url, "processed");
      const latestBlockHash = await connection.getLatestBlockhash("finalized");

      connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: props.signature as string,
      }, "processed").then((v: any) => {
        if (v.value.err) {
          update({...props, status: "error", id: ""});
        } else {
          update({...props, status: "success", id: ""});
        }

        resolve(props.signature);
      }).catch(e => {
        console.error(props, props.signature, e);
        update({...props, status: "error", id: ""});
        reject(e);
      })

      connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: props.signature as string,
      }, "confirmed").then((v: any) => {
        if (v.value.err) {
          update({...props, status: "error", id: ""});
        } else {
          update({...props, status: "success", id: ""});
        }

        resolve(props.signature);
      }).catch(e => {
        console.error(props, props.signature, e);
        update({...props, status: "error", id: ""});
        reject(e);
      })
    })
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
