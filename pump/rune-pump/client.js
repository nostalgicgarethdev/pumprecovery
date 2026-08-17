document.addEventListener('DOMContentLoaded', function() {
    const psbtInfo = document.getElementById('psbtInfo');
    const mintId = urlParams.get('mint');
    const etchRuneBtn = document.getElementById('etchRuneBtn');
    const etchInfo = document.getElementById('etchInfo');
    const runeInfo = document.getElementById('runeInfo');
    const generatePsbtBtn = document.getElementById('generatePsbtBtn');
    generatePsbtBtn.addEventListener('click', async () => {
        try {
            const runeResponse = await fetch(`/mint/${runeId}`);
            if (!runeResponse.ok) {
                throw new Error('Failed to fetch rune information');
            }
            
            // Display the PSBT information to the user for the etching process
            psbtInfo.textContent = `PSBT for etching generated: ${etchData.psbt}. Please sign it with your Bitcoin wallet.`;

            // Assuming the client has a method to sign the PSBT with their Bitcoin browser wallet
            const signedPsbt = await signAndBroadcastPsbt(runeResponse.psbt); // This function is hypothetical and needs to be implemented based on the wallet's API

            // Send the signed PSBT back to the server for the etching process to complete
            const etchCompleteResponse = await fetch(`/etch-complete/${etchData.etchId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ signedPsbt }),
            });

            if (!etchCompleteResponse.ok) {
                throw new Error('Failed to complete etching process');
            }
            const etchCompleteData = await etchCompleteResponse.json();

            // Display the etched rune information
            runeInfo.textContent = `Rune etched successfully. Transaction ID: ${etchCompleteData.txId}`;
        } catch (error) {
            console.error('Error:', error);
            runeInfo.textContent = 'Error fetching rune information. Please try again.';
        }
    });
    etchRuneBtn.addEventListener('click', async () => {
        try {
            // Request the server to etch a new rune
            const etchResponse = await fetch('/etch', { method: 'POST' });
            if (!etchResponse.ok) {
                throw new Error('Failed to etch new rune');
            }
            const etchData = await etchResponse.json();

            // Display the PSBT information to the user for the etching process
            psbtInfo.textContent = `PSBT for etching generated: ${etchData.psbt}. Please sign it with your Bitcoin wallet.`;

            // Assuming the client has a method to sign the PSBT with their Bitcoin browser wallet
            const signedPsbt = await signAndBroadcastPsbt(etchData.psbt); // This function is hypothetical and needs to be implemented based on the wallet's API

            // Send the signed PSBT back to the server for the etching process to complete
            const etchCompleteResponse = await fetch(`/etch-complete/${etchData.etchId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ signedPsbt }),
            });

            if (!etchCompleteResponse.ok) {
                throw new Error('Failed to complete etching process');
            }
            const etchCompleteData = await etchCompleteResponse.json();

            // Display the etched rune information
            runeInfo.textContent = `Rune etched successfully. Transaction ID: ${etchCompleteData.txId}`;
        } catch (error) {
            console.error('Error:', error);
            psbtInfo.textContent = 'Error etching or completing the etching process. Please try again.';
        }
    });
    async function signAndBroadcastPsbt(psbtBase64) {
        try {
            // Ensure the wallet name is set
            const walletName = getInstalledWalletName();
            console.log(`Using wallet: ${walletName}`);
    
            // Sign the PSBT
            const signedPsbtBase64 = await signPSBTUsingWallet(psbtBase64);
            console.log(`Signed PSBT: ${signedPsbtBase64}`);
    
            // Optionally, convert the PSBT to a final transaction and broadcast it
            // This step depends on your specific requirements and the wallet's capabilities
            // For example, you might use `signPSBTUsingWalletAndBroadcast` or similar
    
        } catch (error) {
            console.error(`Error signing PSBT: ${error}`);
        }
    }

function getInstalledWalletName() {
    if (typeof window.unisat !== 'undefined') {
        return 'Unisat'
    }

    if (window?.StacksProvider?.psbtRequest) {
        return 'Hiro'
    }

    if (window?.BitcoinProvider?.signTransaction?.toString()?.includes('Psbt')) {
        return 'Xverse'
    }

    if (typeof window.ordinalSafe !== 'undefined') {
        return 'OrdinalSafe'
    }
}

async function getHiroWalletAddresses() {
    return new Promise((resolve, reject) => {
        if (!connectUserSession.isUserSignedIn()) {
            connect.showConnect({
                connectUserSession,
                network: Object.getPrototypeOf(connect.getDefaultPsbtRequestOptions({}).network.__proto__.constructor).fromName('mainnet'),
                appDetails: {
                    name: 'OpenOrdex',
                    icon: window.location.origin + '/img/favicon/apple-touch-icon.png',
                },
                onFinish: () => {
                    resolve({
                        cardinal: connectUserSession.loadUserData().profile.btcAddress.p2wpkh.mainnet,
                        ordinal: connectUserSession.loadUserData().profile.btcAddress.p2tr.mainnet,
                    })
                },
                onCancel: () => {
                    resolve()
                },
            });
        } else {
            resolve({
                cardinal: connectUserSession.loadUserData().profile.btcAddress.p2wpkh.mainnet,
                ordinal: connectUserSession.loadUserData().profile.btcAddress.p2tr.mainnet,
            })
        }
    })
}

/**
 * getWalletAddress(type = 'cardinal')
 * @param {undefined | 'cardinal' | 'ordinal'} type 
 * @returns {string | undefined}
 */
async function getWalletAddress(type = 'cardinal') {
    if (typeof window.unisat !== 'undefined') {
        return (await unisat.requestAccounts())?.[0]
    }

    if (typeof window.StacksProvider !== 'undefined') {
        return (await getHiroWalletAddresses())?.[type]
    }

    if (typeof window.ordinalSafe !== 'undefined') {
        return (await ordinalSafe.requestAccounts())?.[0]
    }
}

});
