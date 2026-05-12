function crearTabla() {
    const rows = parseInt(document.getElementById("rows").value) || 3;
    const cols = parseInt(document.getElementById("cols").value) || 3;

    let html = "<table>";

    html += "<tr><th></th>";
    for (let j = 0; j < cols; j++) {
        html += `<th>D${j + 1}</th>`;
    }

    html += "<th class='th-oferta'>Oferta</th></tr>";

    for (let i = 0; i < rows; i++) {
        html += `<tr><th>O${i + 1}</th>`;

        for (let j = 0; j < cols; j++) {
            //Elimine los ceros de inicio
            html += `<td><input type="number" id="c_${i}_${j}"></td>`;
        }

        //Las celdas de oferte ahora son de color verde para claridad con el usuario
        html += `<td class='td-oferta'><input type="number" id="s_${i}"></td>`;
        html += "</tr>";
    }

    //Misma logica para que la oferta pero para demanda y de color rojo
    html += "<tr><th class='th-demanda'>Demanda</th>";
    for (let j = 0; j < cols; j++) {
        html += `<td class='td-demanda'><input type="number" id="d_${j}"></td>`;
    }

    html += "<td></td></tr>";
    html += "</table>";

    document.getElementById("tabla-container").innerHTML = html;
}

function resolver() {
    const rows = parseInt(document.getElementById("rows").value);
    const cols = parseInt(document.getElementById("cols").value);

    let costos = [];
    let oferta = [];
    let demanda = [];
    let totalOferta = 0;
    let totalDemanda = 0;

    for (let i = 0; i < rows; i++) {
        costos[i] = [];
        for (let j = 0; j < cols; j++) {
            costos[i][j] = parseFloat(document.getElementById(`c_${i}_${j}`).value) || 0;
        }
        let valOferta = parseFloat(document.getElementById(`s_${i}`).value) || 0;
        oferta[i] = valOferta;
        totalOferta += valOferta;
    }

    for (let j = 0; j < cols; j++) {
        let valDemanda = parseFloat(document.getElementById(`d_${j}`).value) || 0;
        demanda[j] = valDemanda;
        totalDemanda += valDemanda;
    }

    // Validación de Desbalanceo
    const resultadoDiv = document.getElementById("resultado");
    if (totalOferta !== totalDemanda) {
        let diff = Math.abs(totalOferta - totalDemanda);
        let mensaje = (totalOferta < totalDemanda) 
            ? `El ejercicio se encuentra desbalanceado por favor ingresa <strong style="color: #00ff3c;">${diff}</strong> unidades a la oferta.` 
            : `El ejercicio se encuentra desbalanceado por favor ingresa <strong style="color: #c20013;">${diff}</strong> unidades a la demanda.`;
        
        resultadoDiv.innerHTML = `<div class="desbalance">${mensaje}</div>`;
        return; 
    }

    esquinaNoroeste(costos, oferta, demanda);
}

function esquinaNoroeste(costos, oferta, demanda) {
    let i = 0;   //Oferta                                           //Iniciarlizar var, i ,j total, y para los pasos
    let j = 0;    //Demanda
    let total = 0; //total
    let pasosHTML = "<h2>Procedimiento Paso a Paso</h2>";

    const filas = oferta.length;
    const columnas = demanda.length;
    
    // Matriz para almacenar las asignaciones finales
    let asignaciones = Array.from({ length: filas }, () => Array(columnas).fill(0));

    const ofertaTemp = [...oferta];  //copias de las variables para usarlas en la rpta y no modificar la comparacion del original
    const demandaTemp = [...demanda];

    while (i < oferta.length && j < demanda.length) {  // mientra i < longitud de la oferta y j igual con la demanda (que no se haya recorrido todo)
        const cantidad = Math.min(ofertaTemp[i], demandaTemp[j]);  //Asigna el min entre oferta u demanda
        
        asignaciones[i][j] = cantidad; 
        const costoPaso = cantidad * costos[i][j];
        total += costoPaso; //Calculo de la asignación

        pasosHTML += ` 
            <div class="paso">
                <h3>Paso ${i + j + 1}</h3>
                <p>
                    Asignar ${cantidad} unidades
                    desde O${i + 1} hacia D${j + 1}
                </p>
                <p>
                    Costo unitario: ${costos[i][j]} | Subtotal: ${costoPaso.toFixed(2)}
                </p>
                <p>
                    Costo acumulado: ${total.toFixed(2)}
                </p>
            </div>
        `;

        ofertaTemp[i] -= cantidad;  //resta la cantidad a las temporales
        demandaTemp[j] -= cantidad;

        if (ofertaTemp[i] === 0 && i < filas - 1) {
            i++; //si el origen se lleno sigue para abajo
        } else {
            j++; //si no sigue a la derecha tipo matriz
        }
    }

    // Construccion de la tabla ya "optimizada"
    let tablaFinalHTML = "<h2>Matriz Final</h2><table>";
    tablaFinalHTML += "<tr><th></th>";
    for (let c = 0; c < columnas; c++) {
        tablaFinalHTML += `<th>D${c + 1}</th>`;
    }
    tablaFinalHTML += "<th class='th-oferta'>Oferta</th></tr>";

    for (let r = 0; r < filas; r++) {
        tablaFinalHTML += `<tr><th>O${r + 1}</th>`;
        for (let c = 0; c < columnas; c++) {
            const valor = asignaciones[r][c];
            tablaFinalHTML += `<td>${valor > 0 ? `<strong>${valor}</strong>` : 0}</td>`;
        }
        tablaFinalHTML += `<td class='td-oferta'>${oferta[r]}</td>`;
        tablaFinalHTML += "</tr>";
    }

    tablaFinalHTML += "<tr><th class='th-demanda'>Demanda</th>";
    for (let c = 0; c < columnas; c++) {
        tablaFinalHTML += `<td class='td-demanda'>${demanda[c]}</td>`;
    }
    tablaFinalHTML += "<td></td></tr></table>";

    //Muestra el resultado de los pasos
    document.getElementById("resultado").innerHTML = `
        ${pasosHTML}
        <hr style="margin: 40px 0; border: 0; border-top: 1px solid #ccc;">
        ${tablaFinalHTML}
        <div class="total" style="margin-top: 20px;">
            Costo Total = ${total.toFixed(2)}
        </div>
    `;
}

//inicializa la tabla de resultado
crearTabla();