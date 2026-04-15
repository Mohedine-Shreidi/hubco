import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { courseAPI, taskAPI } from '../services/api';

export const CourseContext = createContext(null);

export const CourseProvider = ({ children }) => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [activeCourse, setActiveCourse] = useState(null);
    const [loading, setLoading] = useState(false);

    /* ── Fetch courses from backend ────────────────────────── */
    const fetchCourses = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const res = await courseAPI.getAll();
            const data = Array.isArray(res?.data) ? res.data : [];
            setCourses(data);
            // Auto-select first active course
            const active = data.find((c) => c.status === 'active');
            setActiveCourse(active || data[0] || null);
        } catch (err) {
            console.error('Error fetching courses:', err);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    /* ── CRUD helpers (call backend then refresh) ─────────── */

    const createCourse = useCallback(async (data) => {
        if (!user || !['admin', 'instructor'].includes(user.role)) return null;
        try {
            const res = await courseAPI.create(data);
            await fetchCourses();
            return res;
        } catch (err) {
            console.error('Error creating course:', err);
            throw err;
        }
    }, [user, fetchCourses]);

    const updateCourse = useCallback(async (courseId, data) => {
        try {
            const res = await courseAPI.update(courseId, data);
            await fetchCourses();
            return res;
        } catch (err) {
            console.error('Error updating course:', err);
            throw err;
        }
    }, [fetchCourses]);

    const finishCourse = useCallback(async (courseId) => {
        try {
            await courseAPI.finish(courseId);
            await fetchCourses();
        } catch (err) {
            console.error('Error finishing course:', err);
            throw err;
        }
    }, [fetchCourses]);

    /* ── Task helpers ──────────────────────────────────────── */

    const addTaskToCourse = useCallback(async (courseId, taskData) => {
        try {
            const res = await taskAPI.createTask({ courseId, ...taskData });
            await fetchCourses();
            return res;
        } catch (err) {
            console.error('Error creating task:', err);
            throw err;
        }
    }, [fetchCourses]);

    const updateTaskInCourse = useCallback(async (courseId, taskId, data) => {
        try {
            const res = await taskAPI.updateTask(taskId, data);
            await fetchCourses();
            return res;
        } catch (err) {
            console.error('Error updating task:', err);
            throw err;
        }
    }, [fetchCourses]);

    const value = {
        courses,
        activeCourse,
        setActiveCourse,
        loading,
        createCourse,
        updateCourse,
        finishCourse,
        addTaskToCourse,
        updateTaskInCourse,
        fetchCourses,
    };

    return (
        <CourseContext.Provider value={value}>
            {children}
        </CourseContext.Provider>
    );
};

export const useCourse = () => {
    const ctx = useContext(CourseContext);
    if (!ctx) throw new Error('useCourse must be used within CourseProvider');
    return ctx;
};

export default CourseContext;
