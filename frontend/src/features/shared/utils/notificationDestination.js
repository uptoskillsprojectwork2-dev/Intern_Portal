export function getNotificationDestination(notification, role) {
  if (role === 'intern') return '/intern/dashboard?view=certificates';
  if (role === 'teamleader') return '/teamleader/dashboard?view=requests';
  if (role === 'admin') {
    if (/retention|archive|purge|restore/i.test(`${notification.title} ${notification.type}`)) return '/admin/dashboard?view=retention';
    if (/certificate|request/i.test(`${notification.title} ${notification.type}`)) return '/admin/dashboard?view=requests';
    return '/admin/dashboard';
  }
  return '/';
}
