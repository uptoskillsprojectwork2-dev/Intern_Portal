/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAnalyticsBatch } from '../services/analytics.service';

const defaultFilters = {
  range: '30d',
  from: '',
  to: '',
  domain: '',
  teamLeader: '',
  groupBy: 'day',
  overdueDays: '3',
};

const emptyData = {
  overview: {},
  requestsTrend: { labels: [], series: [] },
  certificateTypes: { labels: [], series: [] },
  turnaround: {
    requestToReview: { average: null, median: null, p90: null },
    reviewToFinalization: { average: null, median: null, p90: null },
    requestToIssued: { average: null, median: null, p90: null },
  },
  teamLeaders: [],
  domains: { labels: [], series: [] },
  pipeline: { labels: [], series: [] },
  upcoming: { items: [], count: 0 },
  stuck: { requests: [], count: 0 },
};

export default function useAdminAnalytics(initialFilters = {}) {
  const [filters, setFilters] = useState({ ...defaultFilters, ...initialFilters });
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState({
    overview: true,
    requestsTrend: true,
    certificateTypes: true,
    turnaround: true,
    teamLeaders: true,
    domains: true,
    pipeline: true,
    upcoming: true,
    stuck: true,
  });
  const [errors, setErrors] = useState({
    overview: null,
    requestsTrend: null,
    certificateTypes: null,
    turnaround: null,
    teamLeaders: null,
    domains: null,
    pipeline: null,
    upcoming: null,
    stuck: null,
  });
  const requestIdRef = useRef(0);

  const buildQuery = useCallback((nextFilters = filters) => {
    const params = {};
    if (nextFilters.range) params.range = nextFilters.range;
    if (nextFilters.from) params.from = nextFilters.from;
    if (nextFilters.to) params.to = nextFilters.to;
    if (nextFilters.domain) params.domain = nextFilters.domain;
    if (nextFilters.teamLeader) params.teamLeader = nextFilters.teamLeader;
    if (nextFilters.groupBy) params.groupBy = nextFilters.groupBy;
    if (nextFilters.overdueDays) params.overdueDays = nextFilters.overdueDays;
    return params;
  }, [filters]);

  const refetch = useCallback(async (nextFilters = filters) => {
    const currentRequestId = ++requestIdRef.current;
    const params = buildQuery(nextFilters);

    setLoading({
      overview: true,
      requestsTrend: true,
      certificateTypes: true,
      turnaround: true,
      teamLeaders: true,
      domains: true,
      pipeline: true,
      upcoming: true,
      stuck: true,
    });

    try {
      const response = await fetchAnalyticsBatch(params);
      if (currentRequestId !== requestIdRef.current) return;
      setData(response);
      setErrors({
        overview: null,
        requestsTrend: null,
        certificateTypes: null,
        turnaround: null,
        teamLeaders: null,
        domains: null,
        pipeline: null,
        upcoming: null,
        stuck: null,
      });
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) return;
      setErrors({
        overview: error.message,
        requestsTrend: error.message,
        certificateTypes: error.message,
        turnaround: error.message,
        teamLeaders: error.message,
        domains: error.message,
        pipeline: error.message,
        upcoming: error.message,
        stuck: error.message,
      });
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading({
          overview: false,
          requestsTrend: false,
          certificateTypes: false,
          turnaround: false,
          teamLeaders: false,
          domains: false,
          pipeline: false,
          upcoming: false,
          stuck: false,
        });
      }
    }
  }, [buildQuery, filters]);

  useEffect(() => {
    refetch(filters);
  }, [filters, refetch]);

  return {
    data,
    loading,
    errors,
    refetch: () => refetch(filters),
    filters,
    setFilters,
  };
}
