(async () => {
    const file = await fetch("../dist/user-script.user.js").then((e => e.text()));
    while (true) {
        await new Promise(resolve => setTimeout(resolve), 100);
        const file2 = await fetch("../dist/user-script.user.js")
            .then((e => e.status === 200 ? e.text() : Promise.resolve(file)));
        if (file !== file2) {
            console.log(file);
            break;
        }
    }
    await new Promise(resolve => setTimeout(resolve), 1000);
    location.reload();

})();