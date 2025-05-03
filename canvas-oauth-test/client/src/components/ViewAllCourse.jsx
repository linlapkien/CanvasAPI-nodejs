import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Grid, Typography, CircularProgress, Box } from '@mui/material';
import CourseCard from './CourseCard';

export default function ViewAllCourses({ userId }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all courses with price
  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = `${process.env.REACT_APP_BE_CANVAS_API_URL_BASE}/api/courses/with-price`;
        const { data } = await axios.get(endpoint, { withCredentials: true });

        console.log('Fetched priced courses:', data);
        setCourses(data);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to fetch courses.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []); // Empty dependency array ensures the effect runs only once

  const handleGoToCourse = (courseId) => {
    console.log('Go to course:', courseId);
    // Implement navigation logic if needed
  };

  const handleEnrollUser = (courseId) => {
    console.log('Enroll user into course:', courseId);
    // Implement enroll logic if needed
  };

  return (
    <Box padding={4}>
      <Typography variant="h4" gutterBottom>
        All Courses with Price
      </Typography>

      {/* Filter by course state */}
      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Grid container spacing={2}>
          {courses.length === 0 ? (
            <Typography>No courses with price found.</Typography>
          ) : (
            courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onGoToCourse={handleGoToCourse}
                onEnrollUser={handleEnrollUser}
              />
            ))
          )}
        </Grid>
      )}
    </Box>
  );
}
