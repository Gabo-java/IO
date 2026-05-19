class SimplexMinSolver {
    constructor(c, A, b) {
        this.originalC = c;
        this.originalA = A;
        this.originalB = b;
        this.n = c.length;
        this.m = b.length;

        if (this.n === 0 || this.m === 0) {
            throw new Error("Debes ingresar al menos una variable y una restriccion.");
        }

        if (this.originalC.some((value) => value.isNegative())) {
            throw new Error("La funcion objetivo debe tener coeficientes no negativos.");
        }

        if (this.originalB.some((value) => value.isNegative())) {
            throw new Error("Todos los valores del lado derecho deben cumplir b >= 0.");
        }

        for (const row of this.originalA) {
            if (row.some((value) => value.isNegative())) {
                throw new Error("Los coeficientes de las restricciones deben ser no negativos.");
            }
        }

        this.xNames = Array.from({ length: this.n }, (_, index) => `x${index + 1}`);
        this.eNames = Array.from({ length: this.m }, (_, index) => `E${index + 1}`);
        this.varNames = [...this.xNames, ...this.eNames];
        this.cj = [...this.originalC, ...Array.from({ length: this.m }, () => FractionValue.zero())];

        this.rows = [];
        for (let i = 0; i < this.m; i++) {
            const row = this.originalA[i].map((value) => value.neg());
            for (let k = 0; k < this.m; k++) {
                row.push(k === i ? new FractionValue(1n) : FractionValue.zero());
            }
            this.rows.push(row);
        }

        this.b = this.originalB.map((value) => value.neg());
        this.basis = Array.from({ length: this.m }, (_, index) => this.n + index);
        this.iterations = [];
        this.optimal = false;
        this.infeasible = false;
        this.status = "No resuelto";
        this.type = "min";
        this.objectiveLabel = "Min";
        this.zLabel = "Z minimo";
        this.constraintSymbol = ">=";
        this.restrictionMeasureLabel = "Exceso";
    }

    computeRows() {
        const cb = this.basis.map((index) => this.cj[index]);
        const zj = [];

        for (let j = 0; j < this.varNames.length; j++) {
            let value = FractionValue.zero();
            for (let i = 0; i < this.m; i++) {
                value = value.add(cb[i].mul(this.rows[i][j]));
            }
            zj.push(value);
        }

        let zValue = FractionValue.zero();
        for (let i = 0; i < this.m; i++) {
            zValue = zValue.add(cb[i].mul(this.b[i]));
        }

        const cz = this.cj.map((value, index) => value.sub(zj[index]));
        return { cb, zj, zValue, cz };
    }

    chooseLeavingRow() {
        let minIndex = 0;
        for (let i = 1; i < this.b.length; i++) {
            if (this.b[i].compare(this.b[minIndex]) < 0) {
                minIndex = i;
            }
        }
        return this.b[minIndex].isNegative() ? minIndex : null;
    }

    chooseEnteringCol(leaveRow, cz) {
        const ratios = Array.from({ length: this.varNames.length }, () => "");
        const candidates = [];

        for (let j = 0; j < this.varNames.length; j++) {
            const aij = this.rows[leaveRow][j];
            if (aij.isNegative()) {
                const ratio = cz[j].div(aij.neg());
                ratios[j] = ratio.toString();
                candidates.push({ ratio, col: j });
            }
        }

        if (candidates.length === 0) {
            return { enter: null, ratios };
        }

        candidates.sort((a, b) => {
            const comparison = a.ratio.compare(b.ratio);
            return comparison === 0 ? a.col - b.col : comparison;
        });

        return { enter: candidates[0].col, ratios };
    }

    pivot(leaveRow, enterCol) {
        const pivot = this.rows[leaveRow][enterCol];

        this.rows[leaveRow] = this.rows[leaveRow].map((value) => value.div(pivot));
        this.b[leaveRow] = this.b[leaveRow].div(pivot);

        for (let i = 0; i < this.m; i++) {
            if (i === leaveRow) continue;

            const factor = this.rows[i][enterCol];
            if (!factor.isZero()) {
                this.rows[i] = this.rows[i].map((value, j) => {
                    return value.sub(factor.mul(this.rows[leaveRow][j]));
                });
                this.b[i] = this.b[i].sub(factor.mul(this.b[leaveRow]));
            }
        }

        this.basis[leaveRow] = enterCol;
    }

    saveState(iteration, computed, leave = null, enter = null, ratios = null, pivot = null) {
        this.iterations.push({
            iteration,
            basis: [...this.basis],
            cb: [...computed.cb],
            rows: this.rows.map((row) => [...row]),
            b: [...this.b],
            zj: [...computed.zj],
            zValue: computed.zValue,
            cz: [...computed.cz],
            leave,
            enter,
            ratios: ratios ? [...ratios] : Array.from({ length: this.varNames.length }, () => ""),
            pivot
        });
    }

    solve(maxIterations = 50) {
        for (let iteration = 0; iteration <= maxIterations; iteration++) {
            const computed = this.computeRows();

            if (computed.cz.some((value) => value.isNegative())) {
                this.saveState(iteration, computed);
                this.status = "Modelo fuera del alcance de esta version";
                return;
            }

            const leave = this.chooseLeavingRow();
            if (leave === null) {
                this.saveState(iteration, computed);
                this.optimal = true;
                this.status = "Optimo";
                return;
            }

            const { enter, ratios } = this.chooseEnteringCol(leave, computed.cz);
            if (enter === null) {
                this.saveState(iteration, computed, leave, null, ratios, null);
                this.infeasible = true;
                this.status = "Problema infactible";
                return;
            }

            const pivot = this.rows[leave][enter];
            this.saveState(iteration, computed, leave, enter, ratios, pivot);
            this.pivot(leave, enter);
        }

        this.status = "Maximo numero de iteraciones alcanzado";
    }

    getSolution() {
        const values = {};
        for (const name of this.varNames) {
            values[name] = FractionValue.zero();
        }

        for (let i = 0; i < this.basis.length; i++) {
            values[this.varNames[this.basis[i]]] = this.b[i];
        }

        const xValues = this.xNames.map((name) => values[name]);
        let z = FractionValue.zero();
        for (let j = 0; j < this.n; j++) {
            z = z.add(this.originalC[j].mul(xValues[j]));
        }

        const excesses = [];
        for (let i = 0; i < this.m; i++) {
            let lhs = FractionValue.zero();
            for (let j = 0; j < this.n; j++) {
                lhs = lhs.add(this.originalA[i][j].mul(xValues[j]));
            }
            excesses.push(lhs.sub(this.originalB[i]));
        }

        return { values, xValues, z, excesses };
    }
}

