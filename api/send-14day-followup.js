import handler from './cron-notifications.js';

export default async function send14DayFollowup(req, res) {
  // Delegate directly to the followup_14_days action in cron-notifications
  req.query = { ...req.query, action: 'followup_14_days' };
  return handler(req, res);
}
