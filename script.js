/* ==========================================================
   VIVENDA Feedback Enterprise v1.1
   script.js
========================================================== */

let APP_CONFIG = {};
let API_URL = "";

let configurazioneCaricata = false;
let invioInCorso = false;

const livelli = [
    {
        nome: "Insufficiente",
        voto: 1,
        svg: "assets/faces/insufficiente.svg"
    },
    {
        nome: "Mediocre",
        voto: 3,
        svg: "assets/faces/mediocre.svg"
    },
    {
        nome: "Sufficiente",
        voto: 5,
        svg: "assets/faces/sufficiente.svg"
    },
    {
        nome: "Buono",
        voto: 7,
        svg: "assets/faces/buono.svg"
    },
    {
        nome: "Ottimo",
        voto: 9,
        svg: "assets/faces/ottimo.svg"
    }
];

const emojiContainer = document.getElementById("emojiContainer");
const votePage = document.getElementById("votePage");
const thanksPage = document.getElementById("thanksPage");
const closedPage = document.getElementById("closedPage");

emojiContainer.style.pointerEvents = "none";
emojiContainer.style.opacity = ".4";

/* ==========================================================
   CARICA CONFIGURAZIONE
========================================================== */

async function caricaConfigurazione() {

    try {

        const risposta = await fetch("config.json");
        APP_CONFIG = await risposta.json();

        API_URL = APP_CONFIG.api;

        const response = await fetch(
            `${API_URL}?action=config&device=${APP_CONFIG.deviceId}`
        );

        const json = await response.json();

        if (!json.success) {
            throw new Error(json.error);
        }

        APP_CONFIG = {
            ...APP_CONFIG,
            ...json.config
        };

        configurazioneCaricata = true;

        emojiContainer.style.pointerEvents = "auto";
        emojiContainer.style.opacity = "1";

        console.log("Configurazione caricata");

    } catch (e) {

        console.error(e);

        configurazioneCaricata = false;

        emojiContainer.style.pointerEvents = "none";
        emojiContainer.style.opacity = ".4";

        alert("Impossibile caricare la configurazione.");

    }

}

/* ==========================================================
   CREA PULSANTI
========================================================== */

livelli.forEach(livello => {

    const card = document.createElement("div");

    card.className = "vote-card";

    card.innerHTML = `
        <div class="circle">
            <img src="${livello.svg}" alt="${livello.nome}">
        </div>
        <p>${livello.nome}</p>
    `;

    card.addEventListener("click", () => {

        if (invioInCorso) return;

        inviaVoto(livello, card);

    });

    emojiContainer.appendChild(card);

});


/* ==========================================================
   INVIO VOTO
========================================================== */

async function inviaVoto(livello, card) {

    if (!configurazioneCaricata) {
        alert("Sistema in inizializzazione...");
        return;
    }

    const ultimoVoto = Number(localStorage.getItem("ultimoVoto") || 0);

    if (
        ultimoVoto &&
        Date.now() - ultimoVoto < APP_CONFIG.lockSeconds * 1000
    ) {
        return;
    }

    invioInCorso = true;

    document.querySelectorAll(".vote-card").forEach(c => {
        c.style.pointerEvents = "none";
    });

    card.style.transform = "scale(.90)";
    card.style.opacity = ".7";

    try {

        const payload = {

            caserma: APP_CONFIG.caserma,
            dispositivo: APP_CONFIG.dispositivo,
            puntoDistribuzione: APP_CONFIG.puntoDistribuzione,

            livello: livello.nome,
            peso: livello.voto,

            uuid: crypto.randomUUID(),

            userAgent: navigator.userAgent

        };

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify(payload)

        });

        const json = await response.json();

        if (!json.success) {

            if (json.code === "SERVIZIO_CHIUSO") {

                mostraServizioChiuso();
                return;

            }

            throw new Error(json.error);

        }

        localStorage.setItem(
            "ultimoVoto",
            Date.now().toString()
        );

        await heartbeat();

        mostraGrazie();

    } catch (err) {

        console.error(err);

        alert(err.message);

    } finally {

        invioInCorso = false;

        document.querySelectorAll(".vote-card").forEach(c => {

            c.style.pointerEvents = "auto";
            c.style.transform = "";
            c.style.opacity = "1";

        });

    }

}

/* ==========================================================
   PAGINA GRAZIE
========================================================== */

function mostraGrazie() {

    closedPage.classList.add("hidden");
    votePage.classList.add("hidden");
    thanksPage.classList.remove("hidden");

    setTimeout(() => {

        thanksPage.classList.add("hidden");
        votePage.classList.remove("hidden");

    }, APP_CONFIG.returnSeconds * 1000);

}


/* ==========================================================
   HEARTBEAT
========================================================== */

async function heartbeat() {

    try {

        await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify({

                action: "heartbeat",

                deviceId: APP_CONFIG.dispositivo,

                appVersion: APP_CONFIG.version,

                os: navigator.userAgentData?.platform || navigator.platform,

                browser: navigator.userAgent,

                online: true

            })

        });

    } catch (e) {

        console.error("Heartbeat:", e);

    }

}


/* ==========================================================
   AVVIO APP
========================================================== */

window.addEventListener("load", async () => {

    console.log("================================");
    console.log("VIVENDA Feedback Enterprise");
    console.log("Versione 1.1");
    console.log("================================");

    await caricaConfigurazione();

    if (configurazioneCaricata) {

        await heartbeat();

    }

});

/* ==========================================================
   SERVIZIO CHIUSO
========================================================== */

function mostraServizioChiuso() {

    votePage.classList.add("hidden");
    thanksPage.classList.add("hidden");
    closedPage.classList.remove("hidden");

    // Controlla ogni minuto se il servizio è tornato disponibile
    if (window.controlloServizio) {
        clearInterval(window.controlloServizio);
    }

    window.controlloServizio = setInterval(async () => {

        try {

            const response = await fetch(
                `${API_URL}?action=status&device=${APP_CONFIG.dispositivo}`
            );

            const json = await response.json();

            if (json.success && json.aperto) {

                clearInterval(window.controlloServizio);

                closedPage.classList.add("hidden");
                thanksPage.classList.add("hidden");
                votePage.classList.remove("hidden");

            }

        } catch (err) {

            console.error(err);

        }

    }, 60000);

}

/* ==========================================================
   SERVICE WORKER
========================================================== */

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("sw.js")
            .then(() => console.log("Service Worker registrato"))
            .catch(err => console.error(err));

    });

}