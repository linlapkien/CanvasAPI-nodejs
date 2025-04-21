import { useQuery } from '@tanstack/react-query';

export const useCoursePrice = (courseId) => {
  // Check if courseId is valid
  return useQuery({
    // This is the unique key for the query
    queryKey: ['coursePrice', courseId],
    // The function that fetches the data
    queryFn: async () => {
      const response = await fetch(
        `${process.env.REACT_APP_BE_DJANGO_API_URL_BASE}/api/course/price/${courseId}`,
        {
          method: 'GET',
          credentials: 'include', // This includes cookies, for auth/session
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.price;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
