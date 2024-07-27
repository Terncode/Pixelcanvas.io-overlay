// Creating artificial API between two worlds

const log = console.log;
console.log = (...args: any) => {
    const firstArg = args[0];
    if (firstArg && typeof firstArg === "object" && "pixelsPlaced" in firstArg) {
        const pixelsPlaced = new CustomEvent("__pixelsPlaced", {
            detail: firstArg.pixelsPlaced,
        });
        document.dispatchEvent(pixelsPlaced);
    }
    log(...args);
};

