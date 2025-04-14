// Constants
const exerciseForm = document.getElementById("workout-form");
const exerciseTable = document.getElementById("workout-table");
const repsInput = document.getElementById("reps");
const weightInput = document.getElementById("weight");
const exerciseSelect = document.getElementById("exercise-select");

// Variables to store exercise data and charts
let workoutsData = [];
let chartTotalReps, chartRepsPerMinute, chartRepsPerMonth, chartActivity;

// Add version numbers for data format
const DATA_VERSION_V1 = 1; // Original format (array of objects)
const DATA_VERSION_V2 = 2; // Series support
const DATA_VERSION_V3 = 3; // Multiple exercise types support
const CURRENT_DATA_VERSION = DATA_VERSION_V3;

// Function to load data from localStorage
function loadWorkoutData() {
    // First try to load from the current storage key
    if (localStorage.getItem("workoutData")) {
        const storedData = JSON.parse(localStorage.getItem("workoutData"));
        processStoredData(storedData, "workoutData");
    }
    // Check for legacy data storage key for backward compatibility
    else if (localStorage.getItem("pushUpsData")) {
        const storedData = JSON.parse(localStorage.getItem("pushUpsData"));
        processStoredData(storedData, "pushUpsData");

        // After successfully migrating, remove the old data
        localStorage.removeItem("pushUpsData");
    }

    // Initialize UI with the loaded data
    initializeUI();
}

// Process stored data and handle different format versions
function processStoredData(storedData, storageKey) {
    // Check if the stored data is an array (original format)
    if (Array.isArray(storedData)) {
        const migratedData = migrateArrayToV2Format(storedData);
        localStorage.setItem("workoutData", JSON.stringify(migratedData));
        workoutsData = migratedData.data;
    }
    // Check if it's v1 format
    else if (storedData.version === DATA_VERSION_V1) {
        const migratedData = migrateV1ToV2Format(storedData);
        localStorage.setItem("workoutData", JSON.stringify(migratedData));
        workoutsData = migratedData.data;
    }
    // Already v2 or v3 format
    else if (storedData.version === DATA_VERSION_V2 || storedData.version === DATA_VERSION_V3) {
        workoutsData = storedData.data || [];

        // If loading from legacy storage key, save to new key
        if (storageKey !== "workoutData") {
            localStorage.setItem("workoutData", JSON.stringify(storedData));
        }
    }
    // Unknown format - use empty array
    else {
        workoutsData = [];
    }

    return workoutsData;
}

// Initialize the UI with the loaded data
function initializeUI() {
    if (workoutsData.length > 0) {
        updateWorkoutTable();
        createOrUpdateCharts();
    }
}

// Update workout table to use a list with collapsible items
function updateWorkoutTable() {
    // Clear the current list
    const workoutListContainer = document.getElementById('workout-list-container');
    workoutListContainer.innerHTML = '';

    // Sort workouts by date (newest first) before populating the list
    workoutsData.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Add each workout to the list
    workoutsData.forEach(workout => addWorkoutToList(workout));

    // Add event listeners to toggle the details view
    setupToggleListeners();
}

