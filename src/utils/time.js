const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
require('dayjs/locale/vi');

dayjs.extend(relativeTime);

dayjs.locale('vi');

const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;

function formatAbsolute(date) {
    if (!date) return '';
    return dayjs(date).format('DD/MM/YYYY HH:mm');
}

function formatRelativeOrAbsolute(date) {
    if (!date) return '';
    const target = dayjs(date);
    const diff = target.valueOf() - Date.now();
    if (diff <= THREE_DAYS_IN_MS) {
        const relative = target.fromNow();
        if (relative.includes('trong')) {
            return relative.replace('trong ', '');
        }
        return relative;
    }
    return formatAbsolute(date);
}

module.exports = {
    formatAbsolute,
    formatRelativeOrAbsolute
};
