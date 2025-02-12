export type InterceptBefore = (requestInfo: string, init?: RequestInit) => Promise<void> | void;
export type InterceptAfter = (requestInfo: string, response: Response, init?: RequestInit) => Promise<void> | void;

export class Interceptor {

    private static fetch = window.fetch;
    private static overwritten = false; 
    private static before = new Map<string, InterceptBefore[]>();
    private static after = new Map<string, InterceptAfter[]>();
    
    private constructor() {}

    private static overrideFetch() {
        if (this.overwritten) {
            return;
        }
        this.overwritten = true;
        (window as any).fetch = async (...args: any) => {
            const url = ((args[0] as RequestInfo | URL) || "").toString();
            const init = args[1];

            const befores = [...(this.before.get(url) || []), ...(this.before.get("*") || [])];
            if (befores) {
                for (const before of befores) {
                    await before(url, init);       
                }
            }

            const response = (this.fetch as any)(...args);
            const afters = [...(this.after.get(url) || []), ...(this.after.get("*") || [])];
            if (afters) {
                const result = await response;
                for (const after of afters) {
                    try {
                        await after(url, result, init);       
                    } catch (_) {}
                }
                return response;
            } else {
                return response;
            }
        };
    }

    static onAfter(url: string, cb: InterceptAfter) {
        Interceptor.overrideFetch();
        const arr = Interceptor.after.get(url) || [];
        if (!arr.includes(cb)) {
            arr.push(cb);
        }
        Interceptor.after.set(url, arr);
    }
    static offAfter(url: string, cb: InterceptAfter) {
        const arr = Interceptor.after.get(url) || [];
        const index = arr.indexOf(cb);
        if (index !== -1) {
            arr.splice(index, 1);
        }
        if (arr.length) {
            Interceptor.after.set(url, arr);
        } else {
            Interceptor.after.delete(url);
        }
    }

    static onBefore(url: string, cb: InterceptBefore) {
        Interceptor.overrideFetch();
        const arr = Interceptor.before.get(url) || [];
        if (!arr.includes(cb)) {
            arr.push(cb);
        }
        Interceptor.before.set(url, arr);
    }
    static offBefore(url: string, cb: InterceptBefore) {
        const arr = Interceptor.before.get(url) || [];
        const index = arr.indexOf(cb);
        if (index !== -1) {
            arr.splice(index, 1);
        }
        if (arr.length) {
            Interceptor.before.set(url, arr);
        } else {
            Interceptor.before.delete(url);
        }
    }
}
