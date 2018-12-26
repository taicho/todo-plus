const notificationIds: Map<string, any> = new Map();


export function addNotification(id: string, ms: number, isTimeout: boolean, callback: () => void) {
    removeNotification(id);
    let timerRef: NodeJS.Timer;
    if (isTimeout) {
        timerRef = setTimeout(callback, ms);
    } else {
        timerRef = setInterval(callback, ms);
    }
    notificationIds.set(id, timerRef);
}

export function removeNotification(id: string) {
    const timerRef = notificationIds.get(id);
    if (timerRef) {
        clearTimeout(timerRef);
        clearInterval(timerRef);
        notificationIds.delete(id);
    }
}

export function killAllNotifications() {
    for (const id of Array.from(notificationIds.keys())) {
        removeNotification(id);
    }
}