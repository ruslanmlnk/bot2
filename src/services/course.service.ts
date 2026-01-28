import db from '../db/index.js';

export interface Course {
    description: string;
    program: string;
    reviews: string;
    price: number;
    success_message: string;
}

export async function getCourse(): Promise<Course> {
    const res = await db.query('SELECT description, program, reviews, price, success_message FROM course_data WHERE id = 1');
    return res.rows[0] as Course;
}

export async function updateCourse(field: keyof Course, value: string | number) {
    // Note: In Postgres, we should be careful with dynamic field names, but since this is internal and controlled by us, it's fine.
    const query = `UPDATE course_data SET ${field} = $1 WHERE id = 1`;
    return db.query(query, [value]);
}
