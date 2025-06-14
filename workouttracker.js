// Constants
const exerciseForm = document.getElementById("workout-form");
const exerciseTable = document.getElementById("workout-table");
const repsInput = document.getElementById("reps");
const weightInput = document.getElementById("weight");
const exerciseSelect = document.getElementById("exercise-select");

// Validate that all essential DOM elements exist
function validateEssentialElements() {
    const essentialElements = {
        'workout-form': exerciseForm,
        'reps': repsInput,
        'weight': weightInput,
        'exercise-select': exerciseSelect
    };

    const missingElements = [];
    for (const [id, element] of Object.entries(essentialElements)) {
        if (!element) {
            missingElements.push(id);
        }
    }

    if (missingElements.length > 0) {
        console.error("Missing essential DOM elements:", missingElements);
        showErrorMessage(`Application error: Missing required elements (${missingElements.join(', ')}). Please refresh the page.`);
        return false;
    }

    return true;
}

// Variables to store exercise data and charts
let workoutsData = [];
let chartTotalReps, chartRepsPerMinute, chartRepsPerMonth, chartActivity;

// Add version numbers for data format
const DATA_VERSION_V1 = 1; // Original format (array of objects)
const DATA_VERSION_V2 = 2; // Series support
const DATA_VERSION_V3 = 3; // Multiple exercise types support
const CURRENT_DATA_VERSION = DATA_VERSION_V3;

