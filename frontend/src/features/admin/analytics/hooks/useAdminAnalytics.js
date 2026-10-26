import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchOverview,
  fetchTrend,
  fetchTypes,
  fetchTurnaround,
  fetchTeamLeaders,
  fetchDomains,
  fetchPipeline,
  fetchUpcoming,
  fetchStuck,
  downloadAnalytics
} from '../services/analytics.service';

export function useAdminAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [range, setRange] = useState(() => searchParams.get('range') || (searchParams.has('from') || searchParams.has('to') ? 'custom' : '6m'));
  const [from, setFrom] = useState(() => searchParams.get('from') || '');
  const [to, setTo] = useState(() => searchParams.get('to') || '');
  const [domain, setDomain] = useState(() => searchParams.get('domain') || '');
  const [teamLeader, setTeamLeader] = useState(() => searchParams.get('teamLeaderId') || '');
  const [groupBy, setGroupBy] = useState(() => searchParams.get('groupBy') || 'month');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [toastMessage, setToastMessage] = useState(null);
  const requestSequence = useRef({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      const values = { range, from: range === 'custom' ? from : '', to: range === 'custom' ? to : '', domain, teamLeaderId: teamLeader, groupBy };
      for (const [key, value] of Object.entries(values)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    }, { replace: true });
  }, [range, from, to, domain, teamLeader, groupBy, setSearchParams]);

  // Per-widget state storage
  const [widgets, setWidgets] = useState({
    overview: null,
    trend: null,
    types: null,
    turnaround: null,
    teamLeaders: null,
    domains: null,
    pipeline: null,
    upcoming: null,
    stuck: null
  });

  const [loading, setLoading] = useState({
    overview: true,
    trend: true,
    types: true,
    turnaround: true,
    teamLeaders: true,
    domains: true,
    pipeline: true,
    upcoming: true,
    stuck: true
  });

  const [errors, setErrors] = useState({
    overview: null,
    trend: null,
    types: null,
    turnaround: null,
    teamLeaders: null,
    domains: null,
    pipeline: null,
    upcoming: null,
    stuck: null
  });

  const getParams = useCallback(() => {
    const params = { range: range === 'custom' && (!from || !to) ? '6m' : range, domain, teamLeaderId: teamLeader, groupBy };
    if (range === 'custom') {
      if (from) params.from = from;
      if (to) params.to = to;
    }
    return params;
  }, [range, from, to, domain, teamLeader, groupBy]);

  const fetchSingleWidget = useCallback(
    async (key) => {
      const requestId = (requestSequence.current[key] || 0) + 1;
      requestSequence.current[key] = requestId;
      setLoading((prev) => ({ ...prev, [key]: true }));
      setErrors((prev) => ({ ...prev, [key]: null }));
      try {
        const params = getParams();
        let res;
        switch (key) {
          case 'overview':
            res = await fetchOverview(params);
            break;
          case 'trend':
            res = await fetchTrend({ ...params, groupBy });
            break;
          case 'types':
            res = await fetchTypes(params);
            break;
          case 'turnaround':
            res = await fetchTurnaround(params);
            break;
          case 'teamLeaders':
            res = await fetchTeamLeaders(params);
            break;
          case 'domains':
            res = await fetchDomains(params);
            break;
          case 'pipeline':
            res = await fetchPipeline(params);
            break;
          case 'upcoming':
            res = await fetchUpcoming(30, params);
            break;
          case 'stuck':
            res = await fetchStuck(3, params);
            break;
          default:
            return;
        }

        if (mounted.current && requestSequence.current[key] === requestId) {
          setWidgets((prev) => ({ ...prev, [key]: res.data }));
        }
      } catch (err) {
        if (mounted.current && requestSequence.current[key] === requestId) {
          setErrors((prev) => ({ ...prev, [key]: err.message || 'Failed to load widget' }));
        }
      } finally {
        if (mounted.current && requestSequence.current[key] === requestId) {
          setLoading((prev) => ({ ...prev, [key]: false }));
        }
      }
    },
    [getParams, groupBy]
  );

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchSingleWidget('overview'),
      fetchSingleWidget('trend'),
      fetchSingleWidget('types'),
      fetchSingleWidget('turnaround'),
      fetchSingleWidget('teamLeaders'),
      fetchSingleWidget('domains'),
      fetchSingleWidget('pipeline'),
      fetchSingleWidget('upcoming'),
      fetchSingleWidget('stuck')
    ]);
    if (mounted.current) setLastUpdated(new Date());
  }, [fetchSingleWidget]);

  useEffect(() => {
    fetchAll();
  }, [range, from, to, domain, teamLeader, groupBy, fetchAll]);

  const handleExport = async (type, format = 'csv') => {
    try {
      setToastMessage({ type: 'loading', message: `Exporting ${type} ${format.toUpperCase()}...` });
      await downloadAnalytics(type, getParams(), format);
      setToastMessage({ type: 'success', message: `${type.toUpperCase()} ${format.toUpperCase()} exported successfully!` });
    } catch (err) {
      setToastMessage({ type: 'error', message: err.message || `${format.toUpperCase()} export failed` });
    }
  };

  const clearToast = () => setToastMessage(null);

  return {
    range,
    setRange,
    from,
    setFrom,
    to,
    setTo,
    domain,
    setDomain,
    teamLeader,
    setTeamLeader,
    groupBy,
    setGroupBy,
    lastUpdated,
    widgets,
    loading,
    errors,
    fetchSingleWidget,
    refetchAll: fetchAll,
    handleExport,
    toastMessage,
    clearToast
  };
}