class SimplexMaxSolver extends SimplexMinSolver {
    constructor(c, A, b) {
        super(c, A, b);

        this.type = "max";
        this.objectiveLabel = "Max";
        this.zLabel = "Z maximo";
        this.constraintSymbol = "<=";
        this.restrictionMeasureLabel = "Holgura";
        this.eNames = Array.from({ length: this.m }, (_, index) => `H${index + 1}`);
        this.varNames = [...this.xNames, ...this.eNames];
        this.cj = [...this.originalC, ...Array.from({ length: this.m }, () => FractionValue.zero())];

        this.rows = [];
        for (let i = 0; i < this.m; i++) {
            const row = [...this.originalA[i]];
            for (let k = 0; k < this.m; k++) {
                row.push(k === i ? new FractionValue(1n) : FractionValue.zero());
            }
            this.rows.push(row);
        }

        this.b = [...this.originalB];
        this.basis = Array.from({ length: this.m }, (_, index) => this.n + index);
        this.iterations = [];
        this.optimal = false;
        this.infeasible = false;
        this.unbounded = false;
        this.status = "No resuelto";
    }

    chooseEnteringCol(cz) {
        let enter = null;
        for (let j = 0; j < cz.length; j++) {
            if (cz[j].compare(FractionValue.zero()) > 0 && (enter === null || cz[j].compare(cz[enter]) > 0)) {
                enter = j;
            }
        }
        return enter;
    }

