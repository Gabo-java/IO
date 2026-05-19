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
    const totalOferta = oferta.reduce((sum, value) => sum + value, 0);
    const totalDemanda = demanda.reduce((sum, value) => sum + value, 0);
    const desbalance = totalOferta - totalDemanda;
    const modelo = balancearModeloTransporte(costos, oferta, demanda);
    const asignaciones = modelo.costos.map((row) => row.map(() => 0));
    const ofertaTemp = [...modelo.oferta];
    const demandaTemp = [...modelo.demanda];

    if (desbalance !== 0) {
        pasosHTML += `
            <div class="warning-box">
                El modelo no estaba balanceado. Oferta total: ${totalOferta}, demanda total: ${totalDemanda}, desbalance: ${desbalance}.
                ${modelo.balanceMessage}
            </div>
        `;
    }

    while (i < modelo.oferta.length && j < modelo.demanda.length) {
        const cantidad = Math.min(ofertaTemp[i], demandaTemp[j]);
        const subtotal = cantidad * modelo.costos[i][j];
        total += subtotal;
        asignaciones[i][j] = cantidad;

        pasosHTML += `
            <div class="paso">
                <h3>Paso ${step}</h3>
                <p>Asignar <strong>${cantidad}</strong> unidades desde ${modelo.origenes[i]} hacia ${modelo.destinos[j]}</p>
                <p>Costo unitario: ${modelo.costos[i][j]} | Subtotal: ${formatMoney(subtotal)}</p>
                <p>Costo acumulado: ${formatMoney(total)}</p>
            </div>
        `;

        ofertaTemp[i] -= cantidad;
        demandaTemp[j] -= cantidad;

        if (ofertaTemp[i] === 0 && demandaTemp[j] === 0) {
            i++;
            j++;
        } else if (ofertaTemp[i] === 0) {
            i++;
        } else {
            j++;
        }
        step++;
    }

    const finalTableHTML = renderMatrizFinal(
        asignaciones,
        modelo,
        total,
        "Matriz Final - Esquina Noroeste",
        "Costo Total por Esquina Noroeste",
        "Esta es la primera solucion factible. A partir de esta matriz se aplica MODI para optimizar."
    );
    const modiResult = resolverMODI(modelo.costos, asignaciones);
    const modiHTML = renderMODIResult(modiResult, modelo);

    const result = document.getElementById("resultado");
    result.className = "";
    result.innerHTML = `
        <div class="result-section">
            <h2>Procedimiento Paso a Paso</h2>
            ${pasosHTML}
        </div>
        ${finalTableHTML}
        ${modiHTML}
    `;
}

function balancearModeloTransporte(costos, oferta, demanda) {
    const costosBalanceados = costos.map((row) => [...row]);
    const ofertaBalanceada = [...oferta];
    const demandaBalanceada = [...demanda];
    const origenes = oferta.map((_, index) => `O${index + 1}`);
    const destinos = demanda.map((_, index) => `D${index + 1}`);
    const totalOferta = oferta.reduce((sum, value) => sum + value, 0);
    const totalDemanda = demanda.reduce((sum, value) => sum + value, 0);
    const diferencia = totalOferta - totalDemanda;
    let balanceMessage = "";

    if (diferencia > 0) {
        demandaBalanceada.push(diferencia);
        destinos.push(`D${destinos.length + 1} (Ficticio)`);
        for (const row of costosBalanceados) {
            row.push(0);
        }
        balanceMessage = `Se agrego un destino ficticio con demanda ${diferencia} y costos 0.`;
    } else if (diferencia < 0) {
        const faltante = Math.abs(diferencia);
        ofertaBalanceada.push(faltante);
        origenes.push(`O${origenes.length + 1} (Ficticio)`);
        costosBalanceados.push(demanda.map(() => 0));
        balanceMessage = `Se agrego un origen ficticio con oferta ${faltante} y costos 0.`;
    }

    return {
        costos: costosBalanceados,
        oferta: ofertaBalanceada,
        demanda: demandaBalanceada,
        origenes,
        destinos,
        balanceMessage
    };
}

