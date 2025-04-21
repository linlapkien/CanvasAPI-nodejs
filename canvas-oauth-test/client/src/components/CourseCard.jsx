import { Card, CardContent, Typography, Button, Grid } from '@mui/material';
import { useCoursePrice } from '../hooks/useCoursePrice'; // Update path if needed

export default function CourseCard({ course, onGoToCourse, onEnrollUser }) {
  const { data: price, isLoading, error } = useCoursePrice(course.id);

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">{course.name || ''}</Typography>
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
          <Typography variant="body2">
            Price:{' '}
            {isLoading
              ? 'Loading...'
              : error
              ? 'N/A'
              : `$${parseFloat(price).toFixed(2)}`}
          </Typography>

          <Button
            variant="outlined"
            fullWidth
            sx={{ marginTop: '8px' }}
            onClick={() => onGoToCourse(course.id)}
          >
            Go to Course
          </Button>
          <Button
            variant="contained"
            fullWidth
            sx={{ marginTop: '8px' }}
            onClick={() => onEnrollUser(course.id)}
          >
            Enroll User
          </Button>
        </CardContent>
      </Card>
    </Grid>
  );
}
