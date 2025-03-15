// getCourses.js
const { getUserCourses } = require('./Canvas_API');

(async () => {
  try {
    const userId = 1; // The Canvas user ID you want to fetch courses for
    const courses = await getUserCourses(userId);
    console.log('Courses for user', userId, courses);
  } catch (err) {
    console.error('Failed to get user courses:', err);
  }
})();
