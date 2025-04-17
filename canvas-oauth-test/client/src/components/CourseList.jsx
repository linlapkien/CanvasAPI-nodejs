import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import axios from 'axios';

export default function CourseList({ userId = null }) {
  const [courses, setCourses] = useState([]);
  const [page, setPage] = useState(1);
  const [courseState, setCourseState] = useState('available'); // Default state

  // Go to Course button
  const handleGoToCourseButton = (courseId) => {
    window.location.href = `http://localhost:32769/courses/${courseId}`;
  };

  useEffect(() => {
    const fetchCourses = async () => {
      const params = new URLSearchParams({ page });
      if (courseState) params.append('state', courseState); // Add state filter

      const endpoint = userId
        ? `http://localhost:3002/api/users/${userId}/courses?${params}`
        : `http://localhost:3002/api/courses/all?${params}`;

      try {
        const { data } = await axios.get(endpoint, { withCredentials: true });
        console.log('Fetched courses:', data);
        setCourses(data);
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, [page, userId, courseState]);

  //  Function to enroll a user by user ID
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
      {/* State Filter Dropdown */}
      <FormControl sx={{ minWidth: 200, marginBottom: '1rem' }}>
        <InputLabel>Course State</InputLabel>
        <Select
          value={courseState}
          onChange={(e) => setCourseState(e.target.value)}
        >
          <MenuItem value="all">ALL</MenuItem>
          <MenuItem value="available">Available</MenuItem>
          <MenuItem value="unpublished">Unpublished</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="deleted">Deleted</MenuItem>
        </Select>
      </FormControl>

      {/* Course List */}
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
                  <Typography variant="body2" color="text.secondary">
                    Status: {course.workflow_state}
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ marginTop: '8px' }}
                    onClick={() => handleGoToCourseButton(course.id)}
                  >
                    Go to Course
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
