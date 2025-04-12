// Constants
const pushUpForm = document.getElementById("push-up-form");
const pushUpTable = document.getElementById("push-up-table");
const pushUpsInput = document.getElementById("push-ups");

// Variables to store push-up data and charts
let pushUpsData = [];
let chartPushUpsTotal, chartPushUpsPerMinute, chartPushUpsPerMonth, chartActivity;

// Add a version number to the data format
const DATA_VERSION = 1;

// Load previously stored data from localStorage
if (localStorage.getItem("pushUpsData")) {
    const storedData = JSON.parse(localStorage.getItem("pushUpsData"));

    // Check if the stored data is an array (old format)
    if (Array.isArray(storedData)) {
        // Convert old format to new format
        const migratedData = {
            version: DATA_VERSION,
            data: storedData
        };
        localStorage.setItem("pushUpsData", JSON.stringify(migratedData));
        pushUpsData = migratedData.data;
    } else {
        // Use the new format
        pushUpsData = storedData.data || [];
    }

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

    // Save to the localStorage with the new format
    const dataToSave = {
        version: DATA_VERSION,
        data: pushUpsData
    };
    localStorage.setItem("pushUpsData", JSON.stringify(dataToSave));

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
    const options = {
        scales: {
            y: {
                beginAtZero: true
            }
        },
        responsive: true,
        maintainAspectRatio: false
    };

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
        options: options
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
        options: options
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

    createPushUpActivityChart();
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

function updateCharts() {
    const shortFormattedDates = getShortFormattedDates();
    const monthlyData = aggregateDataByMonth(pushUpsData);
    const years = [...new Set(monthlyData.map(d => d.year))];
    const colorScale = generateColorScale(years.length);
    const allMonths = monthlyData.map(d => `${d.year}-${d.month}`);

    // Update total push-ups chart
    chartPushUpsTotal.data.labels = shortFormattedDates;
    chartPushUpsTotal.data.datasets[0].data = getPushUpsPerDate();
    chartPushUpsTotal.update();

    // Update push-ups per minute chart
    chartPushUpsPerMinute.data.labels = shortFormattedDates;
    chartPushUpsPerMinute.data.datasets[0].data = getPushUpsPerMinute();
    chartPushUpsPerMinute.update();

    // Update monthly chart
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

    // Update activity chart
    createPushUpActivityChart();
}

function createPushUpActivityChart() {
    const storedData = JSON.parse(localStorage.getItem('pushUpsData'));

    // Handle the new data format
    const activityData = (storedData.data || []).map(item => ({
        date: item.date,
        value: item.pushUps
    }));

    const canvas = document.getElementById('activity');
    createActivityChart(activityData, canvas);
}

document.getElementById('download-csv').addEventListener('click', function () {
    const storedData = JSON.parse(localStorage.getItem('pushUpsData'));

    // Extract data array from the new format
    const jsonData = Array.isArray(storedData) ? storedData : (storedData.data || []);

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

        // Save to localStorage using the new format
        const dataToSave = {
            version: DATA_VERSION,
            data: pushUpsData
        };
        localStorage.setItem("pushUpsData", JSON.stringify(dataToSave));

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
