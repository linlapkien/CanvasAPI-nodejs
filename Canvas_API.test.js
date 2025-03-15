// canvasApi.test.js
const {
  getUsers,
  getUserById,
  updateAccountName,
  getUserCourses,
  createCourse,
  getAccountCourses,
} = require('./Canvas_API');

describe('Canvas API Tests', () => {
  // Increase default test timeout (Canvas might take a moment)
  jest.setTimeout(10000);

  // 1) Fetch Users in an Account
  //GET /api/v1/accounts/:account_id/users
  test('Should fetch list of users in ascending order by id', async () => {
    const accountId = 1;
    const users = await getUsers(accountId); // e.g. calls /api/v1/accounts/1/users

    // Manually sort by 'id' ascending
    users.sort((a, b) => a.id - b.id);

    // Uncomment to see the list of users
    // console.log(
    //   `Users from account ${accountId} (sorted by id):`,
    //   JSON.stringify(users, null, 2)
    // );

    expect(Array.isArray(users)).toBe(true);

    console.log('GET Users (sorted by id) API Test Passed');
  });

  // 2) Update an account name in Canvas
  // PUT /api/v1/accounts/:id
  // it('should update the account name', async () => {
  //   const accountId = 1;
  //   const newName = 'My New Test Name';
  //   const updatedAccount = await updateAccountName(accountId, newName);

  //   // Expect the response to have the new name
  //   expect(updatedAccount.name).toBe(newName);
  //   console.log('Update Account Test Passed');
  // });

  // 3) Fetch a user by ID
  // GET /api/v1/users/:user_id
  test('Should fetch a user by ID', async () => {
    const userId = 8;
    const user = await getUserById(userId);

    //console.log(`UserID ${userId}:`, JSON.stringify(user, null, 2));
    expect(user).toHaveProperty('id', userId);
    console.log(`GET User by ID ${userId} API Test Passed`);
  });

  // 4) Create a new course
  // POST /api/v1/accounts/:account_id/courses
  // test('Should create a new course', async () => {
  //   const accountId = 1; // accountId = 1 is admin (if non admin, it wont have permission to create course)
  //   const courseData = {
  //     name: 'Create Course F',
  //     course_code: 'TEST-COURSE-F',
  //     // Optional
  //     restrict_enrollments_to_course_dates: false,
  //   };

  //   const newCourse = await createCourse(accountId, courseData);
  //   expect(newCourse).toHaveProperty('id');
  //   expect(newCourse).toHaveProperty('name', courseData.name);
  //   console.log('Create Course Test Passed');
  // });

  // 5) Fetch courses for a user by ID
  // GET /api/v1/users/:user_id/courses
  test('Should fetch courses for a user by ID', async () => {
    const userId = 8; // Adjust to a user who has at least 1 course
    const courses = await getUserCourses(userId);

    // Uncomment to see the list of courses
    // console.log(
    //   `Courses for user ${userId}:`,
    //   JSON.stringify(courses, null, 2)
    // );
    expect(Array.isArray(courses)).toBe(true);

    console.log(`GET User Courses by ID ${userId} API Test Passed`);
  });

  // 6) Fetch all courses in an account
  // GET /api/v1/accounts/:account_id/courses
  test('Should fetch all courses in an account', async () => {
    const accountId = 1; // Adjust if needed
    const courses = await getAccountCourses(accountId);

    // Uncomment to see the list of courses
    // console.log(
    //   `Courses from account ${accountId}:`,
    //   accountId,
    //   JSON.stringify(courses, null, 2)
    // );
    expect(Array.isArray(courses)).toBe(true);

    console.log('✅ GET Account Courses Test Passed');
  });
});
