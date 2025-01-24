const { getSignedUrl } = require('@aws-sdk/cloudfront-signer');
const express = require('express');
require('dotenv').config(); // Load environment variables from .env file



// CloudFront URL signer function
/**
 * Generates a signed URL for CloudFront.
 *
 * @param {Object} params - The parameters for generating the signed URL.
 * @param {string} params.cloudFrontDomain - The CloudFront URL to sign.
 * @param {string} params.privateKey - The private key for signing the URL.
 * @param {string} params.keyPairId - The key pair ID associated with the private key.
 * @param {number} [params.expiresIn=3600] - The expiration time of the signed URL in seconds (default is 1 hour).
 * @returns {Promise<string>} - A promise that resolves to the signed URL.
 * @throws {Error} - Throws an error if the signed URL generation fails.
 */


const app = express();
const port = process.env.PORT || 3000;

async function generateSignedUrl({cloudFrontDomain,object_key,privateKey,keyPairId,expiresIn = 3600}) {
  try {
    // Validate required parameters
    if (!privateKey || !keyPairId) {
      throw new Error('CLOUDFRONT_PRIVATE_KEY and CLOUDFRONT_KEY_PAIR_ID must be set');
    }
    if (!cloudFrontDomain) {
      throw new Error('URL must be set');
    }
    const signedUrl = getSignedUrl({
      url: `https://${cloudFrontDomain}/${object_key}`,
      keyPairId: keyPairId,
      privateKey: privateKey,
      dateLessThan: new Date(Date.now() + expiresIn * 1000).toISOString()
    });

    return signedUrl;
  } catch (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
}

//app.listen(port, () => {
//  console.log(`Server is running on port ${port}`);
//});
module.exports = { generateSignedUrl };