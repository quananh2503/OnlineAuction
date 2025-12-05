const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
});

function formatMoney(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return '—';
    }
    return currencyFormatter.format(Number(value));
}

function maskName(name) {
    if (!name) {
        return '****';
    }
    const trimmed = `${name}`.trim();
    if (!trimmed) {
        return '****';
    }
    const first = trimmed.charAt(0);
    return `${first}${'*'.repeat(Math.max(trimmed.length - 1, 3))}`;
}

function ratingSummary(positive = 0, negative = 0) {
    const pos = Number(positive) || 0;
    const neg = Number(negative) || 0;
    const total = pos + neg;
    if (total === 0) {
        return { total: 0, ratio: null, stars: null };
    }
    const ratio = pos / total;
    return {
        total,
        ratio,
        stars: Math.round(ratio * 50) / 10 // convert to 5-star scale with one decimal
    };
}

module.exports = {
    formatMoney,
    maskName,
    ratingSummary
};
