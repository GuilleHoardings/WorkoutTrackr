// Constants
const pushUpForm = document.getElementById("push-up-form");
const pushUpTable = document.getElementById("push-up-table");
const pushUpsInput = document.getElementById("push-ups");

// Variables to store push-up data and charts
let pushUpsData = [];
let chartPushUpsTotal, chartPushUpsPerMinute, chartPushUpsPerMonth, chartActivity;

// Add version numbers for data format
const DATA_VERSION_V1 = 1;
const DATA_VERSION_V2 = 2;
const CURRENT_DATA_VERSION = DATA_VERSION_V2;

// Load previously stored data from localStorage
if (localStorage.getItem("pushUpsData")) {
    const storedData = JSON.parse(localStorage.getItem("pushUpsData"));

    // Check if the stored data is an array (original format)
    if (Array.isArray(storedData)) {
        // Convert original format to v2 format with series
        const migratedData = migrateArrayToV2Format(storedData);
        localStorage.setItem("pushUpsData", JSON.stringify(migratedData));
        pushUpsData = migratedData.data;
    }
    // Check if it's v1 format
    else if (storedData.version === DATA_VERSION_V1) {
        // Convert v1 format to v2 format with series
        const migratedData = migrateV1ToV2Format(storedData);
        localStorage.setItem("pushUpsData", JSON.stringify(migratedData));
        pushUpsData = migratedData.data;
    }
    // Already v2 format
    else if (storedData.version === DATA_VERSION_V2) {
        pushUpsData = storedData.data || [];
    }
    // Unknown format - use empty array
    else {
        pushUpsData = [];
    }

    pushUpsData.forEach(data => addRowToTable(data));
    createOrUpdateCharts();
}

// Migration functions
function migrateArrayToV2Format(oldData) {
    // Transform original array format to v2 format with series
    const workouts = [];

    oldData.forEach(entry => {
        const date = new Date(entry.date);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

        // Calculate 4 equal series for the existing data
        const repsPerSeries = Math.ceil(entry.pushUps / 4);
        const seriesTimeGap = Math.floor(entry.timeBetweenFirstAndLast / 4);

        const series = [];
        for (let i = 0; i < 4; i++) {
            // Last series might have fewer reps to match the total
            const reps = (i === 3) ?
                entry.pushUps - (repsPerSeries * 3) :
                repsPerSeries;

            if (reps <= 0) continue; // Skip if no reps for this series

            const seriesTime = new Date(date.getTime() + (i * seriesTimeGap * 60000));

            series.push({
                reps: reps,
                weight: null, // No weight data in original format
                timestamp: seriesTime
            });
        }

        workouts.push({
            date: date,
            dateString: dateString,
            exercise: "Push-ups",
            series: series,
            totalTime: entry.timeBetweenFirstAndLast,
            totalReps: entry.pushUps
        });
    });

    return {
        version: DATA_VERSION_V2,
        data: workouts
    };
}

function migrateV1ToV2Format(oldData) {
    // Transform v1 format to v2 format with series
    const workouts = [];

    oldData.data.forEach(entry => {
        const date = new Date(entry.date);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

        // Calculate 4 equal series for the existing data
        const repsPerSeries = Math.ceil(entry.pushUps / 4);
        const seriesTimeGap = Math.floor(entry.timeBetweenFirstAndLast / 4);

        const series = [];
        for (let i = 0; i < 4; i++) {
            // Last series might have fewer reps to match the total
            const reps = (i === 3) ?
                entry.pushUps - (repsPerSeries * 3) :
                repsPerSeries;

            if (reps <= 0) continue; // Skip if no reps for this series

            const seriesTime = new Date(date.getTime() + (i * seriesTimeGap * 60000));

            series.push({
                reps: reps,
                weight: null, // No weight data in v1 format
                timestamp: seriesTime
            });
        }

        workouts.push({
            date: date,
            dateString: dateString,
            exercise: "Push-ups",
            series: series,
            totalTime: entry.timeBetweenFirstAndLast,
            totalReps: entry.pushUps
        });
    });

    return {
        version: DATA_VERSION_V2,
        data: workouts
    };
}

