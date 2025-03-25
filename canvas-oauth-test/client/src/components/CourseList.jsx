import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from '@mui/material';

export default function CourseList({ userId = null }) {
  const [courses, setCourses] = useState([]);
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);

  const fetchCourses = async () => {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    params.append('page', page);

    const endpoint = userId
      ? `http://localhost:3002/api/users/${userId}/courses?${params.toString()}`
      : `http://localhost:3002/api/courses/all?${params.toString()}`;

    try {
      const res = await fetch(endpoint, { credentials: 'include' });
      const data = await res.json();
      console.log('Fetched courses:', data);
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [state, page, userId]);

  return (
    <div style={{ padding: '1rem' }}>
      {/* Filters */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>State</InputLabel>
            <Select value={state} onChange={(e) => setState(e.target.value)}>
              <MenuItem value="">All States</MenuItem>
              <MenuItem value="unpublished">Unpublished</MenuItem>
              <MenuItem value="available">Available</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="deleted">Deleted</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Course Cards */}
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
                    Code: {course.course_code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ID: {course.id}
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ marginTop: '8px' }}
                  >
                    View Course
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Typography>No courses found.</Typography>
        )}
      </Grid>

      {/* Pagination */}
      <Grid container justifyContent="space-between" alignItems="center" mt={4}>
        <Button
          variant="contained"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <Typography>Page {page}</Typography>
        <Button variant="contained" onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </Grid>
    </div>
  );
}
