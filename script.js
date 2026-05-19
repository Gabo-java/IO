function cambiarMetodo() {
    const method = document.getElementById("metodo").value;
    document.getElementById("transporte-panel").classList.toggle("hidden", method !== "transporte");
    document.getElementById("simplex-panel").classList.toggle("hidden", method !== "simplex");
    limpiarResultado();
}

function resolver() {
    const method = document.getElementById("metodo").value;

    try {
        if (method === "transporte") {
            resolverTransporte();
        } else {
            resolverSimplex();
        }
    } catch (error) {
        showError(error.message);
    }
}

function limpiarResultado() {
    const result = document.getElementById("resultado");
    result.className = "result-placeholder";
    result.innerHTML = "Selecciona un metodo, ingresa los datos y presiona Resolver.";
}

crearTablaTransporte();
crearTablaSimplex();