// Listen to the form's submit event
pushUpForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Get push-up count from the input field
    const pushUps = parseInt(pushUpsInput.value);
    const newEntryTime = new Date();
    const dateString = newEntryTime.toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if an entry with the current date already exists in the array
    const existingWorkout = pushUpsData.find(workout => workout.dateString === dateString);

    if (existingWorkout) {
        // If a workout exists for today, add a new series to it
        const newSeries = {
            reps: pushUps,
            weight: null, // No weight for push-ups in this version
            timestamp: newEntryTime
        };

        existingWorkout.series.push(newSeries);

        // Update the totals
        existingWorkout.totalReps += pushUps;

        // Calculate total time between first and last series
        const firstSeriesTime = new Date(existingWorkout.series[0].timestamp).getTime();
        const lastSeriesTime = newEntryTime.getTime();
        existingWorkout.totalTime = Math.round((lastSeriesTime - firstSeriesTime) / 60000);
    } else {
        // Create a new workout for today
        const newWorkout = {
            date: newEntryTime,
            dateString: dateString,
            exercise: "Push-ups",
            series: [{
                reps: pushUps,
                weight: null,
                timestamp: newEntryTime
            }],
            totalTime: 0, // First series, so no time elapsed yet
            totalReps: pushUps
        };

        pushUpsData.push(newWorkout);
    }

    // Save to localStorage using the new format
    const dataToSave = {
        version: CURRENT_DATA_VERSION,
        data: pushUpsData
    };
    localStorage.setItem("pushUpsData", JSON.stringify(dataToSave));

    // Clear and repopulate the table rows
    while (pushUpTable.rows.length > 1) {
        pushUpTable.deleteRow(-1);
    }

    pushUpsData.forEach(workout => {
        addRowToTable(workout);
    });

    // Update the charts
    createOrUpdateCharts();

    // Clear the input field
    pushUpsInput.value = "";
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

function addRowToTable(workout) {
    const row = pushUpTable.insertRow(1);
    const dateCell = row.insertCell(0);
    const pushUpsCell = row.insertCell(1);
    const timeCell = row.insertCell(2);
    const pushUpsPerMinuteCell = row.insertCell(3);
    const seriesCell = row.insertCell(4);

    // Format and display the data in the table
    dateCell.innerHTML = createLongFormattedDate(new Date(workout.date));
    pushUpsCell.innerHTML = workout.totalReps;

    // Handle time display - show 0 minutes for workouts with only one series
    const displayTime = workout.totalTime || 0;
    timeCell.innerHTML = displayTime + ' minutes';

    // Calculate push-ups per minute (if time > 0)
    const pushUpsPerMinute = displayTime > 0 ?
        (workout.totalReps / displayTime).toFixed(2) :
        'N/A';
    pushUpsPerMinuteCell.innerHTML = pushUpsPerMinute;

    // Create series display
    let seriesHtml = '<ul class="series-list">';
    workout.series.forEach((series, index) => {
        const seriesTime = new Date(series.timestamp);
        seriesHtml += `<li>Series ${index + 1}: ${series.reps} reps - ${seriesTime.toLocaleTimeString()}</li>`;
    });
    seriesHtml += '</ul>';
    seriesCell.innerHTML = seriesHtml;
}

