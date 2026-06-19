(function () {
    const values = ['LICENCE 1', 'LICENCE 2', 'LICENCE 3', 'MASTER 1', 'MASTER 2'];

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function normalize(value) {
        const aliases = {
            L1: 'LICENCE 1',
            LICENCE1: 'LICENCE 1',
            'LICENCE 1': 'LICENCE 1',
            L2: 'LICENCE 2',
            LICENCE2: 'LICENCE 2',
            'LICENCE 2': 'LICENCE 2',
            L3: 'LICENCE 3',
            LICENCE3: 'LICENCE 3',
            'LICENCE 3': 'LICENCE 3',
            M1: 'MASTER 1',
            MASTER1: 'MASTER 1',
            'MASTER 1': 'MASTER 1',
            M2: 'MASTER 2',
            MASTER2: 'MASTER 2',
            'MASTER 2': 'MASTER 2',
        };
        const key = String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
        return aliases[key] || aliases[key.replace(/\s/g, '')] || key;
    }

    function isValid(value) {
        return values.includes(normalize(value));
    }

    function options(selectedValue = '', placeholder = 'Choisir une promotion...') {
        const selected = normalize(selectedValue);
        return [
            `<option value="">${escapeHtml(placeholder)}</option>`,
            ...values.map((value) => `<option value="${value}"${value === selected ? ' selected' : ''}>${value}</option>`),
        ].join('');
    }

    function applyToSelect(select, selectedValue = '', placeholder) {
        if (!select) return;
        select.innerHTML = options(selectedValue, placeholder);
    }

    function selectedValues(select) {
        if (!select) return [];
        return Array.from(select.selectedOptions)
            .map((option) => option.value)
            .filter(Boolean);
    }

    window.PromotionOptions = {
        values,
        normalize,
        isValid,
        options,
        applyToSelect,
        selectedValues,
    };
}());
