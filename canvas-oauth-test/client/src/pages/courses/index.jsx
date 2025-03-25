// /src/pages/courses/index.jsx
import CourseList from '../../components/CourseList';

export default function CurrentUserCoursesPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">My Courses</h1>
      <CourseList />
    </div>
  );
}
