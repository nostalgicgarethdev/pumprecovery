const express = require('express');
const bodyParser = require('body-parser');
const bitcoin = require('bitcoinjs-lib');
const { generatePSBT, increasePriceOnCurve } = require('./psbtManager');
const { mintRune } = require('./runeMinting');
const { getCurrentPrice, updatePrice } = require('./bondingCurve');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

let currentPrice = getCurrentPrice(); // Assume this function retrieves the current price from a file or database

app.get('/create', async (req, res) => {
  try {
    const rune = await mintRune(); // Minting a new rune
    res.json({ success: true, rune });
  } catch (error) {
    console.error('Error minting rune:', error);
    res.status(500).json({ success: false, error: 'Error minting rune' });
  }
});

app.get('/generate-psbt', async (req, res) => {
  try {
    const psbt = await generatePSBT(currentPrice, 'your_bitcoin_address_here'); // Generate a PSBT for the current price
    currentPrice = increasePriceOnCurve(currentPrice); // Increase the price for the next PSBT
    updatePrice(currentPrice); // Assume this function updates the current price in a file or database
    res.json({ success: true, psbt });
  } catch (error) {
    console.error('Error generating PSBT:', error);
    res.status(500).json({ success: false, error: 'Error generating PSBT' });
  }
});

app.get('/current-price', (req, res) => {
  res.json({ success: true, currentPrice });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
