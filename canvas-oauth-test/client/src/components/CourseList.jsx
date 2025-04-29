import { useState, useEffect } from 'react';
import {
  Typography,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import axios from 'axios';
import CourseCard from './CourseCard';

export default function CourseList({ userId = null }) {
  const [courses, setCourses] = useState([]);
  const [courseState, setCourseState] = useState('available');

  const handleGoToCourseButton = (courseId) => {
    window.location.href = `${process.env.REACT_APP_LMS_CANVAS_APP_URL_BASE}/courses/${courseId}`;
  };

  const handleEnrollUser = async (courseId) => {
    const userId = prompt('Enter the User ID to enroll:');
    if (!userId) return;

    try {
      await axios.post(
        `${process.env.REACT_APP_BE_CANVAS_API_URL_BASE}/api/v1/courses/${courseId}/enrollments`,
        {
          user_id: userId,
          enrollment_type: 'StudentEnrollment',
        },
        { withCredentials: true }
      );

      alert(`User ${userId} has been enrolled successfully!`);
    } catch (error) {
      console.error('Error enrolling user:', error);
      alert('Failed to enroll user.');
    }
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const params = new URLSearchParams();
        if (courseState && courseState !== 'all') {
          params.append('state', courseState);
        }

        const endpoint = userId
          ? `${process.env.REACT_APP_BE_CANVAS_API_URL_BASE}/api/users/${userId}/courses?${params}`
          : `${process.env.REACT_APP_BE_CANVAS_API_URL_BASE}/api/courses/all?${params}`;

        const { data } = await axios.get(endpoint, { withCredentials: true });
        console.log('Fetched courses:', data);
        setCourses(data);
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, [userId, courseState]);

  return (
    <div style={{ padding: '1rem' }}>
      {/* State Filter */}
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
            <CourseCard
              key={course.id}
              course={course}
              onGoToCourse={handleGoToCourseButton}
              onEnrollUser={handleEnrollUser}
            />
          ))
        ) : (
          <Typography>No courses found.</Typography>
        )}
      </Grid>
    </div>
  );
}
