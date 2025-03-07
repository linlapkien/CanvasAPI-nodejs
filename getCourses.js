// getCourses.js
const { getCourses } = require('./Canvas_API');

(async function run() {
  try {
    const courses = await getCourses();
    console.log('Courses:', JSON.stringify(courses, null, 2));
  } catch (err) {
    console.error('Failed to fetch courses:', err.message);
  }
})();
