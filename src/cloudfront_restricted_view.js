const path = require('path'); // Import the path module to work with file and directory paths like html files
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const axios = require('axios'); // Makes HTTP requests
const express = require('express'); // Used for creating the application level web server
const session = require('express-session');  // Used for session management for express
const { generateSignedCookies } = require('./cloudfront_signed_cookies'); // Import the generateSignedCookies function from the cloudFront_SignedCookiesGenerator.js file
const { generateSignedUrl } = require('./cloudfront_signed_url'); // Import the generateSignedUrl function from the cloudFront_SignedUrlGenerator.js file
const app = express(); // Create an express application that will handle the requests

app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies
app.use(session({ // Middleware to manage sessions
  secret: process.env.SESSION_SECRET || 'ADD_SECRET_PASSWORD', // Secret used to sign the session ID cookie
  resave: false, // Forces the session to be saved back to the session store
  saveUninitialized: true, // Forces a session that is "uninitialized" to be saved to the store
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Serve index.html at the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './pages/index.html'));
});

// Handle form data submission
app.post('/', (req, res) => {
  const { domain, object_key, date } = req.body;
  // Store the input values in a session or use them directly
  req.session.domain = domain;
  req.session.object_key = object_key;
  req.session.date = date || "2026-01-01";
  res.redirect('/cookie_or_signedurl');
});

// Serve cookie_or_signedurl.html at the /cookie_or_signedurl path. Used to choose between signed cookies and signed URLs
app.get('/cookie_or_signedurl', (req, res) => {
  res.sendFile(path.join(__dirname, './pages/cookie_or_signedurl.html'));
});

// Serve cookie.html at the /cookie path. Used to test signed cookies in the browser
app.get('/cookie', (req, res) => {
  res.sendFile(path.join(__dirname, './pages/cookie.html'));
});

/* The following paths test
   different scenarios for the signed cookies and signed urls */

// [1] Triggers generateSignedCookies function to generate a cookie, then makes a request to endpoint using the genetated signed cookie and sets it as cookie Headers.
app.get('/bakemycookie', async (req, res) => {
  try {
    const { domain, object_key, date } = req.session;

    // Parameters for the signed cookies to be generated for the given cloudfront domain
    const params = {
      url: `${domain}`,
      privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
      keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
      dateLessThan: date
    };
    // Let generateSignedCookies generate the signed cookies using the parameters
    const cookies = await generateSignedCookies(params);

    // Set CloudFront cookies in the response headers. This will set the cookies in the browser.
    res.setHeader('Set-Cookie', [
      `CloudFront-Key-Pair-Id=${cookies['CloudFront-Key-Pair-Id']}; Path=/; Secure; HttpOnly`,
      `CloudFront-Policy=${cookies['CloudFront-Policy']}; Path=/; Secure; HttpOnly`,
      `CloudFront-Signature=${cookies['CloudFront-Signature']}; Path=/; Secure; HttpOnly`
    ]);

    // The endpoint to request the object from CloudFront  
    const url = `https://${domain}/${object_key}`;
    console.log('Requesting URL:', url);

    // Make a request to the endpoint with the signed cookies using the set Cookie header
    const response = await axios.get(url, {
      headers: {
        'Cookie': [
          `CloudFront-Key-Pair-Id=${cookies['CloudFront-Key-Pair-Id']}`,
          `CloudFront-Policy=${cookies['CloudFront-Policy']}`,
          `CloudFront-Signature=${cookies['CloudFront-Signature']}`
        ].join('; ')
      },
      responseType: 'arraybuffer'
    });

    // Get the content type from the response headers before returning the response data
    const contentType = response.headers['content-type'];
    res.set('Content-Type', contentType);

    // Return the response data from the web.
    res.send(response.data);
  } 
  
  // Error handling
  catch (error) {
    console.error('Error making request:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
    }
    res.status(500).json({ error: error.message });
  }
});

