import { notificationsApi } from '../lib/api/notifications';
import { NotificationType } from '../lib/types/types';

class NotificationObservable {
  private subscribers: Set<(notifs: NotificationType[]) => void> = new Set();
  private intervalId: NodeJS.Timeout | null = null;
  private pollingInterval = 60000; 

  subscribe(callback: (notifs: NotificationType[]) => void) {
    this.subscribers.add(callback);
    if (this.subscribers.size === 1) {
      this.startPolling();
    }
    this.fetchAndNotify();
    return {
      unsubscribe: () => {
        this.subscribers.delete(callback);
        if (this.subscribers.size === 0) {
          this.stopPolling();
        }
      },
    };
  }

  private async fetchAndNotify() {
    try {
      const notifications = await notificationsApi.getAll();
      const filtered = notifications.filter(
        (notif) => !notif.isDeleted
      );
      const sorted = filtered.sort((a, b) => {
        if (a.read !== b.read) return (a.read ? 1 : 0) - (b.read ? 1 : 0);
        return (
          new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        );
      });
      this.subscribers.forEach((callback) => callback(sorted));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }

  private startPolling() {
    this.intervalId = setInterval(() => {
      this.fetchAndNotify();
    }, this.pollingInterval);
  }

  private stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const notificationObservable = new NotificationObservable();

class UnreadCountObservable {
  private subscribers: Set<(count: number) => void> = new Set();
  private intervalId: NodeJS.Timeout | null = null;
  private pollingInterval = 60000;

  subscribe(callback: (count: number) => void) {
    this.subscribers.add(callback);
    if (this.subscribers.size === 1) {
      this.startPolling();
    }
    this.fetchAndNotify();
    return {
      unsubscribe: () => {
        this.subscribers.delete(callback);
        if (this.subscribers.size === 0) {
          this.stopPolling();
        }
      },
    };
  }

  private async fetchAndNotify() {
    try {
      const count = await notificationsApi.getUnreadCount();
      this.subscribers.forEach((callback) => callback(count));
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }

  private startPolling() {
    this.intervalId = setInterval(() => {
      this.fetchAndNotify();
    }, this.pollingInterval);
  }

  private stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const unreadCountObservable = new UnreadCountObservable();

export const addNotification = async (
  notification: Omit<NotificationType, 'id' | 'read' | 'date'>
) => {
  return await notificationsApi.create({
    ...notification,
    read: false,
    date: new Date().toISOString(),
  });
};

export const getUnreadNotifications = async () => {
  return await notificationsApi.getAll({ read: false });
};

export const markNotificationAsRead = async (id: number) => {
  try {
    await notificationsApi.markAsRead(id);
    return true;
  } catch (error) {
    console.error('Error al marcar como leída:', error);
    return false;
  }
};

export const deleteNotification = async (id: number) => {
  return await notificationsApi.delete(id);
};

export const markAllAsRead = async () => {
  return await notificationsApi.markAllAsRead();
};

export const addSystemNotification = async (
  message: string,
  title: string,
  actualizationId: number
) => {
  try {
    const existing = await notificationsApi.getAll({
      type: 'system',
    });
    const alreadyExists = existing.some(
      (notif: NotificationType) => notif.actualizationId === actualizationId
    );
    if (!alreadyExists) {
      await notificationsApi.create({
        title,
        message,
        date: new Date().toISOString(),
        read: false,
        type: 'system',
        actualizationId,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding system notification:', error);
    return false;
  }
};

export const observeNotifications = (
  callback: (notifs: NotificationType[]) => void
) => {
  return notificationObservable.subscribe(callback);
};

export const observeUnreadCount = (callback: (count: number) => void) => {
  return unreadCountObservable.subscribe(callback);
};