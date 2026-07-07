const API_URL =
  "https://script.google.com/macros/s/AKfycbwdX262NC2ZQRoob-63Ort2FALNi9xskc9uGYwdM0sq8zAHiir-1R9Vxp4nRtqEPjfS/exec";

let barChart = null;
let pieChart = null;
let trendChart = null;
let dashboardData = null;
let loading = false;

document.addEventListener("DOMContentLoaded", () => {

    loadDashboard();

    
loading = trueasync function loadDashboard(){

    if (loading) return;

    loading = true;

    try{

        updateBackendStatus(false);

        const response = await fetch(
            `${API_URL}?action=dashboard&t=${Date.now()}`,
            {
                cache:"no-store"
            }
        );

        const result = await response.json();

        if(!result.success){
            throw new Error("Errore API");
        }

        dashboardData = result.data;

        document.title =
            `VIVENDA Dashboard • ${dashboardData.totale} feedback`;

        updateBackendStatus(true);

        updateCards(dashboardData);

        updateCharts(dashboardData);

        updateTable(dashboardData.ultimi);

        updateDateTime();

    } catch(err){

        console.error(err);

        updateBackendStatus(false);

    } finally {

        loading = false;

    }

};

    document
        .getElementById("btnRefresh")
        ?.addEventListener("click", loadDashboard);

    document
        .getElementById("filterServizio")
        ?.addEventListener("change", filterDashboard);

    setInterval(() => {

    if (!document.hidden) {

        loadDashboard();

    }

},30000);
loading = false;
});

async function loadDashboard(){

    try{

        updateBackendStatus(false);

        const response = await fetch(

            `${API_URL}?action=dashboard&t=${Date.now()}`,

            {
                cache:"no-store"
            }

        );

        const result = await response.json();

        console.log(result);

        if(!result.success){

            throw new Error("Errore API");

        }

        dashboardData=result.data;

        document.title =
`VIVENDA Dashboard • ${dashboardData.totale} feedback`;

        updateBackendStatus(true);

        updateCards(dashboardData);

        updateCharts(dashboardData);

        updateTable(dashboardData.ultimi);

        updateDateTime();

    }

    catch(err){

        console.error(err);

        updateBackendStatus(false);

        loading = false;

    }

}

function updateCards(data){

    document.getElementById("ottimo").textContent =
        data.livelli.Ottimo || 0;

    document.getElementById("buono").textContent =
        data.livelli.Buono || 0;

    document.getElementById("sufficiente").textContent =
        data.livelli.Sufficiente || 0;

    document.getElementById("mediocre").textContent =
        data.livelli.Mediocre || 0;

    document.getElementById("insufficiente").textContent =
        data.livelli.Insufficiente || 0;

    document.getElementById("media").textContent =
        Number(data.media).toFixed(2);

    document.getElementById("totaleFeedback").textContent =
        data.totale;

    const percentuale =
    data.percentualeOttimo ??
    (
        data.totale > 0
            ? ((data.livelli.Ottimo / data.totale) * 100).toFixed(1)
            : 0
    );

document.getElementById("percentualeOttimo").textContent =
    percentuale + "%";

    document.getElementById("dispositiviAttivi").textContent =
    data.dispositiviAttivi ?? 1;

    document.getElementById("ultimoVoto").textContent =
    data.ultimoVoto?.ora ??
    data.ultimi?.[0]?.ora ??
    "--:--";

}

function updateCharts(data){

    drawBarChart(data.livelli);

    drawPieChart(data.livelli);

    drawTrendChart(data.trend30);

}

function drawBarChart(livelli){

    const canvas = document.getElementById("feedbackChart");

    if(!canvas) return;

    const ctx = canvas.getContext("2d");

    if(barChart){

        barChart.destroy();

    }

    barChart = new Chart(ctx,{

        type:"bar",

        data:{

            labels:[
                "Ottimo",
                "Buono",
                "Sufficiente",
                "Mediocre",
                "Insufficiente"
            ],

            datasets:[{

                label:"Feedback",

                data:[

                    livelli.Ottimo || 0,
                    livelli.Buono || 0,
                    livelli.Sufficiente || 0,
                    livelli.Mediocre || 0,
                    livelli.Insufficiente || 0

                ]

            }]

        },

        options:{

            responsive:true,

            maintainAspectRatio:false,

            plugins:{

                legend:{
                    display:false
                }

            },

            scales:{

                y:{
                    beginAtZero:true,
                    ticks:{
                        precision:0
                    }
                }

            }

        }

    });

}

function drawPieChart(livelli){

    const canvas=document.getElementById("feedbackPie");

    if(!canvas) return;

    if(pieChart){

        pieChart.destroy();

    }

    pieChart = new Chart(canvas,{

        type:"pie",

        data:{

            labels:[
                "Ottimo",
                "Buono",
                "Sufficiente",
                "Mediocre",
                "Insufficiente"
            ],

            datasets:[{

                data:[

                    livelli.Ottimo || 0,
                    livelli.Buono || 0,
                    livelli.Sufficiente || 0,
                    livelli.Mediocre || 0,
                    livelli.Insufficiente || 0

                ]

            }]

        },

        options:{

            responsive:true,

            plugins:{

                legend:{
                    position:"bottom"
                }

            }

        }

    });

}

function updateTable(lista){

    const tbody=document.getElementById("lastVotes");

    if(!tbody) return;

    tbody.innerHTML="";

    lista.forEach(voto=>{

        const tr=document.createElement("tr");

        const data=new Date(voto.data);

        tr.innerHTML=`

            <td>${data.toLocaleDateString("it-IT")}</td>

            <td>${voto.ora}</td>

            <td>${voto.servizio}</td>

            <td>${voto.livello}</td>

        `;

        tbody.appendChild(tr);

    });

}

function filterDashboard() {

    if (!dashboardData) return;

    const servizio = document.getElementById("filterServizio").value;

    if (servizio === "") {

        updateTable(dashboardData.ultimi);
        return;

    }

    const filtrati = dashboardData.ultimi.filter(voto =>
        voto.servizio === servizio
    );

    updateTable(filtrati);

}

function updateBackendStatus(online) {

    const el = document.getElementById("backendStatus");

    if (!el) return;

    if (online) {

        el.classList.remove("offline");
        el.classList.add("online");
        el.innerHTML = "🟢 Online";

    } else {

        el.classList.remove("online");
        el.classList.add("offline");
        el.innerHTML = "🔴 Offline";

    }

}

function updateDateTime() {

    const el = document.getElementById("dateTime");

    if (!el) return;

    const now = new Date();

    el.textContent = now.toLocaleString("it-IT");

}

window.addEventListener("focus", () => {

    loadDashboard();

});

document.addEventListener("visibilitychange", () => {

    if (!document.hidden) {

        loadDashboard();

    }

});

function drawTrendChart(trend) {

    const canvas = document.getElementById("trendChart");

    if (!canvas || !trend) return;

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(canvas, {

        type: "line",

        data: {

            labels: trend.map(t => t.data),

            datasets: [{

                label: "Media giornaliera",

                data: trend.map(t => t.media),

                tension: 0.35,

                fill: false

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    display: true

                }

            },

            scales: {

                y: {

                    min: 0,

                    max: 9

                }

            }

        }

    });

}

console.log("VIVENDA Dashboard Enterprise v1.0 caricata");