// [2] Triggers generateSignedCookies function to generate a cookie then makes a request to endpoint using the genetated signed cookie wihtout setting it as cookie Headers.
app.get('/bakemycookiewithoutheaders', async (req, res) => {
  try {
    // Get the domain, object_key, and date from the session
    const { domain, object_key, date } = req.session;

    // Parameters for the signed cookies to be generated
    const params = {
      url: `${domain}`,
      privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
      keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
      dateLessThan: date
    };
    // Let generateSignedCookies generate the signed cookies using the parameters
    const cookies = await generateSignedCookies(params);

    // Convert the cookies object [key: value, key2:value2] into a string that can be used in the Cookie header [key=value; key2=value2]
    const cookieHeader = Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');

    // The URL to request the object from CloudFront  
    const url = `https://${domain}/${object_key}`;
    console.log('Requesting URL:', url);
    console.log('Cookie Header:', cookieHeader);

    // Make a request to the URL with the signed cookies using the Cookie header without setting it as a cookie header in the browser
    const response = await axios.get(url, {
      headers: {
        'Cookie': cookieHeader
      },
      responseType: 'arraybuffer'
    });

    // Get the content type from the response headers  before returning the response data
    const contentType = response.headers['content-type'];
    res.set('Content-Type', contentType);

    // Return the response data from the web.
    res.send(response.data);
  } 
  
  // Error handling
  catch (error) {
    console.error('Error making request:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
    }
    res.status(500).json({ error: error.message });
  }
});

// [3] Generates signed cookies and returns a curl command to test signed cookies manually
app.get('/curlmycookie', async (req, res) => {
  try {
    const { domain, object_key, date } = req.session;
    const params = {
      url: `${domain}`,
      privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
      keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
      dateLessThan: date
    };
    // Let generateSignedCookies generate the signed cookies using the parameters
    const cookies = await generateSignedCookies(params);

    // Log generated cookies
    const curlCommand = `curl -v -X GET "${domain}/${object_key}" -H "Cookie: CloudFront-Policy=${cookies['CloudFront-Policy']};\nCloudFront-Signature=${cookies['CloudFront-Signature']};\nCloudFront-Key-Pair-Id=${cookies['CloudFront-Key-Pair-Id']}"`;
    console.log('Debugging Curl Command: \n', curlCommand);

    // Return the curl command to test the signed cookies manually
    res.setHeader('Content-Type', 'text/plain');
    res.send(`Use this curl command to fetch the request:\r\n\r\n${curlCommand}`);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// [4] Generates signed cookies and returns them in the response and sets them as cookies headers in the browser
app.get('/returnmycookie', async (req, res) => {
  try {
    const { domain, object_key, date } = req.session;
    const params = {
      url: `${domain}`,
      privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
      keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
      dateLessThan: date
    };

    // Let generateSignedCookies generate the signed cookies using the parameters
    const cookies = await generateSignedCookies(params);

    console.log('Loaded Env Variables:', {
      keyPairId: params.keyPairId,
      privateKeyLoaded: !!params.privateKey
    });

    // Log generated cookies
    console.log('Generated Signed Cookies:', cookies);

    // Set CloudFront cookies as headers in the response. This will set the cookies in the browser.
    res.setHeader('Set-Cookie', [
      `CloudFront-Key-Pair-Id=${cookies['CloudFront-Key-Pair-Id']}; Path=/; Secure; HttpOnly`,
      `CloudFront-Policy=${cookies['CloudFront-Policy']}; Path=/; Secure; HttpOnly`,
      `CloudFront-Signature=${cookies['CloudFront-Signature']}; Path=/; Secure; HttpOnly`
    ]);

    // Return signed cookies in the response body and set them as cookies in the browser
    res.json({
      message: 'CloudFront cookies set successfully. \nCheck the cookies in the response headers. or in the browser console.',
      cookies
    });

    // Error handling
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// [5] Generates signed URL and returns it in the response
app.get('/encrypturl', async (req, res) => {
  try {
    // Get the domain, object_key, and date from the session
    const { domain, object_key, date } = req.session;

    // Parameters for the signed URL to be generated. The URL will expire after the given date and should use object_key as the object to be accessed, consideering signed URL is used for accessing individual objects.
    const params = {
      object_key: object_key,
      cloudFrontDomain: domain,
      privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
      keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
      //expiresIn: expiresIn || 3600
    };

    if (!params.privateKey || !params.keyPairId) {
      return res.status(400).json({ error: 'Environment variables CLOUDFRONT_PRIVATE_KEY and CLOUDFRONT_KEY_PAIR_ID must be set' });
    }

    // Let generateSignedUrl generate the signed URL using the parameters
    const signedUrl = await generateSignedUrl(params);

    // Return the signed URL in the response body
    res.setHeader('Content-Type', 'text/plain');
    res.send(`This is your cloudfront signed URL:\r\n\r\n${signedUrl}`);

    // Error handling
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Strating the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});