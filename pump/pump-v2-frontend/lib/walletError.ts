import { getBrand } from "@/lib/brand";

/**
 * Turn raw wallet-adapter errors into human guidance.
 *
 * The notable one: Mobile Wallet Adapter (MWA) connects to the wallet app's
 * local WebSocket (`ws://localhost:<port>/solana-wallet`). Modern mobile
 * browsers now block local-network connections by default ("Local Network
 * Access" permission), and MWA only works on Android with a compatible wallet
 * app — so this fails for many mobile users. The fix is user-side, so surface
 * actionable guidance instead of the raw `ws://localhost…` string.
 */
/**
 * stacc.art buys/sells are an atomic same-slot Jito bundle (buy → bundle_buy_burn
 * → commit), enforced on-chain by the BundleGuard. That requires a wallet that
 * can `signAllTransactions` and hand them back for the dApp to bundle. Some
 * wallets — notably the MetaMask Solana Snap — split the request into separate
 * signatures / auto-submit non-atomically, so the `commit` (same-slot mask check)
 * reverts. Detect those up front and steer the user to a compatible wallet
 * instead of burning a signature on a guaranteed revert.
 *
 * Returns a guidance string if the wallet can't do the bundle, else null.
 */
export function bundleWalletBlockReason(
  walletName: string | undefined,
  hasSignAllTransactions: boolean
): string | null {
  const n = (walletName || "").toLowerCase();
  if (n.includes("metamask")) {
    return (
      `MetaMask's Solana Snap can't trade on ${getBrand()}. Our anti-sandwich flow ` +
      "signs an atomic 3-transaction bundle that must land in one slot, but the " +
      "Snap splits it into a second signature that reverts. Connect Phantom, " +
      "Solflare, or Backpack instead."
    );
  }
  if (!hasSignAllTransactions) {
    return (
      `This wallet can't sign the atomic bundle that ${getBrand()} trades require. ` +
      "Please use Phantom, Solflare, or Backpack."
    );
  }
  return null;
}

export function humanizeWalletError(e: unknown): string {
  const raw =
    (e as any)?.message != null ? String((e as any).message) : String(e ?? "");
  const low = raw.toLowerCase();

  if (
    low.includes("wallet websocket") ||
    low.includes("/solana-wallet") ||
    low.includes("ws://localhost") ||
    low.includes("mobile wallet adapter")
  ) {
    return (
      `Couldn't reach your mobile wallet. On a phone, open ${getBrand()} inside your ` +
      "wallet's built-in browser (Phantom or Solflare → Browser tab), or allow the " +
      "browser's “local network” permission when it prompts, then reconnect and try " +
      "again. A desktop browser with a wallet extension also works."
    );
  }

  if (
    (e as any)?.code === 4001 ||
    low.includes("user rejected") ||
    low.includes("rejected the request")
  ) {
    return "You rejected the request in your wallet.";
  }

  if (low.includes("blockhash") || low.includes("block height exceeded")) {
    return "The transaction expired before it landed. Please try again.";
  }

  return raw || "Unknown error";
}