// Add a workout item to the list
function addWorkoutToList(workout) {
    const workoutListContainer = document.getElementById('workout-list-container');

    // Create the main workout item
    const workoutItem = document.createElement('div');
    workoutItem.className = 'workout-item';
    workoutItem.dataset.id = new Date(workout.date).getTime(); // Use timestamp as ID

    // Format date
    const dateDetail = document.createElement('div');
    dateDetail.className = 'workout-detail date';
    dateDetail.textContent = createLongFormattedDate(new Date(workout.date));

    // Exercise type
    const exerciseDetail = document.createElement('div');
    exerciseDetail.className = 'workout-detail exercise';
    exerciseDetail.textContent = workout.exercise;

    // Total reps
    const repsDetail = document.createElement('div');
    repsDetail.className = 'workout-detail reps';
    repsDetail.textContent = workout.totalReps;

    // Time
    const timeDetail = document.createElement('div');
    timeDetail.className = 'workout-detail time';
    const displayTime = workout.totalTime || 0;
    timeDetail.textContent = displayTime + ' min';

    // Reps per minute
    const repsPerMinDetail = document.createElement('div');
    repsPerMinDetail.className = 'workout-detail reps-per-min';
    const repsPerMinute = displayTime > 0 ? (workout.totalReps / displayTime).toFixed(2) : 'N/A';
    repsPerMinDetail.textContent = repsPerMinute;

    // Toggle icon
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'toggle-icon';
    toggleIcon.innerHTML = '▶';
    repsPerMinDetail.appendChild(toggleIcon);

    // Add all details to the workout item
    workoutItem.appendChild(dateDetail);
    workoutItem.appendChild(exerciseDetail);
    workoutItem.appendChild(repsDetail);
    workoutItem.appendChild(timeDetail);
    workoutItem.appendChild(repsPerMinDetail);

    // Create the collapsible series container
    const seriesContainer = document.createElement('div');
    seriesContainer.className = 'series-container';

    // Create series list
    let seriesHtml = '<ul class="series-list">';
    workout.series.forEach((series, index) => {
        const seriesTime = new Date(series.timestamp);
        const weightDisplay = series.weight ? `${series.weight} kg` : 'Bodyweight';
        seriesHtml += `<li>Series ${index + 1}: ${series.reps} reps - ${weightDisplay} - ${seriesTime.toLocaleTimeString()}</li>`;
    });
    seriesHtml += '</ul>';
    seriesContainer.innerHTML = seriesHtml;

    // Add the workout item and series container to the list
    workoutListContainer.appendChild(workoutItem);
    workoutListContainer.appendChild(seriesContainer);
}

// Setup event listeners for toggling series details
function setupToggleListeners() {
    const workoutItems = document.querySelectorAll('.workout-item');

    workoutItems.forEach(item => {
        item.addEventListener('click', function () {
            this.classList.toggle('expanded');
        });
    });
}

// Call the function to load data when the page loads
document.addEventListener('DOMContentLoaded', loadWorkoutData);

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
            exercise: entry.exercise || "Push-ups", // Detect or default to "Push-ups"
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
exerciseForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Get form values
    const reps = parseInt(repsInput.value);
    const exercise = exerciseSelect.value;
    const weight = weightInput.value ? parseFloat(weightInput.value) : null;
    const newEntryTime = new Date();
    const dateString = newEntryTime.toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if a workout for today already exists
    const existingWorkout = workoutsData.find(workout =>
        workout.dateString === dateString &&
        workout.exercise === exercise
    );

    if (existingWorkout) {
        // If a workout exists for today with the same exercise, add a new series
        const newSeries = {
            reps: reps,
            weight: weight,
            timestamp: newEntryTime
        };

        existingWorkout.series.push(newSeries);

        // Update the totals
        existingWorkout.totalReps += reps;

        // Calculate total time between first and last series
        const firstSeriesTime = new Date(existingWorkout.series[0].timestamp).getTime();
        const lastSeriesTime = newEntryTime.getTime();
        existingWorkout.totalTime = Math.round((lastSeriesTime - firstSeriesTime) / 60000);
    } else {
        // Create a new workout for today
        const newWorkout = {
            date: newEntryTime,
            dateString: dateString,
            exercise: exercise,
            series: [{
                reps: reps,
                weight: weight,
                timestamp: newEntryTime
            }],
            totalTime: 0, // First series, so no time elapsed yet
            totalReps: reps
        };

        workoutsData.push(newWorkout);
    }

    // Save to localStorage using the new format
    const dataToSave = {
        version: CURRENT_DATA_VERSION,
        data: workoutsData
    };
    localStorage.setItem("workoutData", JSON.stringify(dataToSave));

    // Clear and repopulate the list
    const workoutListContainer = document.getElementById('workout-list-container');
    workoutListContainer.innerHTML = '';

    updateWorkoutTable();
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

