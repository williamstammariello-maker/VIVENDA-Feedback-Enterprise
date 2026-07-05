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

    const payload = {

        caserma: APP_CONFIG.caserma,

        dispositivo: APP_CONFIG.dispositivo,

        puntoDistribuzione: APP_CONFIG.puntoDistribuzione,

        servizio: APP_CONFIG.servizio || "",

        livello: livello.nome,

        peso: livello.voto,

        uuid: window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : Date.now().toString() + Math.random().toString(36).substring(2),

        userAgent: navigator.userAgent

    };

    try {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify(payload)

        });

        if (!response.ok) {

            throw new Error("Errore HTTP");

        }

        const json = await response.json();

        if (!json.success) {

            throw new Error(json.error);

        }

        localStorage.setItem("ultimoVoto", Date.now().toString());

        console.log("Voto registrato");

        await heartbeat();

        mostraGrazie();

    } catch (e) {

    console.error(e);

    alert("ERRORE:\n\n" + e.message);

}

    setTimeout(() => {

        invioInCorso = false;

        document.querySelectorAll(".vote-card").forEach(c => {

            c.style.pointerEvents = "auto";
            c.style.transform = "";
            c.style.opacity = "1";

        });

    }, APP_CONFIG.lockSeconds * 1000);

}

/* ==========================================================
   PAGINA GRAZIE
========================================================== */

function mostraGrazie() {

    console.log("MOSTRA GRAZIE");

    const vote = document.getElementById("votePage");
    const thanks = document.getElementById("thanksPage");

    if (!vote) {
        console.error("votePage NON trovato");
        return;
    }

    if (!thanks) {
        console.error("thanksPage NON trovato");
        return;
    }

    vote.classList.add("hidden");
    thanks.classList.remove("hidden");

    setTimeout(() => {

        thanks.classList.add("hidden");
        vote.classList.remove("hidden");

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