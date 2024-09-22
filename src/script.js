const { ipcRenderer } = require('electron');
const { createServer } = require("http");
const { Server } = require('socket.io');
const { SerialPort, ReadlineParser} = require("serialport");
const Logger = require("@yassinrouis/logger");
const log = new Logger;

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173", // Domaine autorisé
        methods: ["GET", "POST"], // Méthodes HTTP autorisées
        allowedHeaders: ["my-custom-header"], // Headers spécifiques autorisés
        credentials: true // Pour les requêtes avec authentification
    }
});



httpServer.listen(80);

// ========================= AUTHENTIFICATION =========================

let login_password = "12345678";

let clients = [];

io.on("connection", (socket) => {
    let isAuthenticated = false;
    log.warn("Socket connected")
    socket.on("login", (password) => {
        log.info("Log in attempt : " + password)
        if(password === login_password) {
            log.success("Logged")
            clients.push(socket);

            socket.on("disconnect", () => {
                clients = clients.filter(c => c !== socket);
            })
        } else {
            socket.disconnect();
        }
    })
});


/*ipcRenderer.on("test-out", function (event, args) {
    alert(args);
})
ipcRenderer.on("update-values", function (event, values) {
    for(let key in values) {
        document.getElementById(key).innerText = values[key];
    }
})*/


/** @type {null | SerialPort } */
let connectedPort = null;

async function init() {
    let list = await SerialPort.list();

    if(list.length === 0) {
        if(confirm("Système de capteurs non connecté, voulez-vous réessayer ?")) {
            let _ = init();
        }
    } else if (list.length === 1) {
        setup(list[0].path);
    } else {
        let message = "Plusieurs ports ont été identifiés, lequel voulez-vous vous connecter à " + list[0].path + " ?";
        if(confirm(message)) {
            setup(list[0].path)
        }
    }
}

function setup(path) {
    if (connectedPort != null) {
        connectedPort.end();
        connectedPort.destroy();
    }

    connectedPort = new SerialPort({ path: path, baudRate: 19200 })
    let parser = new ReadlineParser()
    connectedPort.pipe(parser)

    let isFirstData = true;

    parser.on('data', (data) => {
        if(isFirstData) {
            isFirstData = false;
            return;
        }
        try {
            log.log(data);
            updateValues(JSON.parse(data));
        } catch (e) {
            log.error(e)
        }
    })
}

let clock = 0;

function updateValues(data) {
    document.documentElement.style.setProperty('--clock', clock);
    clock += 1;

    for(let c of clients) {
        c.emit("data", )
    }

    for(let key in data) {
        for(let el of document.querySelectorAll(`[var="${key}"]`))
            el.innerText = data[key];

        document.documentElement.style.setProperty('--'+key, data[key]);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    init();
})