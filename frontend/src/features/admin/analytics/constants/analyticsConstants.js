export const DATE_RANGE_PRESETS = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '6 Months', value: '6m' },
    { label: '12 Months', value: '12m' },
];

export const GROUP_BY_OPTIONS = [
    { label: 'Month', value: 'month' },
    { label: 'Week', value: 'week' },
    { label: 'Day', value: 'day' },
];

export const REQUEST_STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 15%, transparent)' },
    approved: { label: 'Approved', color: 'var(--accent-2)', bg: 'color-mix(in srgb, var(--accent-2) 15%, transparent)' },
    processing: { label: 'Processing', color: '#f59e0b', bg: 'color-mix(in srgb, #f59e0b 15%, transparent)' },
    completed: { label: 'Completed', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 15%, transparent)' },
    rejected: { label: 'Rejected', color: 'var(--error)', bg: 'color-mix(in srgb, var(--error) 15%, transparent)' },
    cancelled: { label: 'Cancelled', color: 'var(--muted)', bg: 'color-mix(in srgb, var(--muted) 15%, transparent)' },
};

export const CERTIFICATE_TYPE_LABELS = {
    offer_letter: 'Offer Letter',
    bonafide: 'Bonafide',
    ojt_certificate: 'OJT Certificate',
    experience_letter: 'Experience Letter',
    completion_certificate: 'Completion Certificate',
    intern_of_month: 'Intern of Month',
    league_winner: 'League Winner',
    custom: 'Custom',
};

export const PIPELINE_STAGES = [
    { key: 'pending', label: 'Pending TL Review' },
    { key: 'approved', label: 'TL Approved' },
    { key: 'processing', label: 'Forwarded to Admin' },
    { key: 'completed', label: 'Certificate Issued' },
    { key: 'failed_gens', label: 'Failed Generations' },
];

export const OVERDUE_THRESHOLD_DAYS = 3;
