const fetch = require('node-fetch');
const { generatePSBT } = require('./psbtManager');
const { getNextPrice } = require('./bondingCurve');

// Assuming the server's Bitcoin address for receiving payments
const serverBitcoinAddress = 'your_bitcoin_address_here'; // Replace with your actual Bitcoin address

/**
 * Mints a new rune with the given mint ID and etches it with the provided content.
 * The minting price is determined by the current position on the bonding curve.
 * The PSBT generated for the payment is signed by the server and needs to be signed by the client's wallet.
 * 
 * @param {string} mintId - The unique ID for the mint.
 * @param {string} content - The content to be etched onto the rune.
 * @returns {Promise<string>} A promise that resolves with the PSBT as a base64 string for the client to sign.
 */
async function mintRune(mintId, content) {
  try {
    // Get the next price from the bonding curve
    const price = getNextPrice();

    // Generate the PSBT for the given price and server's address
    const runeName = "FLDTFLDTFLDT";
    const base26Integers = alphaToNumber(runeName.replace(/[^A-Z]/g, ""));
    const hexCommit = bigIntToLittleEndianHex(base26Integers);

    const ordinal = "00"; // False
    ordinal += "63"; // OP_IF
    ordinal += "07" + hexCommit; // size+hex
    ordinal += "68"; // OP_ELSE

    const scriptBuffer = Buffer.from(
      `20${serverBitcoinAddress}ac${ordinal}`,
      'hex'
    );

    const outputScript = bitcoin.script.compile(scriptBuffer);
    const scriptTree = {
      output: outputScript,
      redeemVersion: 192,
    };

    const scriptTaproot = bitcoin.payments.p2tr({
      internalPubkey: Buffer.from(serverBitcoinAddress, 'hex'), // Placeholder for BorrowerOrdinalPubKeyBuffer
      scriptTree,
      network: bitcoin.networks.bitcoin,
      tapleaf, // Add the tapleaf hash here
    });
    const revealAddress = scriptTaproot.address;

    

    // Adjust the price specifically for etching the rune
    const etchPrice = 1000; // Set the etch price to 1000 sats for the etching process

    // Generate the PSBT for the etching price, ensuring the server receives 1000 sats
    const psbtBase64 = await generatePSBT(etchPrice, serverBitcoinAddress);
    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
    psbt.fromBase64(psbtBase64);
    psbt.addOutput({
      address: revealAddress,
      value: etchPrice,
    });
    
    // Assuming the etch operation is successful, return the PSBT for the client to sign
    return psbt.toBase64();
  } catch (error) {
    console.error('Error minting rune:', error);
    throw error;
  }
}

module.exports = {
  mintRune,
};
