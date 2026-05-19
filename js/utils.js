class FractionValue {
    constructor(numerator, denominator = 1n) {
        let n = BigInt(numerator);
        let d = BigInt(denominator);

        if (d === 0n) {
            throw new Error("Division por cero.");
        }

        if (d < 0n) {
            n = -n;
            d = -d;
        }

        const divisor = FractionValue.gcd(n < 0n ? -n : n, d);
        this.n = n / divisor;
        this.d = d / divisor;
    }

    static gcd(a, b) {
        while (b !== 0n) {
            const temp = a % b;
            a = b;
            b = temp;
        }
        return a === 0n ? 1n : a;
    }

    static zero() {
        return new FractionValue(0n);
    }

    static parse(rawText) {
        const text = String(rawText ?? "").trim().replace(",", ".");

        if (text === "") {
            return FractionValue.zero();
        }

        if (text.includes("/")) {
            const parts = text.split("/");
            if (parts.length !== 2 || parts.some((part) => part.trim() === "")) {
                throw new Error(`Numero invalido: ${rawText}`);
            }
            return new FractionValue(BigInt(parts[0].trim()), BigInt(parts[1].trim()));
        }

        if (text.includes(".")) {
            const sign = text.startsWith("-") ? -1n : 1n;
            const clean = text.replace("-", "");
            const [integerPartRaw, decimalPartRaw = ""] = clean.split(".");
            const integerPart = integerPartRaw === "" ? "0" : integerPartRaw;
            const decimalPart = decimalPartRaw === "" ? "0" : decimalPartRaw;
            const denominator = 10n ** BigInt(decimalPart.length);
            const numerator = BigInt(integerPart + decimalPart) * sign;
            return new FractionValue(numerator, denominator);
        }

        return new FractionValue(BigInt(text));
    }

    add(other) {
        return new FractionValue(this.n * other.d + other.n * this.d, this.d * other.d);
    }

    sub(other) {
        return new FractionValue(this.n * other.d - other.n * this.d, this.d * other.d);
    }

    mul(other) {
        return new FractionValue(this.n * other.n, this.d * other.d);
    }

    div(other) {
        return new FractionValue(this.n * other.d, this.d * other.n);
    }

    neg() {
        return new FractionValue(-this.n, this.d);
    }

    compare(other) {
        const left = this.n * other.d;
        const right = other.n * this.d;
        if (left < right) return -1;
        if (left > right) return 1;
        return 0;
    }

    isNegative() {
        return this.n < 0n;
    }

    isZero() {
        return this.n === 0n;
    }

    toNumber() {
        return Number(this.n) / Number(this.d);
    }

    toString() {
        if (this.d === 1n) {
            return String(this.n);
        }
        return `${this.n}/${this.d}`;
    }

    toDecimal() {
        return this.toNumber().toFixed(4);
    }

    toMixedString() {
        return `${this.toString()} (~ ${this.toDecimal()})`;
    }
}

function parsePositiveInteger(id, label) {
    const value = parseInt(document.getElementById(id).value, 10);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Ingresa un numero valido para ${label}.`);
    }
    return value;
}

function readNumber(id) {
    const value = parseFloat(document.getElementById(id).value);
    return Number.isFinite(value) ? value : 0;
}

function showError(message) {
    const result = document.getElementById("resultado");
    result.className = "";
    result.innerHTML = `<div class="error-box">${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
