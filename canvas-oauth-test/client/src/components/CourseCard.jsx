import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
} from '@mui/material';
import { useCoursePrice } from '../hooks/useCoursePrice';

export default function CourseCard({ course, onGoToCourse, onEnrollUser }) {
  const { data: price, isLoading, error, refetch } = useCoursePrice(course.id);
  const [newPrice, setNewPrice] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const handleUpdatePrice = async () => {
    setUpdating(true);
    setUpdateError(null);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BE_DJANGO_API_URL_BASE}/api/course/update/price/${course.id}/`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ price: newPrice }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update price. Status: ${response.status}`);
      }

      await refetch(); // Refresh price
      setNewPrice(''); // Clear input
    } catch (err) {
      setUpdateError(err.message);
    } finally {
      setUpdating(false);
    }
  };

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

          <TextField
            size="small"
            label="New Price"
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
          <Button
            variant="outlined"
            fullWidth
            sx={{ mt: 1 }}
            onClick={handleUpdatePrice}
            disabled={updating || !newPrice}
          >
            {updating ? 'Updating...' : 'Update Price'}
          </Button>

          {updateError && (
            <Typography color="error" variant="caption">
              {updateError}
            </Typography>
          )}

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
