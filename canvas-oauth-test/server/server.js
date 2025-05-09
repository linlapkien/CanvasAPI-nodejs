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

// ------------------------ System Routes ------------------------
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

  if (!token || !accountId) {
    return res
      .status(500)
      .json({ error: 'Missing Canvas Admin Token or Account ID' });
  }

  const params = new URLSearchParams();
  if (state) {
    if (Array.isArray(state)) {
      state.forEach((s) => params.append('state', s));
    } else {
      params.append('state', state);
    }
  }

  params.append('per_page', '10');

  const includes = [
    'teachers',
    'public_description',
    'course_image',
    'banner_image',
    'total_students',
  ];
  includes.forEach((field) => params.append('include[]', field));

  let allCourses = [];
  let nextUrl = `${
    process.env.CANVAS_BASE_URL
  }/api/v1/accounts/${accountId}/courses?${params.toString()}`;

  try {
    while (nextUrl) {
      console.log('Fetching courses from:', nextUrl);

      const response = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: 'Canvas API call failed',
          canvasError: data,
        });
      }

      allCourses.push(...data);

      // Handle pagination
      const linkHeader = response.headers.get('link');
      const links = {};
      if (linkHeader) {
        linkHeader.split(',').forEach((part) => {
          const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
          if (match) {
            const [, url, rel] = match;
            links[rel] = url;
          }
        });
      }

      nextUrl = links.next || null;
    }

    res.json(allCourses);
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

// --------------------------------------------------------------------------------------------
/**
 * GET /api/courses/with-price
 * Get ALL available Canvas courses under an account that also have a price (accessible by users/clients)
 */
app.get('/api/courses/with-price', async (req, res) => {
  // 1. Check authentication
  if (!req.session.user)
    return res.status(401).json({ error: 'Not authenticated' });

  // 2. Load required configs
  const token = process.env.CANVAS_ADMIN_TOKEN;
  const accountId = process.env.CANVAS_ACCOUNT_ID;
  const djangoBaseURL = process.env.DJANGO_BASE_URL;

  if (!token || !accountId || !djangoBaseURL) {
    return res.status(500).json({ error: 'Missing required configuration' });
  }

  // 3. Build query params
  // Fetch only published courses
  const params = new URLSearchParams();
  params.append('state', 'available'); // fetch only published courses
  params.append('per_page', '10'); // limit to 10 courses per page

  const includes = [
    'teachers',
    'public_description',
    'course_image',
    'banner_image',
    'total_students',
  ];
  includes.forEach((field) => params.append('include[]', field));

  let allCourses = [];
  let nextUrl = `${
    process.env.CANVAS_BASE_URL
  }/api/v1/accounts/${accountId}/courses?${params.toString()}`;

  try {
    // 4. Fetch paginated courses from Canvas
    while (nextUrl) {
      console.log('Fetching courses from:', nextUrl);

      const response = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: 'Canvas API call failed',
          canvasError: data,
        });
      }

      allCourses.push(...data);

      const linkHeader = response.headers.get('link');
      const links = {};
      if (linkHeader) {
        linkHeader.split(',').forEach((part) => {
          const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
          if (match) {
            const [, url, rel] = match;
            links[rel] = url;
          }
        });
      }

      nextUrl = links.next || null;
    }

    // 5. Filter courses with price info from Django
    const coursesWithPrice = [];

    await Promise.all(
      allCourses.map(async (course) => {
        try {
          const priceRes = await fetch(
            `${djangoBaseURL}/api/course/price/${course.id}`,
            {
              method: 'GET',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            }
          );

          if (priceRes.ok) {
            const priceData = await priceRes.json();
            if (priceData?.price) {
              course.price = priceData.price; // attach price
              coursesWithPrice.push(course);
            }
          }
        } catch (err) {
          console.warn(`⚠️ Failed to fetch price for course ${course.id}`);
        }
      })
    );

    // 6. Return results
    return res.json(coursesWithPrice);
  } catch (err) {
    console.error('Failed to fetch courses:', err);
    return res
      .status(500)
      .json({ error: 'Fetch failed', details: err.message });
  }
});

// --------------------------------------------------------------------------------------------
/**
 * GET /api/checkCanvasAdmin
 * Fetch all Canvas admins under
 */