    chooseLeavingRow(enterCol) {
        const ratios = Array.from({ length: this.m }, () => "");
        const candidates = [];

        for (let i = 0; i < this.m; i++) {
            const aij = this.rows[i][enterCol];
            if (aij.compare(FractionValue.zero()) > 0) {
                const ratio = this.b[i].div(aij);
                ratios[i] = ratio.toString();
                candidates.push({ ratio, row: i });
            }
        }

        if (candidates.length === 0) {
            return { leave: null, ratios };
        }

        candidates.sort((a, b) => {
            const comparison = a.ratio.compare(b.ratio);
            return comparison === 0 ? a.row - b.row : comparison;
        });

        return { leave: candidates[0].row, ratios };
    }

    solve(maxIterations = 50) {
        for (let iteration = 0; iteration <= maxIterations; iteration++) {
            const computed = this.computeRows();
            const enter = this.chooseEnteringCol(computed.cz);

            if (enter === null) {
                this.saveState(iteration, computed);
                this.optimal = true;
                this.status = "Optimo";
                return;
            }

            const { leave, ratios } = this.chooseLeavingRow(enter);
            if (leave === null) {
                this.saveState(iteration, computed, null, enter, ratios, null);
                this.unbounded = true;
                this.status = "Problema no acotado";
                return;
            }

            const pivot = this.rows[leave][enter];
            this.saveState(iteration, computed, leave, enter, ratios, pivot);
            this.pivot(leave, enter);
        }

        this.status = "Maximo numero de iteraciones alcanzado";
    }

    getSolution() {
        const solution = super.getSolution();
        solution.excesses = [];

        for (let i = 0; i < this.m; i++) {
            let lhs = FractionValue.zero();
            for (let j = 0; j < this.n; j++) {
                lhs = lhs.add(this.originalA[i][j].mul(solution.xValues[j]));
            }
            solution.excesses.push(this.originalB[i].sub(lhs));
        }

        return solution;
    }
}

function crearTablaSimplex() {
    const variables = parsePositiveInteger("simplex-vars", "variables");
    const restrictions = parsePositiveInteger("simplex-res", "restricciones");
    const type = getSimplexType();
    const objectiveLabel = type === "max" ? "Max" : "Min";
    const operator = type === "max" ? "<=" : ">=";
    let html = '<div class="simplex-block">';

    html += '<h3>Funcion objetivo</h3>';
    html += `<div class="objective-row"><span class="math-label">${objectiveLabel} Z =</span>`;
    for (let j = 0; j < variables; j++) {
        html += `
            <input type="text" id="obj_${j}" value="0" inputmode="decimal">
            <span>x${j + 1}</span>
            ${j < variables - 1 ? '<span class="operator">+</span>' : ""}
        `;
    }
    html += "</div>";

    html += '<h3>Restricciones</h3>';
    for (let i = 0; i < restrictions; i++) {
        html += `<div class="restriction-row"><span class="math-label">R${i + 1}</span>`;
        for (let j = 0; j < variables; j++) {
            html += `
                <input type="text" id="a_${i}_${j}" value="0" inputmode="decimal">
                <span>x${j + 1}</span>
                ${j < variables - 1 ? '<span class="operator">+</span>' : ""}
            `;
        }
        html += `<span class="operator">${operator}</span><input type="text" id="b_${i}" value="0" inputmode="decimal"></div>`;
    }

    html += "</div>";
    document.getElementById("simplex-form").innerHTML = html;
}

function cargarEjemploSimplex() {
    const type = getSimplexType();
    document.getElementById("simplex-vars").value = 2;
    document.getElementById("simplex-res").value = type === "max" ? 3 : 2;
    crearTablaSimplex();

    if (type === "max") {
        document.getElementById("obj_0").value = "3";
        document.getElementById("obj_1").value = "5";
        document.getElementById("a_0_0").value = "2";
        document.getElementById("a_0_1").value = "3";
        document.getElementById("b_0").value = "8";
        document.getElementById("a_1_0").value = "2";
        document.getElementById("a_1_1").value = "1";
        document.getElementById("b_1").value = "6";
        document.getElementById("a_2_0").value = "1";
        document.getElementById("a_2_1").value = "2";
        document.getElementById("b_2").value = "6";
        return;
    }

    document.getElementById("obj_0").value = "2";
    document.getElementById("obj_1").value = "3";
    document.getElementById("a_0_0").value = "1";
    document.getElementById("a_0_1").value = "2";
    document.getElementById("b_0").value = "5";
    document.getElementById("a_1_0").value = "3";
    document.getElementById("a_1_1").value = "1";
    document.getElementById("b_1").value = "7";
}

