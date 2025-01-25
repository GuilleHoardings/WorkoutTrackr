function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load script'));
        document.head.appendChild(script);
    });
}

// Load activity-tracker.js before running tests
async function init() {
    await loadScript('../activity-tracker.js');
}

function testWeeksFromYearStart() {
    const testCases = [
        {
            description: 'Year starts on Monday, first day',
            date: new Date(2024, 0, 1),
            expected: 0
        },
        {
            description: 'Year starts on Monday, second day',
            date: new Date(2024, 0, 2),
            expected: 0
        },
        {
            description: 'Year starts on Monday, eight day',
            date: new Date(2024, 0, 8),
            expected: 1
        },
        {
            description: 'Year starts on Wednesday, first day',
            date: new Date(2025, 0, 1),
            expected: 0
        },
        {
            description: 'Year starts on Wednesday, sixth day',
            date: new Date(2025, 0, 6),
            expected: 1
        },
        {
            description: 'Year starts on Wednesday, eight day',
            date: new Date(2025, 0, 8),
            expected: 1
        },
        {
            description: '26 dic 2024',
            date: new Date(2024, 11, 26),
            expected: 51
        },
        {
            description: 'Sat 28 dic 2024',
            date: new Date(2024, 11, 28),
            expected: 51
        },
        {
            description: 'Sun 29 dic 2024',
            date: new Date(2024, 11, 29),
            expected: 51
        },
        {
            description: 'Mon 30 dic 2024',
            date: new Date(2024, 11, 30),
            expected: 52
        },
        {
            description: 'Tue 31 dic 2024',
            date: new Date(2024, 11, 31),
            expected: 52
        },

    ];

    for (const testCase of testCases) {
        const result = weeksFromYearStart(testCase.date);
        if (result !== testCase.expected) {
            console.error(`Test failed: ${testCase.description}. Expected ${testCase.expected}, but got ${result}`);
            return false;
        }
    }

    return true;
}

// Execute tests when the script loads
async function test() {
    console.log('Running tests...');
    await init();
    return testWeeksFromYearStart();
}
