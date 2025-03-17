// canvasApi.js
const axios = require('axios');
require('dotenv').config(); // loads .env into process.env

const CANVAS_API_URL = process.env.CANVAS_API_URL;
const CANVAS_ACCESS_TOKEN = process.env.CANVAS_ACCESS_TOKEN;

// Create an Axios instance with default config
const canvasClient = axios.create({
  baseURL: CANVAS_API_URL,
  timeout: 10000, // 10 seconds
  headers: {
    Authorization: `Bearer ${CANVAS_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Get Users from Canvas by Account ID
 * GET /api/v1/accounts/:account_id/users
 * @param {number|string} accountId
 * @returns {Promise<Array>} list of user objects
 */
async function getUsers(accountId) {
  try {
    const response = await canvasClient.get(`/accounts/${accountId}/users`);
    return response.data; // Canvas returns JSON array
  } catch (error) {
    console.error(
      'Error fetching users:',
      error.response?.status,
      error.response?.data
    );
    throw error;
  }
}

/**
 * Get a Single User by ID
 * GET /api/v1/users/:user_id
 * @param {number|string} userId
 * @returns {Promise<Object>} user object
 */
async function getUserById(userId) {
  try {
    const response = await canvasClient.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(
      'Error fetching user:',
      error.response?.status,
      error.response?.data
    );
    throw error;
  }
}

/**
 * Update an account name in Canvas
 * PUT /api/v1/accounts/:id
 * The body must be { account: { name: "New Name" } }
 * @param {number|string} accountId - The account ID you want to update
 * @param {string} newAccountName - The new name for the account
 * @returns {Promise<Object>} - Updated account object
 */
async function updateAccountName(accountId, newAccountName) {
  try {
    const response = await canvasClient.put(`/accounts/${accountId}`, {
      account: {
        name: newAccountName,
      },
    });
    return response.data; // The updated account info
  } catch (error) {
    console.error(
      'Error updating account:',
      error.response?.data || error.message
    );
    throw error;
  }
}

/**
 * Get all courses for the current user(enrollments).
 * @returns {Promise<Array>} Array of course objects.
 */
async function getCourses() {
  try {
    const response = await canvasClient.get('/courses');
    return response.data; // Canvas returns a JSON array of courses
  } catch (error) {
    console.error(
      'Error fetching courses:',
      error.response?.status,
      error.response?.data
    );
    throw error;
  }
}

/**
 * Helper to parse Canvas "Link" headers and find the "next" page URL.
 * @param {string} linkHeader - The raw Link header from Canvas.
 * @returns {string|null} - The next page URL or null if none.
 */
function parseNextUrl(linkHeader) {
  if (!linkHeader) return null;
  // Example Link header:
  // <https://canvas/api/v1/accounts/3/courses?page=2&per_page=100>; rel="next",
  // <https://canvas/api/v1/accounts/3/courses?page=1&per_page=100>; rel="current"
  const links = linkHeader.split(',');
  for (const link of links) {
    const match = link.match(/<(.*)>; rel="next"/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Fetches **all courses** in a given account, handling pagination automatically.
 * GET /api/v1/accounts/:account_id/courses = all courses in that account (requires admin permissions).
 *
 * @param {number|string} accountId - The ID of the Canvas account.
 * @param {number} [perPage=100] - Number of courses per page (Canvas default is 10).
 * @returns {Promise<Array>} Array of all courses in the account.
 */
async function getAccountCourses(accountId, perPage = 100) {
  if (!accountId) {
    throw new Error('No accountId provided to getAccountCourses()');
  }

  let endpoint = `/accounts/${accountId}/courses?per_page=${perPage}`;
  let allCourses = [];

  try {
    while (endpoint) {
      const response = await canvasClient.get(endpoint);
      // Merge the courses from this page
      allCourses = allCourses.concat(response.data);

      // Check the response headers for a Link header to find the next page
      const linkHeader = response.headers.link || response.headers.Link;
      endpoint = parseNextUrl(linkHeader);
    }

    return allCourses;
  } catch (error) {
    const { response } = error;
    console.error('Error fetching account courses:');
    if (response) {
      console.error('Status:', response.status, response.statusText);
      console.error('Data:', response.data);
    } else {
      console.error('Message:', error.message);
    }
    throw error;
  }
}

/**
 * Fetches **all courses** for a given user, handling pagination automatically.
 *
 * GET /api/v1/users/:user_id/courses (requires admin or observer permissions).
 *
 * @param {number|string} userId - The ID of the Canvas user.
 * @param {number} [perPage=100] - Number of courses per page (Canvas default is 10).
 * @returns {Promise<Array>} Array of all courses for that user.
 */
async function getUserCourses(userId, perPage = 100) {
  if (!userId) {
    throw new Error('No userId provided to getUserCourses()');
  }

  // Starting endpoint
  let endpoint = `/users/${userId}/courses?per_page=${perPage}`;
  let allCourses = [];

  try {
    while (endpoint) {
      const response = await canvasClient.get(endpoint);
      // Merge the courses from this page
      allCourses = allCourses.concat(response.data);

      // Check the response headers for a Link header to find the next page
      const linkHeader = response.headers.link || response.headers.Link;
      endpoint = parseNextUrl(linkHeader);
    }

    return allCourses;
  } catch (error) {
    const { response } = error;
    console.error('Error fetching user courses:');
    if (response) {
      console.error('Status:', response.status, response.statusText);
      console.error('Data:', response.data);
    } else {
      console.error('Message:', error.message);
    }
    throw error;
  }
}

/**
 * Create a new course in a given account.
 *
 * @param {number|string} accountId - The account ID where the course will be created
 * @param {Object} courseData - An object containing course fields:
 *   @property {string} name - The name of the course
 *   @property {string} course_code - The course code
 *   @property {string} [start_at] - Course start date
 *   @property {string} [end_at] - Course end date
 *   @property {string} [license] - The license abbreviation, e.g. "private", "cc_by_nc_sa"
 *   @property {boolean} [is_public] - Whether the course is public
 *   @property {boolean} [restrict_enrollments_to_course_dates] - Whether to enforce the start/end dates
 * @returns {Promise<Object>} - Returns the newly created course object
 */
async function createCourse(accountId, courseData) {
  try {
    // Construct request body
    // The Canvas API requires the course fields to be nested under "course"
    const body = {
      course: {
        ...courseData,
      },
    };

    // POST /api/v1/accounts/:account_id/courses
    const response = await canvasClient.post(
      `/accounts/${accountId}/courses`,
      body
    );
    return response.data; // Returns the created course object
  } catch (error) {
    console.error(
      'Error creating course:',
      error.response?.status,
      error.response?.data
    );
    throw error;
  }
}

module.exports = {
  canvasClient,
  getUsers,
  getUserById,
  updateAccountName,
  getCourses,
  createCourse,
  getAccountCourses,
  getUserCourses,
};