function resolverSimplex() {
    const variables = parsePositiveInteger("simplex-vars", "variables");
    const restrictions = parsePositiveInteger("simplex-res", "restricciones");
    const c = [];
    const A = [];
    const b = [];

    for (let j = 0; j < variables; j++) {
        c.push(FractionValue.parse(document.getElementById(`obj_${j}`).value));
    }

    for (let i = 0; i < restrictions; i++) {
        const row = [];
        for (let j = 0; j < variables; j++) {
            row.push(FractionValue.parse(document.getElementById(`a_${i}_${j}`).value));
        }
        A.push(row);
        b.push(FractionValue.parse(document.getElementById(`b_${i}`).value));
    }

    const solver = getSimplexType() === "max"
        ? new SimplexMaxSolver(c, A, b)
        : new SimplexMinSolver(c, A, b);
    solver.solve();
    renderSimplexResult(solver);
}

function getSimplexType() {
    return document.getElementById("simplex-type")?.value || "min";
}

function renderSimplexResult(solver) {
    const result = document.getElementById("resultado");
    result.className = "";
    const solution = solver.optimal ? solver.getSolution() : null;
    let html = "";

    html += `
        <div class="summary-box">
            <h3>Resumen</h3>
            <p><strong>Estado:</strong> ${solver.status}</p>
            <p><strong>Iteraciones:</strong> ${solver.iterations.length}</p>
            <p><strong>${solver.zLabel}:</strong> ${solution ? solution.z.toMixedString() : "-"}</p>
        </div>
    `;

    html += renderModelCard(solver);
    html += renderIterations(solver);
    html += renderSolutionTables(solver, solution);
    result.innerHTML = html;
}

function renderModelCard(solver) {
    const objective = solver.originalC.map((value, index) => {
        return `${value.toString()}x${index + 1}`;
    }).join(" + ");

    const constraints = solver.originalA.map((row, rowIndex) => {
        const lhs = row.map((value, index) => {
            return `${value.toString()}x${index + 1}`;
        }).join(" + ");

        return `
            <p><strong>R${rowIndex + 1}:</strong> ${lhs} ${solver.constraintSymbol} ${solver.originalB[rowIndex].toString()}</p>
        `;
    }).join("");

    const nonNegativeRestriction = solver.xNames.join(", ");

    return `
        <div class="result-section">
            <div class="model-summary-box">
                <h3>Modelo ingresado</h3>
                <p><strong>Funcion objetivo:</strong> ${solver.objectiveLabel} Z = ${objective}</p>
                <p><strong>Restricciones:</strong></p>
                ${constraints}
                <p><strong>R${solver.m + 1}:</strong> ${nonNegativeRestriction} >= 0</p>
            </div>
        </div>
    `;
}

