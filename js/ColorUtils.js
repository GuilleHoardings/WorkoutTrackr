// ColorUtils - Pure color helpers (no DOM access) for conversions and opacity
(function (global) {
    'use strict';

    function padHex(n) {
        return n.toString(16).padStart(2, '0');
    }

    function rgbToHex(r, g, b) {
        return `#${padHex(r)}${padHex(g)}${padHex(b)}`;
    }

    function hslToRgb(h, s, l) {
        // h in [0,360], s,l in [0,100]
        h = ((h % 360) + 360) % 360;
        s = s / 100;
        l = l / 100;

        if (s === 0) {
            const val = Math.round(l * 255);
            return [val, val, val];
        }

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        const hk = h / 360;
        const rgb = [hk + 1 / 3, hk, hk - 1 / 3].map(t => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        });

        return rgb.map(v => Math.round(v * 255));
    }

    function hslToHex(h, s, l) {
        const [r, g, b] = hslToRgb(h, s, l);
        return rgbToHex(r, g, b);
    }

    function parseRgbString(rgbString) {
        const regex = /rgba?\s*\(([^)]+)\)/;
        const match = rgbString.match(regex);
        if (!match) return null;
        const parts = match[1].split(',').map(p => p.trim());
        const r = parseInt(parts[0], 10);
        const g = parseInt(parts[1], 10);
        const b = parseInt(parts[2], 10);
        const a = parts[3] !== undefined ? parseFloat(parts[3]) : null;
        return { r, g, b, a };
    }

    function convertToValidColor(color) {
        if (!color) return '#3B82F6';
        color = color.trim();
        if (color.startsWith('#')) return color;
        if (color.startsWith('hsl(') || color.startsWith('hsla(')) {
            // Extract numbers
            const nums = color.replace(/hsla?\(|\)/g, '').split(',').map(c => c.trim());
            const h = parseFloat(nums[0]);
            const s = parseFloat(nums[1].replace('%', ''));
            const l = parseFloat(nums[2].replace('%', ''));
            return hslToHex(h, s, l);
        }
        if (color.startsWith('rgb(') || color.startsWith('rgba(')) {
            const parsed = parseRgbString(color);
            if (!parsed) return '#3B82F6';
            return rgbToHex(parsed.r, parsed.g, parsed.b);
        }
        // fallback color
        return '#3B82F6';
    }

    function adjustColorOpacity(color, opacity) {
        // Normalize color input to rgba string
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        if (color.startsWith('rgba')) {
            const parsed = parseRgbString(color);
            if (!parsed) return color;
            return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${opacity})`;
        }
        if (color.startsWith('rgb')) {
            const parsed = parseRgbString(color);
            if (!parsed) return color;
            return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${opacity})`;
        }
        if (color.startsWith('hsl') || color.startsWith('hsla')) {
            // Convert HSL to RGB and then to rgba
            const nums = color.replace(/hsla?\(|\)/g, '').split(',').map(c => c.trim());
            const h = parseFloat(nums[0]);
            const s = parseFloat(nums[1].replace('%', ''));
            const l = parseFloat(nums[2].replace('%', ''));
            const [r, g, b] = hslToRgb(h, s, l);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        return color; // unknown format, return as-is
    }

    global.ColorUtils = {
        convertToValidColor,
        adjustColorOpacity,
        hslToHex,
        hslToRgb,
        rgbToHex
    };

})(typeof window !== 'undefined' ? window : this);
