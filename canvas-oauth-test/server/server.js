require('dotenv').config();
const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cors = require('cors');

const {
  CANVAS_BASE_URL,
  CANVAS_CLIENT_ID,
  CANVAS_CLIENT_SECRET,
  CANVAS_REDIRECT_URI,
  SESSION_SECRET,
} = process.env;

const app = express();

// 1) Allow requests from our React dev server (http://localhost:3000)
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
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

// 3) Login route: Redirect user to Canvas for OAuth
app.get('/oauth/login', (req, res) => {
  // The Canvas OAuth URL
  const authUrl = `${CANVAS_BASE_URL}/login/oauth2/auth?client_id=${CANVAS_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    CANVAS_REDIRECT_URI
  )}`;
  res.redirect(authUrl);
});

// 4) OAuth callback: Canvas sends us ?code=...
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

    const { access_token } = tokenRes.data;

    // Store token in session
    req.session.canvasAccessToken = access_token;

    // (Optional) Fetch the user profile
    const userRes = await axios.get(`${CANVAS_BASE_URL}/api/v1/users/self`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    req.session.user = userRes.data;

    // Redirect back to React front-end
    res.redirect('http://localhost:3000');
  } catch (err) {
    console.error('OAuth callback error:', err.response?.data || err.message);
    res.status(500).send('OAuth Error');
  }
});

// 5) Current user endpoint: check session
app.get('/api/current_user', (req, res) => {
  if (req.session.user) {
    return res.json({ user: req.session.user });
  }
  return res.json({ user: null });
});

// 6) Logout: destroy session
app.get('/oauth/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('http://localhost:3000');
  });
});

// Start server on port 3002
app.listen(3002, () => {
  console.log('Canvas OAuth server running on http://localhost:3002');
});
