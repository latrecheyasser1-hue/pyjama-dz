import handler from './cron-notifications.js';

export default async function sendWeeklyHotSale(req, res) {
  // Delegate directly to the weekly_hot_sale action in cron-notifications
  req.query = { ...req.query, action: 'weekly_hot_sale' };
  return handler(req, res);
}
