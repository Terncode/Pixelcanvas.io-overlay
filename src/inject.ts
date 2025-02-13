// Creating artificial API between two worlds

import { EVENT_CROSS_WORLD_INJECTED, EVENT_CROSS_WORLD_PIXEL_PLACED, EVENT_CROSS_WORLD_URL_UPDATE } from "./constants";
import { Interceptor } from "./lib/interceptor";
import { HistoryPushStateSpy } from "./lib/urlHistorySpy.ts";

Interceptor.onAfter("/api/pixel", async (_, response, init) => {
    try {
        if (response.status === 200 && init && "body" in init) {
            const body = JSON.parse(init.body as any);
            if ("x" in body && "y" in body && "color" in body) {
                const pixelsPlaced = new CustomEvent(EVENT_CROSS_WORLD_PIXEL_PLACED, {
                    detail: { color: body.color, x: body.x, y: body.y },
                });
                document.dispatchEvent(pixelsPlaced);
            }
        }
    } catch (error) {
        console.error(error);
    }
});

HistoryPushStateSpy.onPushState((_, __, url) => {
    const pixelsPlaced = new CustomEvent(EVENT_CROSS_WORLD_URL_UPDATE, {
        detail: url,
    });
    document.dispatchEvent(pixelsPlaced);
});

document.dispatchEvent(new CustomEvent(EVENT_CROSS_WORLD_INJECTED));