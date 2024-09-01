// Constants
const pushUpForm = document.getElementById("push-up-form");
const pushUpTable = document.getElementById("push-up-table");
const pushUpsInput = document.getElementById("push-ups");

// Variables to store push-up data and charts
let pushUpsData = [];
let chartPushUpsTotal, chartPushUpsPerMinute, chartPushUpsPerMonth, chartActivity;

// Load previously stored data from localStorage
if (localStorage.getItem("pushUpsData")) {
    pushUpsData = JSON.parse(localStorage.getItem("pushUpsData"));
    pushUpsData.forEach(data => addRowToTable(data));
    createOrUpdateCharts();
}

// Listen to the form's submit event
pushUpForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Get push-up count from the input field
    const pushUps = parseInt(pushUpsInput.value);
    const newEntryTime = new Date();

    // Remove the time part from the submitted entry time to compare only the date part
    const entryDate = new Date(newEntryTime);

    // Check if an entry with the current date already exists in the array
    const existingEntry = pushUpsData.find(data => new Date(data.date).setHours(0, 0, 0, 0) === entryDate.setHours(0, 0, 0, 0));

    if (existingEntry) {
        // If an entry exists, update the push-up count and timeBetweenFirstAndLast
        existingEntry.pushUps += pushUps;
        existingEntry.timeBetweenFirstAndLast = Math.round((newEntryTime.getTime() - new Date(existingEntry.date).getTime()) / 60000);
    } else {
        // Create a new data object and push it into the array
        const pushUpData = {
            date: newEntryTime,
            pushUps: pushUps,
            timeBetweenFirstAndLast: 0
        };
        pushUpsData.push(pushUpData);
    }

    // Save to the localStorage
    localStorage.setItem("pushUpsData", JSON.stringify(pushUpsData));

    // Clear and repopulate the table rows
    while (pushUpTable.rows.length > 1) {
        pushUpTable.deleteRow(-1);
    }

    pushUpsData.forEach(data => {
        addRowToTable(data);
    });

    // Update the charts
    createOrUpdateCharts();
});

function createLongFormattedDate(date) {
    return new Intl.DateTimeFormat('es-ES', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        year: '2-digit',
    }).format(date);
}

function createShortFormattedDate(date) {
    return new Intl.DateTimeFormat().format(date);
}

function addRowToTable(data) {
    const row = pushUpTable.insertRow(1);
    const dateCell = row.insertCell(0);
    const pushUpsCell = row.insertCell(1);
    const timeCell = row.insertCell(2);
    const pushUpsPerMinuteCell = row.insertCell(3);

    // Format and display the data in the table
    dateCell.innerHTML = createLongFormattedDate(new Date(data.date));
    pushUpsCell.innerHTML = data.pushUps;
    timeCell.innerHTML = data.timeBetweenFirstAndLast + ' minutes';
    pushUpsPerMinuteCell.innerHTML = (data.pushUps / data.timeBetweenFirstAndLast).toFixed(2);
}

function aggregateDataByMonth(data) {
    const monthlyData = {};
    data.forEach(entry => {
        const date = new Date(entry.date);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!monthlyData[key]) {
            monthlyData[key] = { year: date.getFullYear(), month: date.getMonth() + 1, pushUps: 0 };
        }
        monthlyData[key].pushUps += entry.pushUps;
    });
    return Object.values(monthlyData).sort((a, b) => {
        return a.year - b.year || a.month - b.month;
    });
}

function createOrUpdateCharts() {
    // Check if the charts already exist, if they do, update the data
    if (chartPushUpsTotal && chartPushUpsPerMinute) {
        updateCharts();
    } else {
        createCharts();
    }
}

