import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { cohortAPI } from '../services/api';

export const CohortContext = createContext(null);

export const CohortProvider = ({ children }) => {
    const { user } = useAuth();
    const [currentCohort, setCurrentCohort] = useState(null);
    const [cohorts, setCohorts] = useState([]);
    const [loading, setLoading] = useState(false);

    /* ── Fetch cohorts from backend ────────────────────────── */
    const fetchCohorts = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const res = await cohortAPI.getAll();
            const data = Array.isArray(res?.data) ? res.data : [];
            setCohorts(data);
            // Auto-select first active cohort
            const active = data.find((c) => c.is_active);
            setCurrentCohort(active || data[0] || null);
        } catch (err) {
            console.error('Error fetching cohorts:', err);
            setCohorts([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchCohorts();
    }, [fetchCohorts]);

    /* ── CRUD helpers (call backend then refresh) ─────────── */

    const createCohort = useCallback(async (data) => {
        if (!user || user.role !== 'admin') return null;
        try {
            const res = await cohortAPI.create(data);
            await fetchCohorts();
            return res;
        } catch (err) {
            console.error('Error creating cohort:', err);
            throw err;
        }
    }, [user, fetchCohorts]);

    const updateCohort = useCallback(async (cohortId, data) => {
        try {
            const res = await cohortAPI.update(cohortId, data);
            await fetchCohorts();
            return res;
        } catch (err) {
            console.error('Error updating cohort:', err);
            throw err;
        }
    }, [fetchCohorts]);

    const deleteCohort = useCallback(async (cohortId) => {
        try {
            await cohortAPI.delete(cohortId);
            await fetchCohorts();
        } catch (err) {
            console.error('Error deleting cohort:', err);
            throw err;
        }
    }, [fetchCohorts]);

    const assignInstructorToCohort = useCallback(async (cohortId, instructorId) => {
        try {
            await cohortAPI.assignInstructor(cohortId, instructorId);
            await fetchCohorts();
        } catch (err) {
            console.error('Error assigning instructor:', err);
            throw err;
        }
    }, [fetchCohorts]);

    const removeInstructorFromCohort = useCallback(async (cohortId, instructorId) => {
        try {
            await cohortAPI.removeInstructor(cohortId, instructorId);
            await fetchCohorts();
        } catch (err) {
            console.error('Error removing instructor:', err);
            throw err;
        }
    }, [fetchCohorts]);

    const value = {
        cohorts,
        currentCohort,
        setCurrentCohort,
        loading,
        createCohort,
        updateCohort,
        deleteCohort,
        assignInstructorToCohort,
        removeInstructorFromCohort,
        fetchCohorts,
    };

    return (
        <CohortContext.Provider value={value}>
            {children}
        </CohortContext.Provider>
    );
};

export const useCohort = () => {
    const ctx = useContext(CohortContext);
    if (!ctx) throw new Error('useCohort must be used within CohortProvider');
    return ctx;
};

export default CohortContext;
