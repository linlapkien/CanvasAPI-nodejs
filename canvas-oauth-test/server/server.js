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
  CMS_BASE_URL,
} = process.env;

// Create an Express app
const app = express();

// 1) Allow requests from our React dev server (http://localhost:3000)
app.use(
  cors({
    origin: CMS_BASE_URL,
    credentials: true, // Allow sending cookies/session
  })
);

// 2) Use sessions to store login state
app.use(
  session({
    secret: SESSION_SECRET,
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
    const userRes = await axios.get(
      `${CANVAS_BASE_URL}/api/v1/users/self/profile`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    req.session.user = { ...userRes.data, token: access_token };

    // Redirect the user back to the React front-end (http://localhost:3000)
    res.redirect(CMS_BASE_URL);
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
    res.redirect(CMS_BASE_URL);
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

// --------------------------------------------------------------------------------------------
/**
 * GET /api/users
 * Fetches list of users under an account
 */
app.get('/api/users', async (req, res) => {
  try {
    const url = `${CANVAS_BASE_URL}/api/v1/accounts/${CANVAS_ACCOUNT_ID}/users?per_page=100`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${CANVAS_ADMIN_TOKEN}`,
      },
    });

    return res.json({
      success: true,
      users: response.data,
    });
  } catch (error) {
    console.error(
      'Error fetching users:',
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

// --------------------------------------------------------------------------------------------
/**
 /**
 * PUT /api/profile/update
 * params: field (name, time_zone, pronouns), value
 * Updates Canvas profile using /self endpoint
 */
app.put('/api/profile/update', async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: 'Not authenticated' });

  const { field, value } = req.body;
  const token = req.session.canvasAccessToken;

  const validFields = ['name', 'time_zone', 'pronouns'];
  if (!validFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid field' });
  }

  const body = {
    user: {
      [field]: value,
    },
  };

  try {
    const response = await fetch(
      `${process.env.CANVAS_BASE_URL}/api/v1/users/self`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Canvas API Error (${response.status}):`, errorText);
      return res
        .status(response.status)
        .json({ error: 'Canvas API call failed', canvasError: errorText });
    }

    res.json(data);
  } catch (err) {
    console.error('Update failed:', err);
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

// --------------------------------------------------------------------------------------------
/**
 * GET /api/courses/all
 * params: state[], accountId
 * state[] (e.g. 'available', 'unpublished', 'completed', 'deleted'.)
 * Get ALL published courses under an account (accessible by both users & admins)
 */
app.get('/api/courses/all', async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: 'Not authenticated' });

  const token = process.env.CANVAS_ADMIN_TOKEN;
  const accountId = process.env.CANVAS_ACCOUNT_ID;

  const { state } = req.query;

  if (!token) {
    return res.status(500).json({ error: 'Missing Canvas Admin Token' });
  }

  const params = new URLSearchParams();
  if (state) {
    if (Array.isArray(state)) {
      state.forEach((s) => params.append('state', s));
    } else {
      params.append('state', state);
    }
  }

  // Add extra fields to the response
  const includes = [
    'teachers',
    'public_description',
    'course_image',
    'banner_image',
    'total_students',
  ];
  includes.forEach((field) => params.append('include[]', field));

  const endpoint = `${
    process.env.CANVAS_BASE_URL
  }/api/v1/accounts/${accountId}/courses?${params.toString()}`;

  params.append('per_page', '100'); // Pagination

  try {
    console.log(`Fetching courses from: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Canvas API call failed',
        canvasError: data,
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Failed to fetch courses:', err);
    res.status(500).json({ error: 'Fetch failed', details: err.message });
  }
});

/**
 * GET /api/users/:userId/courses
 * params: state[], userId
 * state[] (e.g. 'available', 'unpublished', 'completed', 'deleted'.)
 * Get active courses for a specific user with filters: state[]
 */
app.get('/api/users/:userId/courses', async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: 'Not authenticated' });

  const token = req.session.canvasAccessToken;
  const { userId } = req.params;
  const { state } = req.query;

  const params = new URLSearchParams();
  if (state) params.append('state', state);

  // Add extra fields to the response
  const includes = [
    'teachers',
    'public_description',
    'course_image',
    'banner_image',
    'total_students',
  ];
  includes.forEach((field) => params.append('include[]', field));

  try {
    const url = `${
      process.env.CANVAS_BASE_URL
    }/api/v1/users/${userId}/courses?${params.toString()}`;
    console.log('Canvas course URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: 'Canvas API call failed', canvasError: data });
    }

    res.json(data);
  } catch (err) {
    console.error('Failed to fetch user courses:', err);
    res.status(500).json({ error: 'Fetch failed', details: err.message });
  }
});

// --------------------------------------------------------------------------------------------
/**
 * POST /api/v1/courses/:course_id/enrollments
 * params: user_id, enrollment_type, course_id
 * enrollments: student, teacher, ta, observer
 * Enroll a user in a course by userid
 */
app.post('/api/v1/courses/:course_id/enrollments', async (req, res) => {
  const { user_id, enrollment_type } = req.body;
  const { course_id } = req.params;

  if (!user_id || !enrollment_type) {
    return res
      .status(400)
      .json({ error: 'User ID and enrollment type required' });
  }

  try {
    const enrollResponse = await axios.post(
      `${CANVAS_BASE_URL}/api/v1/courses/${course_id}/enrollments`,
      {
        enrollment: {
          user_id: user_id,
          type: enrollment_type,
          enrollment_state: 'active',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${CANVAS_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.json({
      message: 'User enrolled successfully',
      data: enrollResponse.data,
    });
  } catch (error) {
    console.error('Enrollment Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Canvas enrollment failed' });
  }
});

// Start server on port 3002
app.listen(3002, () => {
  console.log('Canvas OAuth server running on http://localhost:3002');
});
