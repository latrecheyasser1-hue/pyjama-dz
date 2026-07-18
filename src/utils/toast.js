// Global Toast & Alert Replacement Utility
let listeners = [];

export function subscribeToToast(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function showToast(message, type = 'info', duration = 3500) {
  listeners.forEach(listener => listener({
    id: Date.now() + Math.random(),
    message,
    type,
    duration
  }));
}

// Global override for window.alert to guarantee zero browser popups ("localhost:5173 says...")
if (typeof window !== 'undefined') {
  window.originalAlert = window.alert;
  window.alert = (message) => {
    let type = 'info';
    if (typeof message === 'string') {
      if (message.includes('Erreur') || message.includes('خطأ') || message.includes('❌') || message.includes('الرجاء') || message.includes('Veuillez')) {
        type = 'error';
      } else if (message.includes('⚠️') || message.includes('تنبيه') || message.includes('لا يمكن')) {
        type = 'warning';
      } else if (message.includes('✅') || message.includes('بنجاح')) {
        type = 'success';
      }
    }
    showToast(message, type, 4000);
  };
}