function aggregateDataByMonth(data) {
    const monthlyData = {};
    data.forEach(workout => {
        const date = new Date(workout.date);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!monthlyData[key]) {
            monthlyData[key] = { year: date.getFullYear(), month: date.getMonth() + 1, pushUps: 0 };
        }
        monthlyData[key].pushUps += workout.totalReps;
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
                data: getPushUpsPerMinute(),
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
    return pushUpsData.map(workout => workout.totalReps);
}

function getShortFormattedDates() {
    return pushUpsData.map(workout => createShortFormattedDate(new Date(workout.date)));
}

function getPushUpsPerMinute() {
    return pushUpsData.map(workout => {
        const time = workout.totalTime || 1; // Avoid division by zero
        return workout.totalReps / time;
    });
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

    // Handle the new data format with workouts and series
    const workouts = Array.isArray(storedData) ? storedData : (storedData.data || []);

    // Map workouts to activity data format
    const activityData = workouts.map(workout => ({
        date: workout.date,
        value: workout.totalReps
    }));

    const canvas = document.getElementById('activity');
    createActivityChart(activityData, canvas);
}

document.getElementById('download-csv').addEventListener('click', function () {
    const storedData = JSON.parse(localStorage.getItem('pushUpsData'));

    // Extract data array from the new format
    const workouts = Array.isArray(storedData) ? storedData : (storedData.data || []);

    // Convert to CSV format - now including series information
    let csvRows = [
        ['Workout Date', 'Exercise', 'Series Number', 'Reps', 'Weight', 'Series Time', 'Total Workout Reps', 'Total Workout Time (min)']
    ];

    workouts.forEach(workout => {
        const workoutDate = new Date(workout.date);
        const totalReps = workout.totalReps ||
            workout.series.reduce((sum, series) => sum + series.reps, 0);

        // Add each series as a separate row
        workout.series.forEach((series, index) => {
            const seriesTime = new Date(series.timestamp);
            csvRows.push([
                workoutDate.toISOString(),
                workout.exercise,
                index + 1,
                series.reps,
                series.weight || 'BW', // BW for bodyweight (null weight)
                seriesTime.toISOString(),
                totalReps,
                workout.totalTime || 0
            ]);
        });
    });

    var csv = csvRows.map(row => row.join(',')).join('\n');
    var csvContent = 'data:text/csv;charset=utf-8,' + csv;
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'workout_data.csv');
    document.body.appendChild(link);
    link.click();
});

function parseCSVData(csvData) {
    const rows = csvData.split('\n');
    const parsedData = [];

    // Check the header to determine the CSV format
    const header = rows[0].split(',');

    // New format - has 8 columns including series data
    if (header.length >= 7 && header.includes('Series Number')) {
        // Process as new format with series
        const workoutMap = new Map(); // Map to group series by workout date

        // Skip header row
        for (let i = 1; i < rows.length; i++) {
            const columns = rows[i].split(',');
            if (columns.length >= 7) {
                const workoutDate = new Date(columns[0]);
                const dateString = workoutDate.toISOString().split('T')[0];
                const exercise = columns[1];
                const seriesNumber = parseInt(columns[2]);
                const reps = parseInt(columns[3]);
                const weight = columns[4] === 'BW' ? null : parseFloat(columns[4]);
                const seriesTime = new Date(columns[5]);
                const totalReps = parseInt(columns[6]);
                const totalTime = columns.length >= 8 ? parseInt(columns[7]) : 0;

                // Create or update the workout in the map
                if (!workoutMap.has(dateString)) {
                    workoutMap.set(dateString, {
                        date: workoutDate,
                        dateString: dateString,
                        exercise: exercise,
                        series: [],
                        totalReps: totalReps,
                        totalTime: totalTime
                    });
                }

                // Add the series to the workout
                const workout = workoutMap.get(dateString);
                workout.series.push({
                    reps: reps,
                    weight: weight,
                    timestamp: seriesTime
                });
            }
        }

        // Convert the map to an array
        return Array.from(workoutMap.values());
    }
    // Old format - 3 columns: date, pushUps, timeBetweenFirstAndLast
    else if (header.length >= 3) {
        // Process as old format and convert to new format
        for (let i = 1; i < rows.length; i++) {
            const columns = rows[i].split(',');
            if (columns.length >= 3) {
                const date = new Date(columns[0]);
                const pushUps = parseInt(columns[1]);
                const timeBetweenFirstAndLast = parseInt(columns[2]);

                // Convert to v2 format with series
                const dateString = date.toISOString().split('T')[0];

                // Calculate 4 equal series for the data
                const repsPerSeries = Math.ceil(pushUps / 4);
                const seriesTimeGap = Math.floor(timeBetweenFirstAndLast / 4);

                const series = [];
                for (let j = 0; j < 4; j++) {
                    // Last series might have fewer reps to match total
                    const reps = (j === 3) ?
                        pushUps - (repsPerSeries * 3) :
                        repsPerSeries;

                    if (reps <= 0) continue;

                    const seriesTime = new Date(date.getTime() + (j * seriesTimeGap * 60000));

                    series.push({
                        reps: reps,
                        weight: null,
                        timestamp: seriesTime
                    });
                }

                parsedData.push({
                    date: date,
                    dateString: dateString,
                    exercise: "Push-ups",
                    series: series,
                    totalTime: timeBetweenFirstAndLast,
                    totalReps: pushUps
                });
            }
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
            version: CURRENT_DATA_VERSION,
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
