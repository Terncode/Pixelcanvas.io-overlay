const cords = document.getElementById("coordinates");

function updateCords(x, y) {
    cords.textContent = `(${Math.round(x)}, ${Math.round(y)})`;

}

updateCords(0, 1000);

window.addEventListener("mousemove", event => {
    updateCords(event.x, event.y);
});
