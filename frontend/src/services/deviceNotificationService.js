import React from 'react';
import toast from 'react-hot-toast';

class DeviceNotificationService {
  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Get current browser notification permission status
   */
  getPermissionState() {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Request permission for device push notifications
   */
  async requestPermission() {
    if (!this.isSupported) {
      toast.error('Device push notifications are not supported in this browser.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Device push notifications enabled successfully!');
        this.sendNotification('SETU Notifications Active', {
          body: 'You will now receive device push notifications for critical store & inventory alerts.',
          icon: '/favicon.ico',
        });
        return true;
      } else {
        toast.error('Notification permission was denied.');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable device notifications.');
      return false;
    }
  }

  /**
   * Dispatch a device notification to the hardware/browser
   */
  sendNotification(title, options = {}) {
    // Standardize notification payload
    const notificationOptions = {
      icon: options.icon || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=128&q=80',
      badge: options.badge || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=128&q=80',
      body: options.body || '',
      tag: options.tag || 'setu-alert-' + Date.now(),
      renotify: options.renotify || true,
      timestamp: Date.now(),
      ...options,
    };

    // 1. Try native browser notification if granted
    if (this.isSupported && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, notificationOptions);
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          if (options.url) {
            window.location.href = options.url;
          }
          notification.close();
        };
        return notification;
      } catch (err) {
        console.warn('Native notification failed, falling back to toast notification', err);
      }
    }

    // 2. Fallback to in-app toast notification if native push is denied or fails
    const toastMessage = `${title}${notificationOptions.body ? `: ${notificationOptions.body}` : ''}`;
    const targetUrl = options.url || '/bright-connection';
    toast((t) => React.createElement(
      'div',
      {
        className: 'cursor-pointer flex items-center gap-2',
        onClick: () => {
          toast.dismiss(t.id);
          if (typeof window !== 'undefined') {
            window.location.href = targetUrl;
          }
        }
      },
      React.createElement('span', { className: 'text-xs font-semibold' }, toastMessage)
    ), { duration: 6000, position: 'top-right' });

    return null;
  }

  /**
   * Helper to trigger a sample test notification on user demand
   */
  sendTestNotification() {
    return this.sendNotification('🔔 SETU Device Notification Test', {
      body: 'Verified! Hardware device push notifications are working perfectly on this system.',
      severity: 'info',
      tag: 'test-device-notification',
    });
  }
}

export const deviceNotificationService = new DeviceNotificationService();
export default deviceNotificationService;