// Function to show error messages to the user
function showErrorMessage(message, type = 'error') {
    const existingAlert = document.querySelector('.alert-message');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-message alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        max-width: 300px;
        background-color: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
    `;

    document.body.appendChild(alertDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Function to load data from localStorage
function loadWorkoutData() {
    try {
        // First try to load from the current storage key
        if (localStorage.getItem("workoutData")) {
            const storedDataStr = localStorage.getItem("workoutData");
            if (!storedDataStr.trim()) {
                throw new Error("Stored data is empty");
            }
            const storedData = JSON.parse(storedDataStr);
            processStoredData(storedData, "workoutData");
        }
        // Check for legacy data storage key for backward compatibility
        else if (localStorage.getItem("pushUpsData")) {
            const storedDataStr = localStorage.getItem("pushUpsData");
            if (!storedDataStr.trim()) {
                throw new Error("Legacy data is empty");
            }
            const storedData = JSON.parse(storedDataStr);
            processStoredData(storedData, "pushUpsData");

            // After successfully migrating, remove the old data
            try {
                localStorage.removeItem("pushUpsData");
            } catch (removeError) {
                console.warn("Could not remove legacy data:", removeError);
            }
        }
    } catch (error) {
        console.error("Error loading workout data:", error);
        workoutsData = [];
        showErrorMessage("Failed to load saved data. Starting with empty workout list.");
    }

    // Initialize UI with the loaded data
    initializeUI();
}

// Process stored data and handle different format versions
function processStoredData(storedData, storageKey) {
    try {
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
                try {
                    localStorage.setItem("workoutData", JSON.stringify(storedData));
                } catch (saveError) {
                    console.warn("Could not save migrated data:", saveError);
                }
            }
        }
        // Unknown format - use empty array
        else {
            console.warn("Unknown data format, starting with empty array");
            workoutsData = [];
        }
    } catch (error) {
        console.error("Error processing stored data:", error);
        workoutsData = [];
        showErrorMessage("Failed to process stored data. Starting with empty workout list.");
    }

    return workoutsData;
}

// Initialize the UI with the loaded data
function initializeUI() {
    if (!validateEssentialElements()) {
        return;
    }

    if (workoutsData.length > 0) {
        updateWorkoutTable();
        createOrUpdateCharts();
    }
}

// Update workout table to use a list with collapsible items
function updateWorkoutTable() {
    try {
        // Clear the current list
        const workoutListContainer = document.getElementById('workout-list-container');
        if (!workoutListContainer) {
            console.error("Workout list container not found");
            return;
        }

        workoutListContainer.innerHTML = '';

        // Sort workouts by date (newest first) before populating the list
        workoutsData.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Add each workout to the list
        workoutsData.forEach(workout => addWorkoutToList(workout));

        // Add event listeners to toggle the details view
        setupToggleListeners();
    } catch (error) {
        console.error("Error updating workout table:", error);
        showErrorMessage("Failed to update workout display. Please refresh the page.", "warning");
    }
}

// Helper function to create series HTML list
function createSeriesListHtml(series) {
    let seriesHtml = '<ul class="series-list">';
    series.forEach((series, index) => {
        const seriesTime = new Date(series.timestamp);
        const weightDisplay = series.weight ? `${series.weight} kg` : 'Bodyweight';
        seriesHtml += `<li>Series ${index + 1}: ${series.reps} reps - ${weightDisplay} - ${seriesTime.toLocaleTimeString()}</li>`;
    });
    seriesHtml += '</ul>';
    return seriesHtml;
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
    toggleIcon.textContent = '▶';
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

    // Create series list using the shared function
    seriesContainer.innerHTML = createSeriesListHtml(workout.series);

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
// Helper function to create series for migration functions
function createMigratedSeries(date, totalReps, totalTime) {
    const repsPerSeries = Math.ceil(totalReps / 4);
    const seriesTimeGap = Math.floor(totalTime / 4);

    const series = [];
    for (let i = 0; i < 4; i++) {
        // Last series might have fewer reps to match the total
        const reps = (i === 3) ?
            totalReps - (repsPerSeries * 3) :
            repsPerSeries;

        if (reps <= 0) continue; // Skip if no reps for this series

        const seriesTime = new Date(date.getTime() + (i * seriesTimeGap * 60000));

        series.push({
            reps: reps,
            weight: null, // No weight data in original format
            timestamp: seriesTime
        });
    }

    return series;
}

function migrateArrayToV2Format(oldData) {
    // Transform original array format to v2 format with series
    const workouts = [];

    oldData.forEach(entry => {
        const date = new Date(entry.date);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

        // Create series using shared function
        const series = createMigratedSeries(date, entry.pushUps, entry.timeBetweenFirstAndLast);

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

        // Create series using shared function
        const series = createMigratedSeries(date, entry.pushUps, entry.timeBetweenFirstAndLast);

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

    try {
        // Get form values
        const reps = parseInt(repsInput.value);
        const exercise = exerciseSelect.value;
        const weight = weightInput.value ? parseFloat(weightInput.value) : null;

        // Validate inputs
        if (isNaN(reps) || reps <= 0) {
            showErrorMessage("Please enter a valid number of reps (greater than 0).");
            return;
        }

        if (reps > 10000) {
            showErrorMessage("Number of reps seems unusually high. Please check your input.");
            return;
        }

        if (weight !== null && (isNaN(weight) || weight < 0)) {
            showErrorMessage("Please enter a valid weight (0 or greater).");
            return;
        }

        if (weight !== null && weight > 1000) {
            showErrorMessage("Weight seems unusually high. Please check your input.");
            return;
        }

        if (!exercise || exercise.trim() === "") {
            showErrorMessage("Please select an exercise type.");
            return;
        }

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
        try {
            const dataToSave = {
                version: CURRENT_DATA_VERSION,
                data: workoutsData
            };
            localStorage.setItem("workoutData", JSON.stringify(dataToSave));
            showErrorMessage("Workout saved successfully!", "success");
        } catch (saveError) {
            console.error("Error saving workout data:", saveError);
            showErrorMessage("Failed to save workout data. Your data might be lost.");
            return;
        }

        // Clear form inputs
        repsInput.value = '';
        weightInput.value = '';

        // Clear and repopulate the list
        const workoutListContainer = document.getElementById('workout-list-container');
        workoutListContainer.innerHTML = '';

        updateWorkoutTable();
        createOrUpdateCharts();

    } catch (error) {
        console.error("Error processing workout submission:", error);
        showErrorMessage("An error occurred while adding your workout. Please try again.");
    }
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

    // Create series display using the shared function
    seriesCell.innerHTML = createSeriesListHtml(workout.series);
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
    try {
        // Check if the charts already exist, if they do, update the data
        if (chartTotalReps && chartRepsPerMinute) {
            updateCharts();
        } else {
            createCharts();
        }
    } catch (error) {
        console.error("Error creating or updating charts:", error);
        showErrorMessage("Failed to update charts. Data is still saved.", "warning");
    }
}

// Helper function to create chart datasets for each exercise type
function createChartDatasets(exerciseTypes, uniqueDates, isRepsPerMinute = false) {
    const colorScale = generateColorScale(exerciseTypes.length);
    const datasets = [];

    exerciseTypes.forEach((exerciseType, index) => {
        const exerciseData = workoutsData.filter(workout => workout.exercise === exerciseType);

        // Create mapping of dates to values for this exercise
        const dateToValue = {};
        exerciseData.forEach(workout => {
            const formattedDate = createShortFormattedDate(new Date(workout.date));
            if (isRepsPerMinute) {
                const time = workout.totalTime || 1; // Avoid division by zero
                dateToValue[formattedDate] = workout.totalReps / time;
            } else {
                dateToValue[formattedDate] = workout.totalReps;
            }
        });

        // Fill in data for all dates (with nulls for missing dates)
        const valueData = uniqueDates.map(date => dateToValue[date] || null);

        // Create appropriate dataset based on chart type
        if (isRepsPerMinute) {
            datasets.push({
                label: exerciseType,
                data: valueData,
                fill: false,
                borderColor: colorScale[index % colorScale.length],
                tension: 0.1
            });
        } else {
            datasets.push({
                label: exerciseType,
                data: valueData,
                backgroundColor: colorScale[index % colorScale.length],
                borderColor: colorScale[index % colorScale.length],
                borderWidth: 1
            });
        }
    });

    return datasets;
}

// Helper function to prepare monthly chart data
function prepareMonthlyChartData() {
    const monthlyData = aggregateDataByMonth(workoutsData);
    const years = [...new Set(monthlyData.map(d => d.year))];
    const yearColorScale = generateColorScale(years.length);

    // Create a complete set of month entries for all years in the data
    const allMonths = [];

    // Find min and max year to ensure we cover the entire range
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // Get current date to limit months in current year
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed

    // Generate all months for all years in the range
    for (let year = minYear; year <= maxYear; year++) {
        // For current year, only show months up to the current month
        const monthLimit = (year === currentYear) ? currentMonth : 12;

        for (let month = 1; month <= monthLimit; month++) {
            allMonths.push(`${year}-${month}`);
        }
    }

    // Sort the months chronologically
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

    return {
        labels: allMonths,
        datasets: monthlyDatasets
    };
}

function createCharts() {
    try {
        // Get unique exercise types
        const exerciseTypes = [...new Set(workoutsData.map(workout => workout.exercise))];
        const uniqueDates = getUniqueDates();

        const options = {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            responsive: true,
            maintainAspectRatio: false
        };

        // Create the total reps chart using the helper function
        const canvasChartTotal = document.getElementById("reps-chart");
        if (!canvasChartTotal) {
            console.warn("Reps chart canvas not found");
            return;
        }

        const totalRepsDatasets = createChartDatasets(exerciseTypes, uniqueDates, false);

        chartTotalReps = new Chart(canvasChartTotal, {
            type: "bar",
            data: {
                labels: uniqueDates,
                datasets: totalRepsDatasets
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

        // Create the reps per minute chart using the helper function
        const canvasChartRepsPerMinute = document.getElementById("reps-per-minute-chart");
        if (!canvasChartRepsPerMinute) {
            console.warn("Reps per minute chart canvas not found");
            return;
        }

        const repsPerMinuteDatasets = createChartDatasets(exerciseTypes, uniqueDates, true);

        chartRepsPerMinute = new Chart(canvasChartRepsPerMinute, {
            type: "line",
            data: {
                labels: uniqueDates,
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

        // Create the monthly chart using the helper function
        const monthlyChartData = prepareMonthlyChartData();
        const canvasChartRepsPerMonth = document.getElementById("reps-per-month-chart");

        if (!canvasChartRepsPerMonth) {
            console.warn("Monthly chart canvas not found");
            return;
        }

        chartRepsPerMonth = new Chart(canvasChartRepsPerMonth, {
            type: "bar",
            data: monthlyChartData,
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
                                if (index === 0 || (monthlyChartData.labels[index - 1] &&
                                    monthlyChartData.labels[index - 1].split('-')[0] !== year)) {
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

        // Create the activity chart
        prepareActivityChartData();
    } catch (error) {
        console.error("Error creating charts:", error);
        showErrorMessage("Failed to create charts. Please refresh the page.", "error");
    }
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
    // Get unique dates for all workouts - sorted chronologically
    const uniqueDates = getUniqueDates();
    const exerciseTypes = [...new Set(workoutsData.map(workout => workout.exercise))];

    // Update the total reps chart using the helper function
    chartTotalReps.data.labels = uniqueDates;
    chartTotalReps.data.datasets = createChartDatasets(exerciseTypes, uniqueDates, false);
    chartTotalReps.update();

    // Update the reps per minute chart using the helper function
    chartRepsPerMinute.data.labels = uniqueDates;
    chartRepsPerMinute.data.datasets = createChartDatasets(exerciseTypes, uniqueDates, true);
    chartRepsPerMinute.update();

    // Update the monthly chart using the helper function
    const monthlyChartData = prepareMonthlyChartData();
    chartRepsPerMonth.data.labels = monthlyChartData.labels;
    chartRepsPerMonth.data.datasets = monthlyChartData.datasets;
    chartRepsPerMonth.update();

    // Update the activity chart
    prepareActivityChartData();
}

function getUniqueDates() {
    // Get unique dates from all workouts, sorted chronologically
    const dateStrings = [...new Set(workoutsData.map(workout => workout.dateString))];

    // Sort by actual date values instead of string comparison
    return dateStrings.sort((a, b) => new Date(a) - new Date(b)).map(dateString => {
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
    try {
        const storedData = JSON.parse(localStorage.getItem('workoutData'));

        // Extract data array from the new format
        const workouts = Array.isArray(storedData) ? storedData : (storedData.data || []);

        if (workouts.length === 0) {
            showErrorMessage("No workout data to export.", "info");
            return;
        }

        // Convert to CSV format - now including series information
        let csvRows = [
            ['Workout Date', 'Exercise', 'Series Number', 'Reps', 'Weight', 'Series Time', 'Total Workout Reps', 'Total Workout Time (min)']
        ];

        workouts.forEach(workout => {
            try {
                const workoutDate = new Date(workout.date);
                if (isNaN(workoutDate.getTime())) {
                    console.warn("Invalid workout date:", workout.date);
                    return;
                }

                const totalReps = workout.totalReps ||
                    workout.series.reduce((sum, series) => sum + series.reps, 0);

                // Add each series as a separate row
                workout.series.forEach((series, index) => {
                    try {
                        const seriesTime = new Date(series.timestamp);
                        if (isNaN(seriesTime.getTime())) {
                            console.warn("Invalid series timestamp:", series.timestamp);
                            return;
                        }

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
                    } catch (seriesError) {
                        console.error("Error processing series:", seriesError, series);
                    }
                });
            } catch (workoutError) {
                console.error("Error processing workout:", workoutError, workout);
            }
        });

        if (csvRows.length <= 1) {
            showErrorMessage("No valid workout data found to export.", "warning");
            return;
        }

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
        document.body.removeChild(link);

        showErrorMessage("CSV file downloaded successfully!", "success");

    } catch (error) {
        console.error("Error exporting CSV:", error);
        showErrorMessage("Failed to export CSV file. Please try again.");
    }
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
    try {
        const fileInput = replace ? 'file-input-replace' : 'file-input';
        const file = document.getElementById(fileInput).files[0];

        if (!file) {
            showErrorMessage("Please select a file to import.");
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            showErrorMessage("Please select a valid CSV file.");
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            showErrorMessage("File is too large. Maximum size is 10MB.");
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            try {
                const csvData = event.target.result;

                if (!csvData || csvData.trim() === '') {
                    showErrorMessage("The selected file is empty.");
                    return;
                }

                const parsedData = parseCSVData(csvData);

                if (!parsedData || parsedData.length === 0) {
                    showErrorMessage("No valid workout data found in the CSV file.");
                    return;
                }

                if (replace) {
                    workoutsData = parsedData;
                    showErrorMessage(`Replaced all data with ${parsedData.length} workouts from CSV.`, "success");
                } else {
                    workoutsData = workoutsData.concat(parsedData);
                    showErrorMessage(`Imported ${parsedData.length} workouts from CSV.`, "success");
                }

                // Save to localStorage using the new format
                try {
                    const dataToSave = {
                        version: CURRENT_DATA_VERSION,
                        data: workoutsData
                    };
                    localStorage.setItem("workoutData", JSON.stringify(dataToSave));
                } catch (saveError) {
                    console.error("Error saving imported data:", saveError);
                    showErrorMessage("Data imported but failed to save. Changes may be lost.");
                    return;
                }

                // Clear and update the workout list
                const workoutListContainer = document.getElementById('workout-list-container');
                workoutListContainer.innerHTML = '';

                updateWorkoutTable();
                createOrUpdateCharts();
            } catch (parseError) {
                console.error("Error parsing CSV data:", parseError);
                showErrorMessage("Failed to parse CSV file. Please check the file format.");
            }
        };

        reader.onerror = function () {
            console.error("Error reading file:", reader.error);
            showErrorMessage("Failed to read the selected file.");
        };

        reader.readAsText(file);
    } catch (error) {
        console.error("Error importing CSV:", error);
        showErrorMessage("An error occurred while importing the CSV file.");
    }
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
