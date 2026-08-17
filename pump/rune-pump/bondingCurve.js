// bondingCurve.js
// This module calculates the price of the next PSBT based on a bonding curve.

// Assuming a simple linear bonding curve for demonstration purposes.
// You can replace this with any other formula for a different curve shape.

const initialPrice = 100; // Starting price for the first PSBT.
const priceIncrement = 10; // The amount by which the price increases with each new PSBT.

let currentPrice = initialPrice;

/**
 * Resets the price to its initial value. Useful for testing or restarting the curve.
 */
function resetPrice() {
  currentPrice = initialPrice;
}

/**
 * Calculates and returns the next price on the bonding curve.
 * It also increments the current price for the next call.
 * @returns {number} The next price on the bonding curve.
 */
function getNextPrice() {
  const nextPrice = currentPrice;
  currentPrice += priceIncrement;
  return nextPrice;
}

module.exports = {
  resetPrice,
  getNextPrice,
};
