export class LoginDto {
  signature: string;
  timestamp: number;
  address: string;
  // Optional: the exact message the wallet signed. Lets mirrors sign their own
  // brand without pinning a site URL in the backend. Validated for shape +
  // matching timestamp before use; falls back to neutral canonical messages.
  message?: string;
}