app.get('/api/checkCanvasAdmin', async (req, res) => {
  const accountId = process.env.CANVAS_ACCOUNT_ID; // e.g., 1
  const userId = req.query.user_id; // e.g., /api/checkCanvasAdmin?user_id=1

  // Check if userId is provided
  if (!userId) {
    return res.status(400).json({ error: 'Missing user_id parameter' });
  }

  try {
    const url = `${process.env.CANVAS_BASE_URL}/api/v1/accounts/${accountId}/admins`;

    const params = new URLSearchParams();
    params.append('user_id[]', userId); // Canvas expects array-style query param, but i modify it to a string - which can be handle for check Canvas admins

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${CANVAS_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      params,
    });

    // console.log('Admins:', response.data);
    // res.status(200).json(response.data); // Return data to client

    // Check if the returned admins include this user
    const isAdmin =
      Array.isArray(response.data) &&
      response.data.some(
        (admin) => admin.user?.id?.toString() === userId.toString()
      );

    res.status(200).json({ isAdmin });
  } catch (error) {
    console.error(
      'Error fetching admins:',
      error.response?.data || error.message
    );
    res.status(500).json({
      error: 'Failed to fetch admins',
      details: error.response?.data || error.message,
    });
  }
});

// Start server on port 3002
app.listen(3002, () => {
  console.log('Canvas OAuth server running on http://localhost:3002');
});

// --------------------------------------------------------------------------------------------
//Load Stripe for Payment
const Stripe = require('stripe');
const crypto = require('crypto'); // for generating unique temp IDs for rd transaction_id
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

