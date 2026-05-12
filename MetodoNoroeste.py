def esquina_noroeste(oferta, demanda):
    m = len(oferta)
    n = len(demanda)

    asignacion = [[0] * n for _ in range(m)]

    i = 0
    j = 0

    while i < m and j < n:
        x = min(oferta[i], demanda[j])
        asignacion[i][j] = x

        oferta[i] -= x
        demanda[j] -= x

        if oferta[i] == 0:
            i += 1
        elif demanda[j] == 0:
            j += 1

    return asignacion


oferta = [120, 140, 100]
demanda = [90, 115, 40, 115]

resultado = esquina_noroeste(oferta.copy(), demanda.copy())

for fila in resultado:
    print(fila)
