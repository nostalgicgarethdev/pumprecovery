# Rune Minting on a Bonding Curve

This project implements a Node.js server and an HTML client for minting runes on a bonding curve. The server generates Partially Signed Bitcoin Transactions (PSBTs) that increase in price according to a bonding curve, ensuring payment to a specified Bitcoin address. The client allows users to sign these PSBTs with their Bitcoin browser wallet, facilitating the minting of runes with unique content.

## Features

- **Server-Side PSBT Generation:** Generates PSBTs signed by the server to ensure payment to a specified address.
- **Client-Side PSBT Signing:** Serves the PSBT to the client to be signed by their Bitcoin browser wallet.
- **Bonding Curve Pricing:** Implements a bonding curve where each subsequent PSBT is more expensive than the previous one.
- **Rune Minting:** Supports etching runes with unique content and selling rune mints on a bonding curve.

## Getting Started

### Prerequisites

- Node.js installed on your system.
- A Bitcoin wallet that supports PSBTs for signing transactions.

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/rune-minting-bonding-curve.git
   ```
2. Navigate to the project directory:
   ```sh
   cd rune-minting-bonding-curve
   ```
3. Install the required dependencies:
   ```sh
   npm install
   ```

### Running the Server

To start the server, run:
```sh
npm start
```
This will start the server on `http://localhost:3000`. You can access the client interface by navigating to this URL in your web browser.

### Minting Runes

1. **Create a Rune:** Navigate to `/create` to mint a new rune with unique content.
2. **Generate a PSBT:** Go to `/generate-psbt` to generate a new PSBT for the current price on the bonding curve.
3. **Sign the PSBT:** Use your Bitcoin browser wallet to sign the provided PSBT.
4. **Complete the Minting Process:** Once the PSBT is signed, the rune minting process is completed, and the rune is officially minted with the provided content.

## Project Structure

- `package.json` - Contains npm configuration and project dependencies.
- `server.js` - The main server script.
- `bondingCurve.js` - Manages the bonding curve pricing logic.
- `psbtManager.js` - Handles PSBT generation and signing.
- `runeMinting.js` - Implements the rune minting logic.
- `index.html` - The client interface for interacting with the server.
- `client.js` - Client-side JavaScript for handling PSBT signing.
- `.gitignore` - Specifies intentionally untracked files to ignore.
- `README.md` - This file, describing the project and how to use it.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues on the GitHub repository.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to the developers of `bitcoinjs-lib` and other dependencies that made this project possible.
- Inspired by the concept of bonding curves and the innovative use of PSBTs in Bitcoin transactions.