function createCharts() {
    const canvasChartPushUps = document.getElementById("push-up-chart");
    const shortFormattedDates = getShortFormattedDates();
    chartPushUpsTotal = new Chart(canvasChartPushUps, {
        type: "bar",
        data: {
            labels: shortFormattedDates,
            datasets: [{
                label: "Push ups",
                data: getPushUpsPerDate(),
                backgroundColor: "rgba(75, 192, 192, 0.2)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    const canvasChartPushUpsPerMinute = document.getElementById("push-up-per-minute-chart");
    chartPushUpsPerMinute = new Chart(canvasChartPushUpsPerMinute, {
        type: "line",
        data: {
            labels: shortFormattedDates,
            datasets: [{
                label: "Push ups per minute",
                data: pushUpsData.map(data => data.pushUps / data.timeBetweenFirstAndLast),
                fill: false,
                borderColor: "rgba(255, 99, 132, 1)",
                tension: 0.1,
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    const monthlyData = aggregateDataByMonth(pushUpsData);
    const years = [...new Set(monthlyData.map(d => d.year))];
    const colorScale = generateColorScale(years.length);
    const allMonths = monthlyData.map(d => `${d.year}-${d.month}`);
    const datasets = years.map((year, index) => {
        const yearData = new Array(allMonths.length).fill(null);
        monthlyData.filter(d => d.year === year).forEach(d => {
            const monthIndex = allMonths.indexOf(`${d.year}-${d.month}`);
            yearData[monthIndex] = d.pushUps;
        });

        return {
            label: year.toString(),
            data: yearData,
            backgroundColor: colorScale[index],
            borderColor: colorScale[index],
            borderWidth: 1,
        };
    });

    const canvasChartPushUpsPerMonth = document.getElementById("push-up-per-month-chart");
    chartPushUpsPerMonth = new Chart(canvasChartPushUpsPerMonth, {
        type: "bar",
        data: {
            labels: allMonths,
            datasets: datasets
        },
        options: {
            scales: {
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0,
                        callback: function (val, index) {
                            const label = this.getLabelForValue(val);
                            const [year, month] = label.split('-');
                            if (index === 0 || allMonths[index - 1].split('-')[0] !== year) {
                                return [`${month}`, year];
                            }
                            return month;
                        }
                    }
                },
                y: {
                    beginAtZero: true
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    createActivityChart();
}

function getPushUpsPerDate() {
    return pushUpsData.map(data => data.pushUps);
}

function getShortFormattedDates() {
    return pushUpsData.map(data => createShortFormattedDate(new Date(data.date)));
}

function getPushUpsPerMinute() {
    return pushUpsData.map(data => data.pushUps / data.timeBetweenFirstAndLast);
}

function generateColorScale(numColors) {
    const colors = [];
    for (let i = 0; i < numColors; i++) {
        const hue = (i * 360 / numColors) % 360;
        colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
    }
    return colors;
}

function updateCharts() {
    const shortFormattedDates = getShortFormattedDates();

    chartPushUpsTotal.data.labels = shortFormattedDates;
    chartPushUpsTotal.data.datasets[0].data = getPushUpsPerDate();
    chartPushUpsTotal.update();

    chartPushUpsPerMinute.data.labels = shortFormattedDates;
    chartPushUpsPerMinute.data.datasets[0].data = getPushUpsPerMinute();
    chartPushUpsPerMinute.update();

    chartPushUpsPerMonth.data.labels = allMonths;
    chartPushUpsPerMonth.data.datasets = years.map((year, index) => {
        const yearData = new Array(allMonths.length).fill(null);
        monthlyData.filter(d => d.year === year).forEach(d => {
            const monthIndex = allMonths.indexOf(`${d.year}-${d.month}`);
            yearData[monthIndex] = d.pushUps;
        });

        return {
            label: year.toString(),
            data: yearData,
            backgroundColor: colorScale[index],
            borderColor: colorScale[index],
            borderWidth: 1,
        };
    });
    chartPushUpsPerMonth.update();
}

function createActivityChart() {
    if (chartActivity) {
        return;  // Chart already exists, no need to recreate
    }

    var data = JSON.parse(localStorage.getItem('pushUpsData'));

    // Get the range of years from pushUpsData
    var minYear = new Date(data[0].date).getFullYear();
    var maxYear = new Date(data[data.length - 1].date).getFullYear();
    var numYears = maxYear - minYear + 1;

    var canvas = document.getElementById('activity');
    var ctx = canvas.getContext('2d');

    var cellSize = 10;
    var padding = 2;
    var yearPadding = 10;
    var yearTextSize = 10;
    var monthTextSize = 15;
    var yearWidth = 53 * cellSize + padding * 54;
    var yearHeight = 7 * cellSize + padding * 8 + yearTextSize + monthTextSize;

    canvas.width = yearWidth;
    canvas.height = numYears * yearHeight + yearPadding * 2;

    // Define an array of month names each two months
    var monthNames = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov']

    // Draw the years in reverse order
    for (var absYear = maxYear; absYear >= minYear; absYear--) {
        // Print the year
        var year = absYear - minYear;
        ctx.fillStyle = '#888';
        ctx.font = 'bold 10px sans-serif';
        yYearStart = year * yearHeight + (year + 1) * yearPadding + yearTextSize + monthTextSize;
        ctx.fillText(absYear, padding, yYearStart - monthTextSize);

        // Draw the grid
        for (var i = 0; i < 53; i++) {
            // Draw the month names
            if (i % 9 === 0) {
                var month = Math.floor(i / 9);
                ctx.fillStyle = '#888';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText(monthNames[month], i * cellSize + padding * (i + 1), yYearStart);
            }

            ctx.fillStyle = '#ddd';
            for (var j = 0; j < 7; j++) {
                var x = i * cellSize + padding * (i + 1);
                var y = j * cellSize + padding * (j + 1) + yYearStart;
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }

    }
    // Draw the push-ups
    for (var i = 0; i < data.length; i++) {
        var date = new Date(data[i].date);
        var year = date.getFullYear();
        var day = date.getDay();
        // Make the week start in Monday
        if (day === 0) {
            day = 6;
        } else {
            day--;
        }
        var week = getWeekNumber(date)[1] - 1;
        var x = week * cellSize + padding * (week + 1);
        var y = day * cellSize + padding * (day + 1) + (year - minYear) * yearHeight + (year - minYear + 1) * yearPadding + yearTextSize + monthTextSize;
        var color = getGreenShade(data[i].pushUps);
        // console.log(`year: ${year} day: ${day}, week: ${week}, x: ${x}, y: ${y}, color: ${color}`); // eslint-disable-line no-console
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellSize, cellSize);
    }
}

function getWeekNumber(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return [d.getUTCFullYear(), Math.ceil((((d - yearStart) / 86400000) + 1) / 7)];
}

function getGreenShadeDiscrete(pushUps) {
    // Return green, but it make it proportional to the push-up count, with a
    // maximum of 120. The hihger the push-up count, the darker the shade of
    // green. Using github's color scale.
    var maxPushUps = 120;
    var color = '#ebedf0';
    if (pushUps > 0) {
        var colors = ['#ffffff', '#d8f0b1', '#96e08e', '#2dbf55', '#1e763e', '#0e6630', '#08401a']
        var shade = Math.round((pushUps / maxPushUps) * (color.length + 1));
    }
    return colors[shade] || color;
}

function getGreenShade(pushUps) {
    var maxPushUps = 120;
    var minLightness = 10;
    var maxLightness = 70;

    if (pushUps > 0) {
        var lightness = maxLightness - (pushUps / maxPushUps) * (maxLightness - minLightness);
        var color = 'hsl(130, 100%, ' + lightness + '%)';
    } else {
        var color = '#ebedf0'; // Default color for 0 push-ups
    }

    return color;
}

document.getElementById('download-csv').addEventListener('click', function () {
    var jsonData = JSON.parse(localStorage.getItem('pushUpsData'));

    // Convert JSON data to CSV data
    var data = jsonData.map(row => [row.date, row.pushUps, row.timeBetweenFirstAndLast]);
    data.unshift(['Date', 'Push Ups', 'Time Between First and Last']); // Add header row

    var csv = data.map(row => row.join(',')).join('\n');
    var csvContent = 'data:text/csv;charset=utf-8,' + csv;
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'pushUpsData.csv');
    document.body.appendChild(link); // Required for Firefox
    link.click(); // This will download the data file named "pushUpsData.csv".
});

function parseCSVData(csvData) {
    const rows = csvData.split('\n');
    const parsedData = [];

    // Skip the header row
    for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',');
        if (columns.length === 3) {
            const pushUpData = {
                date: new Date(columns[0]),
                pushUps: parseInt(columns[1]),
                timeBetweenFirstAndLast: parseInt(columns[2])
            };
            parsedData.push(pushUpData);
        }
    }

    return parsedData;
}

function importCSV(replace = false) {
    const fileInput = replace ? 'file-input-replace' : 'file-input';
    const file = document.getElementById(fileInput).files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
        const csvData = event.target.result;
        const parsedData = parseCSVData(csvData);

        if (replace) {
            pushUpsData = parsedData;
        } else {
            pushUpsData = pushUpsData.concat(parsedData);
        }

        // Save to localStorage
        localStorage.setItem("pushUpsData", JSON.stringify(pushUpsData));

        // Clear and repopulate the table
        while (pushUpTable.rows.length > 1) {
            pushUpTable.deleteRow(-1);
        }
        pushUpsData.forEach(data => addRowToTable(data));

        // Update charts
        createOrUpdateCharts();
    };

    reader.readAsText(file);
}

document.getElementById('import-csv').addEventListener('click', function () {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', function () {
    importCSV(false);
});

document.getElementById('import-csv-replace').addEventListener('click', function () {
    document.getElementById('file-input-replace').click();
});

document.getElementById('file-input-replace').addEventListener('change', function () {
    importCSV(true);
});