function renderMatrizFinal(asignaciones, modelo, total, title, costLabel, note = "") {
    let html = '<div class="result-section final-matrix-section">';
    html += `<h2>${title}</h2>`;
    html += '<div class="table-wrap"><table class="transport-table final-matrix">';

    html += "<tr><th></th>";
    for (let j = 0; j < modelo.destinos.length; j++) {
        html += `<th>${modelo.destinos[j]}</th>`;
    }
    html += "<th>Oferta</th></tr>";

    for (let i = 0; i < modelo.oferta.length; i++) {
        html += `<tr><th>${modelo.origenes[i]}</th>`;
        for (let j = 0; j < modelo.demanda.length; j++) {
            const value = asignaciones[i][j];
            html += `<td class="${value > 0 ? "assigned-cell" : ""}">${value}</td>`;
        }
        html += `<td class="offer-cell">${modelo.oferta[i]}</td></tr>`;
    }

    html += "<tr><th>Demanda</th>";
    for (let j = 0; j < modelo.demanda.length; j++) {
        html += `<td class="demand-cell">${modelo.demanda[j]}</td>`;
    }
    html += "<td></td></tr>";
    html += "</table></div>";
    html += `<div class="total">${costLabel} = ${formatMoney(total)}</div>`;
    if (note !== "") {
        html += `<div class="transport-note">${note}</div>`;
    }
    html += "</div>";
    return html;
}

function formatMoney(value) {
    return Number(value).toFixed(2);
}

function resolverMODI(costos, asignacionesIniciales) {
    const allocations = asignacionesIniciales.map((row) => [...row]);
    const rows = costos.length;
    const cols = costos[0].length;
    const basis = allocations.map((row) => row.map((value) => value > 0));
    const iterations = [];

    asegurarBaseNoDegenerada(basis, allocations);

    for (let iteration = 1; iteration <= 50; iteration++) {
        const potentials = calcularPotenciales(costos, basis);
        const deltas = calcularCostosReducidos(costos, basis, potentials.u, potentials.v);
        const entering = buscarCeldaEntrante(deltas);
        const totalBefore = calcularCostoTotal(costos, allocations);

        if (!entering) {
            return {
                optimal: true,
                iterations,
                allocations,
                basis,
                total: totalBefore,
                message: "Todos los costos reducidos son no negativos. La solucion es optima."
            };
        }

        const loop = construirCiclo(basis, entering);
        const minusCells = loop.filter((_, index) => index % 2 === 1);
        const theta = Math.min(...minusCells.map((cell) => allocations[cell.i][cell.j]));
        const leaving = minusCells.find((cell) => allocations[cell.i][cell.j] === theta);

        for (let k = 0; k < loop.length; k++) {
            const cell = loop[k];
            if (k % 2 === 0) {
                allocations[cell.i][cell.j] += theta;
            } else {
                allocations[cell.i][cell.j] -= theta;
                if (Math.abs(allocations[cell.i][cell.j]) < 1e-9) {
                    allocations[cell.i][cell.j] = 0;
                }
            }
        }

        basis[entering.i][entering.j] = true;
        basis[leaving.i][leaving.j] = false;
        asegurarBaseNoDegenerada(basis, allocations);

        iterations.push({
            iteration,
            u: potentials.u,
            v: potentials.v,
            deltas,
            entering,
            loop,
            theta,
            leaving,
            totalBefore,
            totalAfter: calcularCostoTotal(costos, allocations)
        });
    }

    return {
        optimal: false,
        iterations,
        allocations,
        basis,
        total: calcularCostoTotal(costos, allocations),
        message: "Se alcanzo el maximo de iteraciones de MODI."
    };
}

function asegurarBaseNoDegenerada(basis, allocations) {
    const rows = basis.length;
    const cols = basis[0].length;
    const required = rows + cols - 1;

    while (contarBasicas(basis) < required) {
        let added = false;

        for (let i = 0; i < rows && !added; i++) {
            for (let j = 0; j < cols && !added; j++) {
                if (!basis[i][j] && !creaCicloAlAgregar(basis, i, j)) {
                    basis[i][j] = true;
                    allocations[i][j] = 0;
                    added = true;
                }
            }
        }

        if (!added) {
            break;
        }
    }
}

function contarBasicas(basis) {
    return basis.reduce((count, row) => {
        return count + row.filter(Boolean).length;
    }, 0);
}

function creaCicloAlAgregar(basis, row, col) {
    const graph = construirGrafoBase(basis);
    const start = `r${row}`;
    const target = `c${col}`;
    return existeRuta(graph, start, target);
}

function calcularPotenciales(costos, basis) {
    const rows = costos.length;
    const cols = costos[0].length;
    const u = Array(rows).fill(null);
    const v = Array(cols).fill(null);
    u[0] = 0;

    let changed = true;
    while (changed) {
        changed = false;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (!basis[i][j]) continue;

                if (u[i] !== null && v[j] === null) {
                    v[j] = costos[i][j] - u[i];
                    changed = true;
                } else if (u[i] === null && v[j] !== null) {
                    u[i] = costos[i][j] - v[j];
                    changed = true;
                }
            }
        }
    }

    return {
        u: u.map((value) => value ?? 0),
        v: v.map((value) => value ?? 0)
    };
}

