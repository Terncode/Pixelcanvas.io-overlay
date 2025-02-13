export type SpyHistoryPushStateSpy = (data: any, unused: string, url?: string | URL | null) => Promise<void> | void;

export class HistoryPushStateSpy {
    private static pushState = window.history.pushState;
    private static overwritten = false; 
    private static listeners: SpyHistoryPushStateSpy[] = [];

    private static overridePushState() {
        if (this.overwritten) {
            return;
        }
        this.overwritten = true;
        const listeners = this.listeners;
        const pushState = this.pushState;
        (window as any).history.pushState = function (...args: any) {
            for (const listener of listeners) {
                (listener as any).apply(this, args);
            }
            return (pushState as any).apply(this, args);
        };
    }

    static onPushState(cb: SpyHistoryPushStateSpy) {
        this.overridePushState();
        if (!this.listeners.includes(cb)) {
            this.listeners.push(cb);
        }
    }
    static offPushState(cb: SpyHistoryPushStateSpy) {
        const index = this.listeners.indexOf(cb);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }
}