function renderSolutionTables(solver, solution) {
    if (solver.infeasible) {
        return '<div class="error-box">El problema es infactible.</div>';
    }

    if (solver.unbounded) {
        return '<div class="error-box">El problema es no acotado.</div>';
    }

    if (!solver.optimal) {
        return `<div class="warning-box">No se alcanzo solucion optima. Estado: ${solver.status}</div>`;
    }

    let variablesRows = "";
    for (let j = 0; j < solution.xValues.length; j++) {
        const value = solution.xValues[j];
        variablesRows += `<tr><td>x${j + 1}</td><td>${value.toString()}</td><td>${value.toDecimal()}</td></tr>`;
    }

    let excessRows = "";
    for (let i = 0; i < solution.excesses.length; i++) {
        const excess = solution.excesses[i];
        const state = excess.isZero() ? "Activa" : `Con ${solver.restrictionMeasureLabel.toLowerCase()}`;
        excessRows += `<tr><td>R${i + 1}</td><td>${excess.toString()}</td><td>${excess.toDecimal()}</td><td>${state}</td></tr>`;
    }

    return `
        <div class="result-section">
            <h3>Solucion optima</h3>
            <div class="optimal-z">${solver.zLabel} = ${solution.z.toMixedString()}</div>
            <div class="result-grid">
                <div class="table-wrap">
                    <table class="mini-table">
                        <tr><th>Variable</th><th>Exacto</th><th>Decimal</th></tr>
                        ${variablesRows}
                    </table>
                </div>
                <div class="table-wrap">
                    <table class="mini-table">
                        <tr><th>Restriccion</th><th>${solver.restrictionMeasureLabel}</th><th>Decimal</th><th>Estado</th></tr>
                        ${excessRows}
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderIterations(solver) {
    if (solver.iterations.length === 0) {
        return "";
    }

    let html = '<div class="result-section"><h3>Iteraciones</h3>';
    for (const state of solver.iterations) {
        let note = "";
        let ratiosText = "";

        if (state.leave === null && solver.type === "min") {
            note = "Todos los valores del lado derecho son no negativos. Se alcanzo la solucion optima.";
        } else if (state.leave === null && solver.type === "max" && state.enter === null) {
            note = "No quedan valores positivos en Cj-Zj. Se alcanzo la solucion optima.";
        } else if (state.enter === null) {
            note = `Fila saliente: ${state.leave + 1}. No existe columna pivote valida.`;
        } else {
            const enteringName = solver.varNames[state.enter];
            const ratioParts = buildRatioParts(solver, state);

            if (state.leave === null) {
                note = `Variable entrante: ${enteringName}. No existe fila saliente valida.`;
            } else {
                const leavingName = solver.varNames[state.basis[state.leave]];
                note = `Fila saliente: ${state.leave + 1} (${leavingName}) | Variable entrante: ${enteringName} | Pivote: ${state.pivot.toString()}`;
            }
            ratiosText = ratioParts.length > 0 ? `<p class="ratio-note">Razones de seleccion: ${ratioParts.join(" | ")}</p>` : "";
        }

        html += `
            <div class="iteration-card">
                <div class="iteration-title">
                    <h3>Iteracion ${state.iteration}</h3>
                </div>
                <p class="iteration-note">${note}</p>
                ${ratiosText}
                ${renderIterationTable(solver, state)}
            </div>
        `;
    }
    html += "</div>";
    return html;
}

function buildRatioParts(solver, state) {
    if (solver.type === "max") {
        return state.ratios
            .map((value, index) => value === "" ? "" : `Fila ${index + 1} = ${value}`)
            .filter(Boolean);
    }

    return state.ratios
        .map((value, index) => value === "" ? "" : `${solver.varNames[index]} = ${value}`)
        .filter(Boolean);
}

function renderIterationTable(solver, state) {
    const columns = ["VB", "CB", ...solver.varNames, "b"];
    let html = '<div class="table-wrap"><table class="mini-table">';
    html += `<tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr>`;
    html += `<tr class="table-cj"><td></td><td>Cj</td>${solver.cj.map((value) => `<td>${value.toString()}</td>`).join("")}<td></td></tr>`;

    for (let i = 0; i < solver.m; i++) {
        const variableName = solver.varNames[state.basis[i]];
        html += `
            <tr>
                <td>${variableName}</td>
                <td>${state.cb[i].toString()}</td>
                ${state.rows[i].map((value) => `<td>${value.toString()}</td>`).join("")}
                <td>${state.b[i].toString()}</td>
            </tr>
        `;
    }

    html += `<tr class="table-zj"><td></td><td>Zj</td>${state.zj.map((value) => `<td>${value.toString()}</td>`).join("")}<td>${state.zValue.toString()}</td></tr>`;
    html += `<tr class="table-cz"><td></td><td>Cj-Zj</td>${state.cz.map((value) => `<td>${value.toString()}</td>`).join("")}<td></td></tr>`;
    html += "</table></div>";
    return html;
}
