import db from "../index.js";
import type { Course } from "../../types/index.js";

export async function getCourseData(): Promise<Course> {
    const res = await db.query(
        "SELECT description, program, reviews, price, success_message FROM course_data WHERE id = 1"
    );
    return res.rows[0] as Course;
}

export function updateCourseField(field: keyof Course, value: string | number) {
    const query = `UPDATE course_data SET ${field} = $1 WHERE id = 1`;
    return db.query(query, [value]);
}