const cords = document.getElementById("coordinates");
const [canvas] = document.getElementsByClassName("leaflet-tile");

const key = "storage_location";
const s = JSON.parse(localStorage.getItem(key) || JSON.stringify([0, 1000, 2]));
const cordsArr = s;
const url = [-1.1,-1.1,-1.1];
let down = undefined;

setInterval(() => {
    if (url[0] !== cordsArr[0] || url[1] !== cordsArr[1] || url[2] !== cordsArr[2]) {
        url[0] = cordsArr[0];
        url[1] = cordsArr[1];
        url[2] = cordsArr[2];
        history.pushState(null, "", `/@${url[0]},${url[1]},${url[2]}`);
    }
}, 1000);

function updateCords(x, y) {
    localStorage.setItem(key, JSON.stringify([x,y, cordsArr[2]]));

    const text = `(${Math.round(x)}, ${Math.round(y)})`;
    if (cords.firstChild) {
        cords.firstChild.nodeValue = text;
    } else {
        cords.textContent = text;
    }
    if (down) {
        const size = 250;
        const half = size / 2;
        canvas.style.height = canvas.style.width = `${size + 4}px`;
        const centerW = Math.round(window.innerWidth / 2) - half;
        const centerH = Math.round(window.innerHeight / 2) - half;
        canvas.style.left = `${centerW + ((Math.abs(x) % size) - half)}px`;
        canvas.style.top = `${centerH + ((Math.abs(y) % size) - half)}px`;

    }
}

updateCords(cordsArr[0], cordsArr[1]);

cords.addEventListener("click", () => {
    const cord = prompt("cords");
    if (cord) {
        down = undefined;
        const [x, y] = cord.split(",");
        cordsArr[0] = parseInt(x);
        cordsArr[1] = parseInt(y);
        cordsArr[2] = cordsArr[2] ?? 2;
        updateCords(cordsArr[0], cordsArr[1]);
    
    }
});

window.addEventListener("mousemove", event => {

    if (down) {
        updateCords(
            down[0] - event.x,
            down[1] - event.y
        );
    } else {
        updateCords(
            cordsArr[0] + event.x,
            cordsArr[1] + event.y
        );
    }
});

window.addEventListener("mousedown", event => down = [event.x, event.y]);
window.addEventListener("mouseup", event => {
    if (down) {
        cordsArr[0] -= down[0] - event.x;
        cordsArr[1] -= down[1] - event.y;
        updateCords(cordsArr[0], cordsArr[1]);
        down = null;
    }
});

window.addEventListener("keypress", event => {
    if (event.key === "+") {
        cordsArr[2]++;
    } else if (event.key === "-") {
        cordsArr[2]--;
    }
});