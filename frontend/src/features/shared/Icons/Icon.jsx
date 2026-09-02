const Icon = ({ name, size = 20 }) => {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );

    case "certificate":
      return (
        <svg {...commonProps}>
          <rect x="4" y="3" width="16" height="14" rx="2" />
          <path d="M8 7h8" />
          <path d="M8 11h5" />
          <path d="m9 17 3 4 3-4" />
          <path d="M12 17v4" />
        </svg>
      );

    case "bell":
      return (
        <svg {...commonProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "logout":
      return (
        <svg {...commonProps}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
        </svg>
      );

    case "trash":
      return (
        <svg {...commonProps}>
          <path d="M4 7h16" />
          <path d="M9 7V4.5h6V7" />
          <path d="M7 7l1 13h8l1-13" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      );

    case "chevron-left":
      return (
        <svg {...commonProps}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );

    case "chevron-right":
      return (
        <svg {...commonProps}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case "check":
      return (
        <svg {...commonProps}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "domain":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17" />
          <path d="M12 3.5c2.2 2.4 3.3 5.2 3.3 8.5s-1.1 6.1-3.3 8.5" />
          <path d="M12 3.5C9.8 5.9 8.7 8.7 8.7 12s1.1 6.1 3.3 8.5" />
        </svg>
      );

    case "info":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
      );

    case "activity":
      return (
        <svg {...commonProps}>
          <path d="M3 12h4l2-6 4 12 2-6h6" />
        </svg>
      );

    case "sun":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.4" />
          <path d="M12 19.1v2.4" />
          <path d="M4.6 4.6l1.7 1.7" />
          <path d="M17.7 17.7l1.7 1.7" />
          <path d="M2.5 12h2.4" />
          <path d="M19.1 12h2.4" />
          <path d="M4.6 19.4l1.7-1.7" />
          <path d="M17.7 6.3l1.7-1.7" />
        </svg>
      );

    case "moon":
      return (
        <svg {...commonProps}>
          <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7Z" />
        </svg>
      );

    case "user":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="3.6" />
          <path d="M5 20c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" />
        </svg>
      );

    case "edit":
      return (
        <svg {...commonProps}>
          <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
          <path d="M13.5 7.5l3 3" />
        </svg>
      );

    case "mail":
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
          <path d="m4.5 6.5 7.5 6 7.5-6" />
        </svg>
      );

    case "phone":
      return (
        <svg {...commonProps}>
          <path d="M6.6 3.5h3l1.2 4.3-2.2 1.6a13.8 13.8 0 0 0 5.9 5.9l1.6-2.2 4.3 1.2v3a1.8 1.8 0 0 1-2 1.8A16.4 16.4 0 0 1 4.8 5.5a1.8 1.8 0 0 1 1.8-2Z" />
        </svg>
      );

    case "college":
      return (
        <svg {...commonProps}>
          <path d="M2.5 9 12 4.5 21.5 9 12 13.5Z" />
          <path d="M6 11v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" />
          <path d="M21.5 9v6" />
        </svg>
      );

    case "map-pin":
      return (
        <svg {...commonProps}>
          <path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21Z" />
          <circle cx="12" cy="9.5" r="2.3" />
        </svg>
      );

    default:
      return null;
  }
};

export default Icon;