function calcularCostosReducidos(costos, basis, u, v) {
    return costos.map((row, i) => {
        return row.map((cost, j) => {
            if (basis[i][j]) {
                return null;
            }
            return cost - (u[i] + v[j]);
        });
    });
}

function buscarCeldaEntrante(deltas) {
    let best = null;

    for (let i = 0; i < deltas.length; i++) {
        for (let j = 0; j < deltas[i].length; j++) {
            const value = deltas[i][j];
            if (value === null || value >= 0) continue;

            if (!best || value < best.value) {
                best = { i, j, value };
            }
        }
    }

    return best;
}

function construirCiclo(basis, entering) {
    const graph = construirGrafoBase(basis);
    const path = buscarRutaConCeldas(graph, `r${entering.i}`, `c${entering.j}`);
    return [entering, ...path.reverse()];
}

function construirGrafoBase(basis) {
    const graph = {};

    for (let i = 0; i < basis.length; i++) {
        for (let j = 0; j < basis[i].length; j++) {
            if (!basis[i][j]) continue;

            const rowNode = `r${i}`;
            const colNode = `c${j}`;
            graph[rowNode] = graph[rowNode] || [];
            graph[colNode] = graph[colNode] || [];
            graph[rowNode].push({ node: colNode, cell: { i, j } });
            graph[colNode].push({ node: rowNode, cell: { i, j } });
        }
    }

    return graph;
}

function existeRuta(graph, start, target) {
    const queue = [start];
    const visited = new Set([start]);

    while (queue.length > 0) {
        const node = queue.shift();
        if (node === target) {
            return true;
        }

        for (const edge of graph[node] || []) {
            if (!visited.has(edge.node)) {
                visited.add(edge.node);
                queue.push(edge.node);
            }
        }
    }

    return false;
}

function buscarRutaConCeldas(graph, start, target) {
    const queue = [{ node: start, path: [] }];
    const visited = new Set([start]);

    while (queue.length > 0) {
        const current = queue.shift();
        if (current.node === target) {
            return current.path;
        }

        for (const edge of graph[current.node] || []) {
            if (!visited.has(edge.node)) {
                visited.add(edge.node);
                queue.push({
                    node: edge.node,
                    path: [...current.path, edge.cell]
                });
            }
        }
    }

    throw new Error("No fue posible construir el ciclo de mejora MODI.");
}

function calcularCostoTotal(costos, allocations) {
    let total = 0;
    for (let i = 0; i < costos.length; i++) {
        for (let j = 0; j < costos[i].length; j++) {
            total += costos[i][j] * allocations[i][j];
        }
    }
    return total;
}

function renderMODIResult(result, modelo) {
    let html = '<div class="result-section">';
    html += "<h2>Optimizacion por Metodo MODI</h2>";

    if (result.iterations.length === 0) {
        html += '<div class="summary-box">La solucion inicial de Esquina Noroeste ya es optima segun MODI.</div>';
    } else {
        for (const iteration of result.iterations) {
            html += renderMODIIteration(iteration, modelo);
        }
    }

    html += `<div class="summary-box"><strong>${result.message}</strong></div>`;
    html += renderMatrizFinal(
        result.allocations,
        modelo,
        result.total,
        "Matriz Optima - MODI",
        "Costo Minimo"
    );
    html += "</div>";
    return html;
}

function renderMODIIteration(iteration, modelo) {
    const enteringName = `${modelo.origenes[iteration.entering.i]} - ${modelo.destinos[iteration.entering.j]}`;
    const leavingName = `${modelo.origenes[iteration.leaving.i]} - ${modelo.destinos[iteration.leaving.j]}`;
    const loopText = iteration.loop.map((cell, index) => {
        const sign = index % 2 === 0 ? "+" : "-";
        return `${sign}(${modelo.origenes[cell.i]}, ${modelo.destinos[cell.j]})`;
    }).join(" ");

    return `
        <div class="iteration-card">
            <h3>Iteracion MODI ${iteration.iteration}</h3>
            <p><strong>Celda entrante:</strong> ${enteringName} con costo reducido ${formatMoney(iteration.entering.value)}</p>
            <p><strong>Ciclo:</strong> ${loopText}</p>
            <p><strong>Theta:</strong> ${thetaText(iteration.theta)} | <strong>Celda saliente:</strong> ${leavingName}</p>
            <p><strong>Costo anterior:</strong> ${formatMoney(iteration.totalBefore)} | <strong>Costo nuevo:</strong> ${formatMoney(iteration.totalAfter)}</p>
        </div>
    `;
}

function thetaText(value) {
    return Number.isInteger(value) ? String(value) : formatMoney(value);
}
