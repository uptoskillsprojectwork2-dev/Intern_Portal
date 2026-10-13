import { useCallback, useEffect, useState } from 'react';
import {
    getAnalyticsOverview,
    getAnalyticsRequestsTrend,
    getAnalyticsCertificateTypes,
    getAnalyticsTurnaround,
    getAnalyticsTeamLeaders,
    getAnalyticsDomains,
    getAnalyticsPipeline,
    getAnalyticsUpcomingCompletions,
} from '../services/analyticsApi.js';

const getErrorMessage = (error) =>
    error?.response?.data?.message || error.message || 'Unable to load analytics data.';

const useAnalyticsEndpoint = (fetchFn, params) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchFn(params);
            setData(result);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    }, [fetchFn, params]);

    useEffect(() => {
        const timer = setTimeout(refetch, 0);
        return () => clearTimeout(timer);
    }, [refetch]);

    return { data, loading, error, refetch };
};

export const useOverview = (params) => useAnalyticsEndpoint(getAnalyticsOverview, params);
export const useRequestsTrend = (params) => useAnalyticsEndpoint(getAnalyticsRequestsTrend, params);
export const useCertificateTypes = (params) => useAnalyticsEndpoint(getAnalyticsCertificateTypes, params);
export const useTurnaround = (params) => useAnalyticsEndpoint(getAnalyticsTurnaround, params);
export const useTeamLeaders = (params) => useAnalyticsEndpoint(getAnalyticsTeamLeaders, params);
export const useDomains = (params) => useAnalyticsEndpoint(getAnalyticsDomains, params);
export const usePipeline = (params) => useAnalyticsEndpoint(getAnalyticsPipeline, params);
export const useUpcomingCompletions = (params) => useAnalyticsEndpoint(getAnalyticsUpcomingCompletions, params);

export const useAdminAnalytics = (params = {}) => {
    const overview = useOverview(params);
    const requestsTrend = useRequestsTrend(params);
    const certificateTypes = useCertificateTypes(params);
    const turnaround = useTurnaround(params);
    const teamLeaders = useTeamLeaders(params);
    const domains = useDomains(params);
    const pipeline = usePipeline(params);
    const upcomingCompletions = useUpcomingCompletions(params);

    const refetchAll = useCallback(async () => {
        await Promise.all([
            overview.refetch(),
            requestsTrend.refetch(),
            certificateTypes.refetch(),
            turnaround.refetch(),
            teamLeaders.refetch(),
            domains.refetch(),
            pipeline.refetch(),
            upcomingCompletions.refetch(),
        ]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const allLoading = overview.loading || requestsTrend.loading || certificateTypes.loading
        || turnaround.loading || teamLeaders.loading || domains.loading
        || pipeline.loading || upcomingCompletions.loading;

    const anyError = overview.error || requestsTrend.error || certificateTypes.error
        || turnaround.error || teamLeaders.error || domains.error
        || pipeline.error || upcomingCompletions.error;

    return {
        overview,
        requestsTrend,
        certificateTypes,
        turnaround,
        teamLeaders,
        domains,
        pipeline,
        upcomingCompletions,
        loading: allLoading,
        error: anyError,
        refetchAll,
    };
};
