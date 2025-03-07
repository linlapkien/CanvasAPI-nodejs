// canvasApi.test.js
const {
  getUsers,
  getUserById,
  updateAccountName,
  getCourses,
  createCourse,
} = require('./Canvas_API');

describe('Canvas API Tests', () => {
  // Increase default test timeout (Canvas might take a moment)
  jest.setTimeout(10000);

  test('Should fetch list of users', async () => {
    const users = await getUsers(1); // accountId = 1
    console.log('Users:', JSON.stringify(users, null, 2));

    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    console.log('GET Users API Test Passed');
  });

  it('should update the account name', async () => {
    const accountId = 1;
    const newName = 'My New Test Name';
    const updatedAccount = await updateAccountName(accountId, newName);

    // Expect the response to have the new name
    expect(updatedAccount.name).toBe(newName);
    console.log('Update Account Test Passed');
  });

  test('Should fetch a user by ID', async () => {
    const userId = 3;
    const user = await getUserById(userId);

    //console.log('UserID 3:', JSON.stringify(user, null, 2));
    expect(user).toHaveProperty('id', userId);
    console.log(`GET User by ID ${userId} API Test Passed`);
  });

  it('should fetch the list of courses for the current user', async () => {
    const courses = await getCourses();
    console.log('Courses:', JSON.stringify(courses, null, 2));
    expect(Array.isArray(courses)).toBe(true);
    console.log('GET Courses Test Passed');
  });

  //   test('should create a new course', async () => {
  //     const accountId = 1;
  //     const courseData = {
  //       name: 'Test Course from Jest',
  //       course_code: 'TEST-COURSE',
  //       // Optional
  //       restrict_enrollments_to_course_dates: false,
  //     };

  //     const newCourse = await createCourse(accountId, courseData);
  //     expect(newCourse).toHaveProperty('id');
  //     expect(newCourse).toHaveProperty('name', courseData.name);
  //     console.log('Create Course Test Passed');
  //   });
});