// Endpoint to create a checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  const { items, user_email } = req.body;

  // console.log('Received items:', items);

  // Make sure items are provided
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No items in the cart' });
  }

  // Check if user_email is exist
  if (!user_email) {
    return res.status(400).json({ error: 'User not logged in' });
  }

  try {
    // Format line items based on the cart
    const line_items = items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title, // assuming item has a title
        },
        unit_amount: Math.round(item.price * 100), // Stripe expects amounts in cents
      },
      quantity: 1, // Assuming quantity is 1, you can adjust this if needed
    }));

    // Create temp transaction IDs for localStorage or later updating
    const tempTransactionMap = [];

    // Create payments in Django for each item
    for (const item of items) {
      // Generate a unique temp transaction ID
      const temp_transaction_id = `PMT-temp-${crypto
        .randomBytes(2)
        .toString('hex')}`; // e.g. PMT-temp-a1b2
      tempTransactionMap.push({
        course_name: item.title,
        temp_transaction_id,
      });

      await axios.post(
        `${process.env.DJANGO_BASE_URL}/api/payment/create/`,
        {
          transaction_id: temp_transaction_id,
          price: item.price.toString(),
          status: 'fail',
          user_email,
          course_name: item.title,
          amount_of_course: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${CANVAS_ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      success_url: `${process.env.CMS_BASE_URL}/payment-success`,
      cancel_url: `${process.env.CMS_BASE_URL}/cancel`,
    });

    // console.log('Checkout session created:', session.id);
    // console.log('Checkout session:', session);
    // Send the session ID back to the frontend
    res.json({
      sessionId: session.id,
      tempTransactionMap, // frontend will use this to update real transaction later
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to retrieve session details via stripe
app.get('/api/get-session', async (req, res) => {
  const sessionId = req.query.session_id;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to handle synchronization user from Canvas to CMS Django
app.get('/api/sync-canvas-to-cms', async (req, res) => {
  try {
    const canvasUserResponse = await axios.get(
      `http://localhost:3002/api/users`,
      {
        headers: {
          Authorization: `Bearer ${CANVAS_ADMIN_TOKEN}`,
        },
      }
    );

    const users = canvasUserResponse.data;

    for (const user of users) {
      const payload = {
        email: user.login_id,
        canvas_user_id: user.id,
        bio: null,
      };

      try {
        await axios.post(
          `${process.env.DJANGO_BASE_URL}/api/user/create/`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(`Synced user: ${user.name} (Canvas ID: ${user.id})`);
      } catch (err) {
        console.error(
          `Failed to sync ${user.name}:`,
          err.response?.data || err.message
        );
      }
    }

    res.status(200).json({ message: 'All users synced successfully.' });
  } catch (error) {
    console.error('Error fetching Canvas users:', error.message);
    res.status(500).json({ error: 'Failed to sync users' });
  }
});

/// Endpoint to enroll user to course after payment success
app.post('/api/payment-success/enroll-to-course', async (req, res) => {
  try {
    const { user_email, cartForPayment, transaction_id, user_id } = req.body;

    // Check if user_email is exist
    if (!user_email) {
      return res.status(400).json({ error: 'User not logged in' });
    }
    // Check if cartForPayment is exist
    if (!cartForPayment || !Array.isArray(cartForPayment)) {
      return res.status(400).json({ error: 'No payments yet' });
    }
    // Check if transaction_id is exist
    if (!transaction_id) {
      return res.status(400).json({ error: 'No transaction ID' });
    }
    // Check if user_id is exist
    if (!user_id) {
      return res.status(400).json({ error: 'No user ID provided' });
    }

    // console.log('cartForPayment:', cartForPayment);

    // Loop over each course and handle enrollment
    const enrollmentResults = await Promise.all(
      cartForPayment.map(async (course) => {
        console.log('course:', course);
        console.log('user_email:', user_email);
        console.log('transaction_id:', transaction_id);

        console.log('CheckPoint 1');

        // Step 1: Create enrollment_course record in Django
        await axios.post(
          `http://localhost:8000/api/enrollment_course/create/`,
          {
            enrollment_status: 'enrolled',
            user_email: user_email,
            course_name: course.title,
            payment_transaction_id: transaction_id,
          },
          {
            headers: {
              Authorization: `Bearer ${CANVAS_ADMIN_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('CheckPoint 2');
        const courseId = course.id;

        // Step 2: Enroll user into Canvas course
        await axios.post(
          `http://localhost:3002/api/v1/courses/${courseId}/enrollments`,
          {
            user_id,
            enrollment_type: 'StudentEnrollment',
          }
        );
        console.log('CheckPoint 3');
      })
    );

    return res
      .status(200)
      .json({ message: 'Enrollment successful', results: enrollmentResults });
  } catch (error) {
    console.error('Enrollment error:', error.message);
    return res.status(500).json({ error: 'Enrollment process failed' });
  }
});

// --------------------------------------------------------------------------------------------
// sending email contact-us
const nodemailer = require('nodemailer');

/**
 * POST /api/contact/send
 * Gửi email từ form liên hệ (React)
 */
app.post('/api/contact/send', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    // Tạo transporter gửi mail bằng Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    // Email Content - User will receive this.
    const mailOptions = {
      from: process.env.CONTACT_RECEIVER,
      to: `"${name}" <${email}>`,
      subject: `📩 Thank you for submitting to Ref.Team`,
      html: `
        <p>Hi ${name},<br>
        Thanks for getting in touch with Ref.Team's support team! This is an auto-reply confirming that your inquiry has been received.
        <br>Our regular office hours are <b>9 am - 6 pm (Singapore Time - GTM+8), Monday - Friday </b> and we aim to have all inquiries responded to within 24 hours of receiving the request.
        <br>Here's a summary of the information you provided:
        <pre style="font-size: 15px">
        <strong>Name:</strong> ${name}
        <strong>Email:</strong> ${email}
        <strong>Message:</strong>
        ${message.replace(/\n/g, '<br>')}
        </pre>
        <br>Now that you've submitted your information to us, our team will contact you as soon as possible.
        <br>If you want to see more our services. Please visit <a href="https://ref.team/appointments/" target="_blank">site</a>
        <br><br>Regards,<br>
        Ref.Team</p>
        <br>
        <p style="color: gray; font-size: 12px;">Please do not reply to this message; it was automatically generated, and replies will not be read.<br>Copyright @ 2025 Ref.Team </p>
      `,
    };

    // Email Content - Ref.team will receive this.
    const companymailOptions = {
      from: `"${name}" <${email}>`,
      replyTo: email,
      to: process.env.CONTACT_RECEIVER,
      subject: `📬 New Contact Submission from ${name}`,
      html: `
        <p>You have a new contact form submission:
        <br><br>Here's a summary of the information that ${name} has provided:
        <pre style="font-size: 15px">
        <strong>Name:</strong> ${name}
        <strong>Email:</strong> ${email}
        <strong>Message:</strong>
        ${message.replace(/\n/g, '<br>')}
        </pre>
        <br><p style="color: gray; font-size: 12px;">Ref.Team Auto Notification<br>Do not reply to this email.</p>
      `,
    };

    // Send Email to users
    await transporter.sendMail(mailOptions);

    // auto notification to ref.team when users submitted.
    await transporter.sendMail(companymailOptions);

    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ success: false, error: 'Email sending failed' });
  }
});
