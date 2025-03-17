// getAccountCourses.js
const { canvasClient, getAccountCourses } = require('./Canvas_API');

(async function run() {
  try {
    // accountId = 1 is Canvasadmin@gmail.com Account
    const accountId = 1;
    const courses = await getAccountCourses(accountId);

    console.log('Testing baseURL connectivity...');
    const ping = await canvasClient.get('/accounts');
    console.log('Base URL works:', ping.status);

    console.log(
      `Courses in account #${accountId}:`,
      JSON.stringify(courses, null, 2)
    );
  } catch (err) {
    console.error('Failed to fetch account courses:', err.message);
  }
})();