function addRowToTable(workout) {
    const row = exerciseTable.insertRow(1);
    const dateCell = row.insertCell(0);
    const exerciseCell = row.insertCell(1);
    const repsCell = row.insertCell(2);
    const timeCell = row.insertCell(3);
    const repsPerMinuteCell = row.insertCell(4);
    const seriesCell = row.insertCell(5);

    // Format and display the data in the table
    dateCell.innerHTML = createLongFormattedDate(new Date(workout.date));
    exerciseCell.innerHTML = workout.exercise;
    repsCell.innerHTML = workout.totalReps;

    // Handle time display - show 0 minutes for workouts with only one series
    const displayTime = workout.totalTime || 0;
    timeCell.innerHTML = displayTime + ' minutes';

    // Calculate reps per minute (if time > 0)
    const repsPerMinute = displayTime > 0 ?
        (workout.totalReps / displayTime).toFixed(2) :
        'N/A';
    repsPerMinuteCell.innerHTML = repsPerMinute;

    // Create series display
    let seriesHtml = '<ul class="series-list">';
    workout.series.forEach((series, index) => {
        const seriesTime = new Date(series.timestamp);
        const weightDisplay = series.weight ? `${series.weight} kg` : 'Bodyweight';
        seriesHtml += `<li>Series ${index + 1}: ${series.reps} reps - ${weightDisplay} - ${seriesTime.toLocaleTimeString()}</li>`;
    });
    seriesHtml += '</ul>';
    seriesCell.innerHTML = seriesHtml;
}

