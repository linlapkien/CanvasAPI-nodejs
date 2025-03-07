// createCourse.js
const { createCourse } = require('./Canvas_API');

(async function run() {
  try {
    const accountId = 3; // account ID

    const courseData = {
      name: 'My New Course D',
      course_code: 'Course D',
      // Optional fields
      start_at: '2025-03-10T01:00:00Z',
      end_at: '2025-06-01T01:00:00Z',
      license: 'private',
      is_public: true,
      // This must be true if you want Canvas to honor start/end dates
      restrict_enrollments_to_course_dates: true,
    };

    const newCourse = await createCourse(accountId, courseData);
    console.log('Course Created Successfully:', newCourse);
  } catch (err) {
    console.error('Failed to create course:', err.message);
  }
})();
