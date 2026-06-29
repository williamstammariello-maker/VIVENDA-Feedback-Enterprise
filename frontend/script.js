/* ==========================================================
   VIVENDA Feedback Enterprise v1.0
   script.js
========================================================== */

let APP_CONFIG = {};
let API_URL = "";

/* ----------------------------------------------------------
   CONFIGURAZIONE
---------------------------------------------------------- */

async function caricaConfigurazione() {

    try {

        // Legge config.json
        const risposta = await fetch("config.json");
        APP_CONFIG = await risposta.json();

        API_URL = APP_CONFIG.api;

        // Chiede la configurazione al server
        const r = await fetch(
            `${API_URL}?action=config&device=${APP_CONFIG.deviceId}`
        );

        const json = await r.json();

        if (!json.success) {
            throw new Error(json.error);
        }

        // Configurazione ricevuta dal server
        APP_CONFIG = {
            ...APP_CONFIG,
            ...json.config
        };

        console.log("Configurazione caricata", APP_CONFIG);

    } catch (err) {

        console.error(err);

        alert("Errore caricamento configurazione");

    }

};

/* ---------------------------------------------------------- */

let invioInCorso = false;

const livelli = [
  {
    nome: "Insufficiente",
    voto: 1,
    colore: "#ff3b30",
    svg: "assets/faces/insufficiente.svg"
  },
  {
    nome: "Mediocre",
    voto: 3,
    colore: "#ff9500",
    svg: "assets/faces/mediocre.svg"
  },
  {
    nome: "Sufficiente",
    voto: 5,
    colore: "#ffd60a",
    svg: "assets/faces/sufficiente.svg"
  },
  {
    nome: "Buono",
    voto: 7,
    colore: "#7ed957",
    svg: "assets/faces/buono.svg"
  },
  {
    nome: "Ottimo",
    voto: 9,
    colore: "#34c759",
    svg: "assets/faces/ottimo.svg"
  }
];

const emojiContainer = document.getElementById("emojiContainer");
const votePage = document.getElementById("votePage");
const thanksPage = document.getElementById("thanksPage");

/* ==========================================================
   CREA PULSANTI
========================================================== */

livelli.forEach((livello) => {

  const card = document.createElement("div");

  card.className = "vote-card";

  card.innerHTML = `
<div class="circle" style="background:${livello.colore}">
    <img src="${livello.svg}" alt="${livello.nome}">
</div>

<p>${livello.nome}</p>
`;

  card.addEventListener("click", () => {

      if(invioInCorso) return;

      inviaVoto(livello,card);

  });

  emojiContainer.appendChild(card);

});

/* ==========================================================
   INVIA VOTO
========================================================== */

async function inviaVoto(livello,card){

    invioInCorso=true;

    card.style.transform="scale(.90)";
    card.style.opacity=".7";

    const payload={

        caserma: APP_CONFIG.caserma,
        dispositivo:APP_CONFIG.dispositivo,
        puntoDistribuzione: APP_CONFIG.puntoDistribuzione,
        livello:livello.nome

    };

    try{

        const response=await fetch(API_URL,{

            method:"POST",

            headers:{
                "Content-Type":"text/plain;charset=utf-8"
            },

            body:JSON.stringify(payload)

        });

        if(!response.ok)
            throw new Error("Errore HTTP");

        const json=await response.json();

        if(json.success){

            mostraGrazie();

        }else{

            alert(json.error || "Errore");

        }

    }catch(e){

        console.error(e);

        alert("Errore di connessione.");

    }

    setTimeout(()=>{

        invioInCorso=false;

        card.style.transform="";
        card.style.opacity="1";

    },APP_CONFIG.lockSeconds*1000);

}

/* ==========================================================
   GRAZIE
========================================================== */

function mostraGrazie(){

    votePage.classList.add("hidden");

    thanksPage.classList.remove("hidden");

    setTimeout(()=>{

        thanksPage.classList.add("hidden");

        votePage.classList.remove("hidden");

    },APP_CONFIG.returnSeconds*1000);
}

/* ==========================================================
   SERVICE WORKER
========================================================== */

if("serviceWorker" in navigator){

    window.addEventListener("load",()=>{

        navigator.serviceWorker
        .register("sw.js")
        .catch(console.error);

    });

}

window.addEventListener("load", async () => {

    console.log("APP AVVIATA");

    await caricaConfigurazione();

    console.log("CONFIG OK");

    await heartbeat();

    console.log("HEARTBEAT OK");

});

async function heartbeat() {

    try {

        await fetch(API_URL,{

            method:"POST",

            headers:{
                "Content-Type":"text/plain;charset=utf-8"
            },

            body: JSON.stringify({

    action: "heartbeat",

    deviceId: APP_CONFIG.deviceId,

    appVersion: APP_CONFIG.version,

    os: navigator.userAgentData?.platform || navigator.platform,

    browser: navigator.userAgent,

    online: true

})

        });

    }catch(e){

        console.error(e);

    }

}