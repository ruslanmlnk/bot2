import type { Course } from '../types/index.js';
import { getCourseData, updateCourseField } from '../db/queries/courseData.js';

export async function getCourse(): Promise<Course> {
    return getCourseData();
}

export async function updateCourse(field: keyof Course, value: string | number) {
    // Note: In Postgres, we should be careful with dynamic field names, but since this is internal and controlled by us, it's fine.
    return updateCourseField(field, value);
}
