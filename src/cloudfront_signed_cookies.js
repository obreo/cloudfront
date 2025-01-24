const express = require('express');
const { getSignedCookies } = require('@aws-sdk/cloudfront-signer');
require('dotenv').config();

const app = express();
const PORT = 3000; // Fixed port 300
const endpoint = ''; // Fixed endpoint


// Generate Signed Cookies Function with CloudFront Signer using parameters
async function generateSignedCookies({ privateKey, keyPairId, url, dateLessThan }) {
  try {
    // Validate required parameters
    if (!privateKey || !keyPairId) {
      throw new Error('CLOUDFRONT_PRIVATE_KEY and CLOUDFRONT_KEY_PAIR_ID must be set');
    }
    if (!dateLessThan) {
      dateLessThan = Math.round(Date.now() / 1000) + 3600;
    } else {
      dateLessThan = Math.round(new Date(dateLessThan).getTime() / 1000);
    }
    if (!url) {
      throw new Error('URL must be set');
      //url = endpoint;
    }

    // Set expire time for cookies
    const expireTime = dateLessThan;

    // Create policy for signed cookies
    const policy = JSON.stringify({
      Statement: [
        {
          Resource: `https://${url}/*`, // Ensure this matches CloudFront behavior
          Condition: {
            DateLessThan: { "AWS:EpochTime": expireTime }
          }
        }
      ]
    });

    // Generate signed cookies using CloudFront Signer with private key and policy
    const cookies = getSignedCookies({
      keyPairId,
      privateKey,
      policy
    });

    // Return signed cookies
    return cookies;

    // Error handling
  } catch (error) {
    throw new Error(`Failed to generate signed cookies: ${error.message}`);
  }
}





// Start Express Server on Port 300
//app.listen(PORT, () => {
//  console.log(`Server is running on http://localhost:${PORT}`);
//});

module.exports = { generateSignedCookies };
