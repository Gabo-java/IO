function crearTablaTransporte() {
    const rows = parsePositiveInteger("rows", "filas");
    const cols = parsePositiveInteger("cols", "columnas");
    let html = '<div class="table-wrap"><table class="transport-table">';

    html += "<tr><th></th>";
    for (let j = 0; j < cols; j++) {
        html += `<th>D${j + 1}</th>`;
    }
    html += "<th>Oferta</th></tr>";

    for (let i = 0; i < rows; i++) {
        html += `<tr><th>O${i + 1}</th>`;
        for (let j = 0; j < cols; j++) {
            html += `<td><input type="number" id="c_${i}_${j}" value="0"></td>`;
        }
        html += `<td class="offer-cell"><input type="number" id="s_${i}" value="0"></td></tr>`;
    }

    html += "<tr><th>Demanda</th>";
    for (let j = 0; j < cols; j++) {
        html += `<td class="demand-cell"><input type="number" id="d_${j}" value="0"></td>`;
    }

    html += "<td></td></tr></table></div>";
    document.getElementById("tabla-container").innerHTML = html;
}

function cargarEjemploTransporte() {
    document.getElementById("rows").value = 3;
    document.getElementById("cols").value = 3;
    crearTablaTransporte();

    const costos = [
        [8, 6, 10],
        [9, 7, 4],
        [3, 4, 2]
    ];
    const oferta = [20, 30, 25];
    const demanda = [10, 35, 30];

    for (let i = 0; i < costos.length; i++) {
        for (let j = 0; j < costos[i].length; j++) {
            document.getElementById(`c_${i}_${j}`).value = costos[i][j];
        }
        document.getElementById(`s_${i}`).value = oferta[i];
    }

    for (let j = 0; j < demanda.length; j++) {
        document.getElementById(`d_${j}`).value = demanda[j];
    }
}

function resolverTransporte() {
    const rows = parsePositiveInteger("rows", "filas");
    const cols = parsePositiveInteger("cols", "columnas");
    const costos = [];
    const oferta = [];
    const demanda = [];

    for (let i = 0; i < rows; i++) {
        costos[i] = [];
        for (let j = 0; j < cols; j++) {
            costos[i][j] = readNumber(`c_${i}_${j}`);
        }
        oferta[i] = readNumber(`s_${i}`);
    }

    for (let j = 0; j < cols; j++) {
        demanda[j] = readNumber(`d_${j}`);
    }

    esquinaNoroeste(costos, oferta, demanda);
}

function esquinaNoroeste(costos, oferta, demanda) {
    let i = 0;
    let j = 0;
    let total = 0;
    let step = 1;
    let pasosHTML = "";
    const asignaciones = costos.map((row) => row.map(() => 0));
    const ofertaTemp = [...oferta];
    const demandaTemp = [...demanda];
    const totalOferta = oferta.reduce((sum, value) => sum + value, 0);
    const totalDemanda = demanda.reduce((sum, value) => sum + value, 0);
    const desbalance = totalOferta - totalDemanda;

    if (desbalance !== 0) {
        pasosHTML += `
            <div class="warning-box">
                El modelo no esta balanceado. Oferta total: ${totalOferta}, demanda total: ${totalDemanda}, desbalance: ${desbalance}.
            </div>
        `;
    }

    while (i < oferta.length && j < demanda.length) {
        const cantidad = Math.min(ofertaTemp[i], demandaTemp[j]);
        const subtotal = cantidad * costos[i][j];
        total += subtotal;
        asignaciones[i][j] = cantidad;

        pasosHTML += `
            <div class="paso">
                <h3>Paso ${step}</h3>
                <p>Asignar <strong>${cantidad}</strong> unidades desde O${i + 1} hacia D${j + 1}</p>
                <p>Costo unitario: ${costos[i][j]} | Subtotal: ${formatMoney(subtotal)}</p>
                <p>Costo acumulado: ${formatMoney(total)}</p>
            </div>
        `;

        ofertaTemp[i] -= cantidad;
        demandaTemp[j] -= cantidad;

        if (ofertaTemp[i] === 0) {
            i++;
        } else {
            j++;
        }
        step++;
    }

    const finalTableHTML = renderMatrizFinal(asignaciones, oferta, demanda, total);

    const result = document.getElementById("resultado");
    result.className = "";
    result.innerHTML = `
        <div class="result-section">
            <h2>Procedimiento Paso a Paso</h2>
            ${pasosHTML}
        </div>
        ${finalTableHTML}
    `;
}

function renderMatrizFinal(asignaciones, oferta, demanda, total) {
    let html = '<div class="result-section final-matrix-section">';
    html += "<h2>Matriz Final</h2>";
    html += '<div class="table-wrap"><table class="transport-table final-matrix">';

    html += "<tr><th></th>";
    for (let j = 0; j < demanda.length; j++) {
        html += `<th>D${j + 1}</th>`;
    }
    html += "<th>Oferta</th></tr>";

    for (let i = 0; i < oferta.length; i++) {
        html += `<tr><th>O${i + 1}</th>`;
        for (let j = 0; j < demanda.length; j++) {
            const value = asignaciones[i][j];
            html += `<td class="${value > 0 ? "assigned-cell" : ""}">${value}</td>`;
        }
        html += `<td class="offer-cell">${oferta[i]}</td></tr>`;
    }

    html += "<tr><th>Demanda</th>";
    for (let j = 0; j < demanda.length; j++) {
        html += `<td class="demand-cell">${demanda[j]}</td>`;
    }
    html += "<td></td></tr>";
    html += "</table></div>";
    html += `<div class="total">Costo Total = ${formatMoney(total)}</div>`;
    html += "</div>";
    return html;
}

function formatMoney(value) {
    return Number(value).toFixed(2);
}
