// /src/pages/courses/[userId].jsx
import { useRouter } from 'next/router';
import CourseList from '../../components/CourseList';

export default function UserCoursesPage() {
  const router = useRouter();
  const { userId } = router.query;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Courses for User ID: {userId}</h1>
      {userId && <CourseList userId={userId} />}
    </div>
  );
}
