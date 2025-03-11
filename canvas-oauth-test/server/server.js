require('dotenv').config();
const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');

const {
  CANVAS_BASE_URL,
  CANVAS_CLIENT_ID,
  CANVAS_CLIENT_SECRET,
  CANVAS_REDIRECT_URI,
  SESSION_SECRET,
  CANVAS_ACCOUNT_ID,
  CANVAS_ADMIN_TOKEN,
} = process.env;

// Create an Express app
const app = express();

// 1) Allow requests from our React dev server (http://localhost:3000)
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true, // Allow sending cookies/session
  })
);

// 2) Use sessions to store login state
app.use(
  session({
    secret: SESSION_SECRET || 'fallbacksecret',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(bodyParser.json()); // parse JSON body

// 3) Route: /oauth/login
// Login route: Redirect user to Canvas for OAuth
app.get('/oauth/login', (req, res) => {
  // The Canvas OAuth URL
  const authUrl = `${CANVAS_BASE_URL}/login/oauth2/auth?client_id=${CANVAS_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    CANVAS_REDIRECT_URI
  )}`;
  // Send the user to Canvas to log in
  res.redirect(authUrl);
});

// 4) Route: /oauth/callback
// OAuth callback: Canvas sends us ?code=... after the user logs in.
app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    // Exchange code for an access token
    const tokenRes = await axios.post(
      `${CANVAS_BASE_URL}/login/oauth2/token`,
      null,
      {
        params: {
          grant_type: 'authorization_code',
          client_id: CANVAS_CLIENT_ID,
          client_secret: CANVAS_CLIENT_SECRET,
          redirect_uri: CANVAS_REDIRECT_URI,
          code,
        },
      }
    );

    // Extract the access token from the response
    const { access_token } = tokenRes.data;

    // Store token in session
    req.session.canvasAccessToken = access_token;

    // (Optional) Fetch user info (like name, email, etc.) from Canvas
    const userRes = await axios.get(`${CANVAS_BASE_URL}/api/v1/users/self`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    req.session.user = userRes.data;

    // Redirect the user back to the React front-end (http://localhost:3000)
    res.redirect('http://localhost:3000');
  } catch (err) {
    console.error('OAuth callback error:', err.response?.data || err.message);
    res.status(500).send('OAuth Error');
  }
});

// 5) Route: /api/current_user
// Current user endpoint: A simple endpoint the React app can call to see if we're logged in.

app.get('/api/current_user', (req, res) => {
  if (req.session.user) {
    return res.json({ user: req.session.user });
  }
  return res.json({ user: null });
});

// 6) Route: /oauth/logout
// Logout: destroy session Then redirects back to the React front-end.
app.get('/oauth/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('http://localhost:3000');
  });
});

// --------------------------------------------------------------------------------------------
/**
 * POST /api/register
 * Receives user info from React, calls Canvas API to create a new user.
 */
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Canvas requires the user data nested under 'user' and 'pseudonym'.
    // Minimal fields to create a user:
    const body = {
      user: {
        name, // full name
        short_name: name, // or a shorter version
        sortable_name: name,
        // Optional: user[terms_of_use] = true, user[skip_registration] = false, etc.
      },
      pseudonym: {
        unique_id: email, // This is the Canvas login field (often an email)
        password, // If you want Canvas to store a password
        send_confirmation: false, // set to true if you want Canvas to email them
        force_validations: true, // require valid email, etc.
      },
      // Optional: 'communication_channel': {...}
      // to specify email/sms channel
    };

    // POST /api/v1/accounts/:account_id/users
    const url = `${CANVAS_BASE_URL}/api/v1/accounts/${CANVAS_ACCOUNT_ID}/users`;

    const response = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${CANVAS_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    // Canvas returns the created user object
    return res.json({
      success: true,
      canvasUser: response.data,
    });
  } catch (error) {
    console.error(
      'Error creating user:',
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

// Start server on port 3002
app.listen(3002, () => {
  console.log('Canvas OAuth server running on http://localhost:3002');
});