function aggregateDataByMonth(data) {
    const monthlyData = {};

    // Group by exercise type, year, and month
    data.forEach(workout => {
        const date = new Date(workout.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month}`;

        if (!monthlyData[key]) {
            monthlyData[key] = {
                year: year,
                month: month,
                reps: 0
            };
        }

        monthlyData[key].reps += workout.totalReps;
    });

    // Sort by year and month
    return Object.values(monthlyData).sort((a, b) => {
        return a.year - b.year || a.month - b.month;
    });
}

function createOrUpdateCharts() {
    // Check if the charts already exist, if they do, update the data
    if (chartTotalReps && chartRepsPerMinute) {
        updateCharts();
    } else {
        createCharts();
    }
}

function createCharts() {
    // Get unique exercise types
    const exerciseTypes = [...new Set(workoutsData.map(workout => workout.exercise))];

    const canvasChartTotal = document.getElementById("reps-chart");
    const options = {
        scales: {
            y: {
                beginAtZero: true
            }
        },
        responsive: true,
        maintainAspectRatio: false
    };

    // Create datasets for each exercise type
    const datasets = [];
    const colorScale = generateColorScale(exerciseTypes.length);

    exerciseTypes.forEach((exerciseType, index) => {
        const exerciseData = workoutsData.filter(workout => workout.exercise === exerciseType);
        const dates = exerciseData.map(workout => createShortFormattedDate(new Date(workout.date)));
        const reps = exerciseData.map(workout => workout.totalReps);

        datasets.push({
            label: exerciseType,
            data: reps,
            backgroundColor: colorScale[index % colorScale.length],
            borderColor: colorScale[index % colorScale.length],
            borderWidth: 1,
        });
    });

    // Create the chart with all exercise types
    chartTotalReps = new Chart(canvasChartTotal, {
        type: "bar",
        data: {
            labels: getUniqueDates(),
            datasets: datasets
        },
        options: {
            ...options,
            plugins: {
                title: {
                    display: true,
                    text: 'Total Reps by Exercise'
                }
            }
        }
    });

    // Create reps per minute chart
    const canvasChartRepsPerMinute = document.getElementById("reps-per-minute-chart");
    const repsPerMinuteDatasets = [];

    exerciseTypes.forEach((exerciseType, index) => {
        const exerciseData = workoutsData.filter(workout => workout.exercise === exerciseType);
        const repsPerMinute = exerciseData.map(workout => {
            const time = workout.totalTime || 1; // Avoid division by zero
            return workout.totalReps / time;
        });

        repsPerMinuteDatasets.push({
            label: exerciseType,
            data: repsPerMinute,
            fill: false,
            borderColor: colorScale[index % colorScale.length],
            tension: 0.1,
        });
    });

    chartRepsPerMinute = new Chart(canvasChartRepsPerMinute, {
        type: "line",
        data: {
            labels: getUniqueDates(),
            datasets: repsPerMinuteDatasets
        },
        options: {
            ...options,
            plugins: {
                title: {
                    display: true,
                    text: 'Reps per Minute by Exercise'
                }
            }
        }
    });

    // Monthly chart with all exercise types
    const monthlyData = aggregateDataByMonth(workoutsData);
    const years = [...new Set(monthlyData.map(d => d.year))];
    const yearColorScale = generateColorScale(years.length);

    // Sort the months chronologically (by year and month)
    const allMonths = [...new Set(monthlyData.map(d => `${d.year}-${d.month}`))];
    allMonths.sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        return yearA - yearB || monthA - monthB;
    });

    const monthlyDatasets = years.map((year, index) => {
        const yearData = new Array(allMonths.length).fill(null);
        monthlyData.filter(d => d.year === year).forEach(d => {
            const monthIndex = allMonths.indexOf(`${d.year}-${d.month}`);
            yearData[monthIndex] = d.reps;
        });

        return {
            label: year.toString(),
            data: yearData,
            backgroundColor: yearColorScale[index % yearColorScale.length],
            borderColor: yearColorScale[index % yearColorScale.length],
            borderWidth: 1,
        };
    });

    const canvasChartRepsPerMonth = document.getElementById("reps-per-month-chart");
    chartRepsPerMonth = new Chart(canvasChartRepsPerMonth, {
        type: "bar",
        data: {
            labels: allMonths,
            datasets: monthlyDatasets
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
                            // Check if label is defined before attempting to split it
                            if (!label) return '';
                            const [year, month] = label.split('-');
                            if (index === 0 || (allMonths[index - 1] && allMonths[index - 1].split('-')[0] !== year)) {
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
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Progress'
                }
            }
        }
    });

    // Create the activity chart using the consolidated function
    prepareActivityChartData();
}

function getPushUpsPerDate() {
    return workoutsData.map(workout => workout.totalReps);
}

function getShortFormattedDates() {
    return workoutsData.map(workout => createShortFormattedDate(new Date(workout.date)));
}

function getPushUpsPerMinute() {
    return workoutsData.map(workout => {
        const time = workout.totalTime || 1; // Avoid division by zero
        return workout.totalReps / time;
    });
}

function updateCharts() {
    // Get unique exercise types
    const exerciseTypes = [...new Set(workoutsData.map(workout => workout.exercise))];
    const colorScale = generateColorScale(exerciseTypes.length);

    // Get unique dates for all workouts
    const uniqueDates = getUniqueDates();

    // Create datasets for each exercise type
    const totalRepsDatasets = [];
    const repsPerMinuteDatasets = [];

    exerciseTypes.forEach((exerciseType, index) => {
        const exerciseData = workoutsData.filter(workout => workout.exercise === exerciseType);

        // Create mapping of dates to reps for this exercise
        const dateToReps = {};
        const dateToRepsPerMinute = {};

        exerciseData.forEach(workout => {
            const formattedDate = createShortFormattedDate(new Date(workout.date));
            dateToReps[formattedDate] = workout.totalReps;

            const time = workout.totalTime || 1; // Avoid division by zero
            dateToRepsPerMinute[formattedDate] = workout.totalReps / time;
        });

        // Fill in data for all dates (with nulls for missing dates)
        const repsData = uniqueDates.map(date => dateToReps[date] || null);
        const repsPerMinuteData = uniqueDates.map(date => dateToRepsPerMinute[date] || null);

        // Add dataset for total reps chart
        totalRepsDatasets.push({
            label: exerciseType,
            data: repsData,
            backgroundColor: colorScale[index % colorScale.length],
            borderColor: colorScale[index % colorScale.length],
            borderWidth: 1
        });

        // Add dataset for reps per minute chart
        repsPerMinuteDatasets.push({
            label: exerciseType,
            data: repsPerMinuteData,
            fill: false,
            borderColor: colorScale[index % colorScale.length],
            tension: 0.1
        });
    });

    // Update the total reps chart
    chartTotalReps.data.labels = uniqueDates;
    chartTotalReps.data.datasets = totalRepsDatasets;
    chartTotalReps.update();

    // Update the reps per minute chart
    chartRepsPerMinute.data.labels = uniqueDates;
    chartRepsPerMinute.data.datasets = repsPerMinuteDatasets;
    chartRepsPerMinute.update();

    // Update monthly chart
    const monthlyData = aggregateDataByMonth(workoutsData);
    const years = [...new Set(monthlyData.map(d => d.year))];
    const yearColorScale = generateColorScale(years.length);

    // Sort the months chronologically (by year and month)
    const allMonths = [...new Set(monthlyData.map(d => `${d.year}-${d.month}`))];
    allMonths.sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        return yearA - yearB || monthA - monthB;
    });

    chartRepsPerMonth.data.labels = allMonths;
    chartRepsPerMonth.data.datasets = years.map((year, index) => {
        const yearData = new Array(allMonths.length).fill(null);
        monthlyData.filter(d => d.year === year).forEach(d => {
            const monthIndex = allMonths.indexOf(`${d.year}-${d.month}`);
            yearData[monthIndex] = d.reps;
        });

        return {
            label: year.toString(),
            data: yearData,
            backgroundColor: yearColorScale[index % yearColorScale.length],
            borderColor: yearColorScale[index % yearColorScale.length],
            borderWidth: 1,
        };
    });
    chartRepsPerMonth.update();

    // Update activity chart 
    prepareActivityChartData();
}

function getUniqueDates() {
    // Get unique dates from all workouts, sorted chronologically
    const dateStrings = [...new Set(workoutsData.map(workout => workout.dateString))];
    return dateStrings.sort().map(dateString => {
        const date = new Date(dateString);
        return createShortFormattedDate(date);
    });
}

function prepareActivityChartData() {
    // Create activity chart that shows all exercises combined
    const exerciseTypes = [...new Set(workoutsData.map(workout => workout.exercise))];

    // Group workout data by date across all exercise types
    const dateTotals = {};
    workoutsData.forEach(workout => {
        const dateString = workout.dateString;
        if (!dateTotals[dateString]) {
            dateTotals[dateString] = {
                date: new Date(workout.date),
                totalReps: 0
            };
        }
        dateTotals[dateString].totalReps += workout.totalReps;
    });

    // Convert to activity data format
    const activityData = Object.values(dateTotals).map(data => ({
        date: data.date,
        value: data.totalReps
    }));

    // Sort the activity data chronologically (oldest to newest)
    // This is critical for the activity chart to correctly calculate min/max years
    activityData.sort((a, b) => new Date(a.date) - new Date(b.date));

    const canvas = document.getElementById('activity');
    // Call the external function with a different name
    createActivityChart(activityData, canvas);
}

document.getElementById('download-csv').addEventListener('click', function () {
    const storedData = JSON.parse(localStorage.getItem('workoutData'));

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

    // Get current date in YYYY-MM-DD format for the filename
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `workout_data_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
});

function parseCSVData(csvData) {
    const rows = csvData.split('\n');
    const parsedData = [];

    // Check the header to determine the CSV format
    const header = rows[0].split(',').map(col => col.trim());

    // New format - has 8 columns including series data
    if (header.length >= 7 && header.includes('Series Number')) {
        // Process as new format with series
        const workoutMap = new Map(); // Map to group series by workout date AND exercise type

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

                // Create a unique key using both date and exercise type
                const workoutKey = `${dateString}-${exercise}`;

                // Create or update the workout in the map
                if (!workoutMap.has(workoutKey)) {
                    workoutMap.set(workoutKey, {
                        date: workoutDate,
                        dateString: dateString,
                        exercise: exercise,
                        series: [],
                        totalReps: totalReps,
                        totalTime: totalTime
                    });
                }

                // Add the series to the workout
                const workout = workoutMap.get(workoutKey);
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
            workoutsData = parsedData;
        } else {
            workoutsData = workoutsData.concat(parsedData);
        }

        // Save to localStorage using the new format
        const dataToSave = {
            version: CURRENT_DATA_VERSION,
            data: workoutsData
        };
        localStorage.setItem("workoutData", JSON.stringify(dataToSave));

        // Clear and update the workout list
        const workoutListContainer = document.getElementById('workout-list-container');
        workoutListContainer.innerHTML = '';

        updateWorkoutTable();
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
