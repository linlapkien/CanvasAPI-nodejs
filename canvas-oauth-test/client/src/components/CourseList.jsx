import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Button, Grid } from '@mui/material';
import axios from 'axios';

export default function CourseList({ userId = null }) {
  const [courses, setCourses] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchCourses = async () => {
      const params = new URLSearchParams({ page });

      const endpoint = userId
        ? `http://localhost:3002/api/users/${userId}/courses?${params}`
        : `http://localhost:3002/api/courses/all?${params}`;

      try {
        const { data } = await axios.get(endpoint, { withCredentials: true });
        setCourses(data);
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, [page, userId]);

  const handleEnrollUser = async (courseId) => {
    const userId = prompt('Enter the User ID to enroll:');
    if (!userId) return;

    try {
      await axios.post(
        `http://localhost:3002/api/v1/courses/${courseId}/enrollments`,
        {
          user_id: userId,
          enrollment_type: 'StudentEnrollment',
        }
      );

      alert(`User ${userId} has been enrolled successfully!`);
    } catch (error) {
      console.error('Error enrolling user:', error);
      alert('Failed to enroll user.');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <Grid container spacing={2}>
        {courses.length > 0 ? (
          courses.map((course) => (
            <Grid item xs={12} sm={6} md={4} key={course.id}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">
                    {course.name || 'Unnamed Course'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ID: {course.id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start: {course.start_at}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Timezone: {course.time_zone}
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ marginTop: '8px' }}
                  >
                    View Course
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ marginTop: '8px' }}
                    onClick={() => handleEnrollUser(course.id)}
                  >
                    Enroll User
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Typography>No courses found.</Typography>
        )}
      </Grid>
    </div>
  );
}
