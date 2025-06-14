/**
 * ChartManager - Handles chart creation, updates, and management
 */
class ChartManager {
    constructor(dataManager, notificationManager) {
        this.dataManager = dataManager;
        this.notificationManager = notificationManager;
        this.charts = new Map();
        this.eventListeners = [];
    }

    /**
     * Create or update all charts
     */
    createOrUpdateCharts() {
        try {
            // Check if the charts already exist, if they do, update the data
            if (this.charts.has('totalReps') && this.charts.has('repsPerMinute')) {
                this.updateCharts();
            } else {
                this.createCharts();
            }
        } catch (error) {
            console.error("Error creating or updating charts:", error);
            this.notificationManager.showWarning("Failed to update charts. Data is still saved.");
        }
    }

    /**
     * Create all charts
     */
    createCharts() {
        try {
            const workouts = this.dataManager.getAllWorkouts();
            if (workouts.length === 0) {
                console.log("No workout data available for charts");
                return;
            }

            // Get unique exercise types and dates
            const exerciseTypes = this.dataManager.getUniqueExerciseTypes();
            const uniqueDates = this.getUniqueDates();

            const options = {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                responsive: true,
                maintainAspectRatio: false
            };

            // Create total reps chart
            this.createTotalRepsChart(exerciseTypes, uniqueDates, options);

            // Create reps per minute chart
            this.createRepsPerMinuteChart(exerciseTypes, uniqueDates, options);

            // Create monthly chart
            this.createMonthlyChart();

            // Create activity chart
            this.createActivityChart();

        } catch (error) {
            console.error("Error creating charts:", error);
            this.notificationManager.showError("Failed to create charts. Please refresh the page.");
        }
    }

    /**
     * Create total reps chart
     */
    createTotalRepsChart(exerciseTypes, uniqueDates, options) {
        const canvasChartTotal = document.getElementById("reps-chart");
        if (!canvasChartTotal) {
            console.warn("Reps chart canvas not found");
            return;
        }

        const totalRepsDatasets = this.createChartDatasets(exerciseTypes, uniqueDates, false);

        const chart = new Chart(canvasChartTotal, {
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

        this.charts.set('totalReps', chart);
    }

    /**
     * Create reps per minute chart
     */
    createRepsPerMinuteChart(exerciseTypes, uniqueDates, options) {
        const canvasChartRepsPerMinute = document.getElementById("reps-per-minute-chart");
        if (!canvasChartRepsPerMinute) {
            console.warn("Reps per minute chart canvas not found");
            return;
        }

        const repsPerMinuteDatasets = this.createChartDatasets(exerciseTypes, uniqueDates, true);

        const chart = new Chart(canvasChartRepsPerMinute, {
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

        this.charts.set('repsPerMinute', chart);
    }

    /**
     * Create monthly progress chart
     */
    createMonthlyChart() {
        const monthlyChartData = this.prepareMonthlyChartData();
        const canvasChartRepsPerMonth = document.getElementById("reps-per-month-chart");

        if (!canvasChartRepsPerMonth) {
            console.warn("Monthly chart canvas not found");
            return;
        }

        const chart = new Chart(canvasChartRepsPerMonth, {
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

        this.charts.set('monthly', chart);
    }

    /**
     * Create activity chart
     */
    createActivityChart() {
        const activityData = this.prepareActivityChartData();
        const canvas = document.getElementById('activity');

        if (!canvas) {
            console.warn("Activity chart canvas not found");
            return;
        }

        // Call the external function if it exists
        if (typeof createActivityChart === 'function') {
            createActivityChart(activityData, canvas);
        }
    }

    /**
     * Update all existing charts
     */
    updateCharts() {
        try {
            const exerciseTypes = this.dataManager.getUniqueExerciseTypes();
            const uniqueDates = this.getUniqueDates();

            // Update total reps chart
            const totalRepsChart = this.charts.get('totalReps');
            if (totalRepsChart) {
                totalRepsChart.data.labels = uniqueDates;
                totalRepsChart.data.datasets = this.createChartDatasets(exerciseTypes, uniqueDates, false);
                totalRepsChart.update();
            }

            // Update reps per minute chart
            const repsPerMinuteChart = this.charts.get('repsPerMinute');
            if (repsPerMinuteChart) {
                repsPerMinuteChart.data.labels = uniqueDates;
                repsPerMinuteChart.data.datasets = this.createChartDatasets(exerciseTypes, uniqueDates, true);
                repsPerMinuteChart.update();
            }

            // Update monthly chart
            const monthlyChart = this.charts.get('monthly');
            if (monthlyChart) {
                const monthlyChartData = this.prepareMonthlyChartData();
                monthlyChart.data.labels = monthlyChartData.labels;
                monthlyChart.data.datasets = monthlyChartData.datasets;
                monthlyChart.update();
            }

            // Update activity chart
            this.createActivityChart();

        } catch (error) {
            console.error("Error updating charts:", error);
            this.notificationManager.showWarning("Failed to update charts.");
        }
    }

    /**
     * Create chart datasets for each exercise type
     */
    createChartDatasets(exerciseTypes, uniqueDates, isRepsPerMinute = false) {
        const colorScale = this.generateColorScale(exerciseTypes.length);
        const datasets = [];
        const workouts = this.dataManager.getAllWorkouts();

        exerciseTypes.forEach((exerciseType, index) => {
            const exerciseData = workouts.filter(workout => workout.exercise === exerciseType);

            // Create mapping of dates to values for this exercise
            const dateToValue = {};
            exerciseData.forEach(workout => {
                const formattedDate = this.createShortFormattedDate(new Date(workout.date));
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

    /**
     * Prepare monthly chart data
     */
    prepareMonthlyChartData() {
        const monthlyData = this.aggregateDataByMonth();
        const years = [...new Set(monthlyData.map(d => d.year))];
        const yearColorScale = this.generateColorScale(years.length);

        // Create a complete set of month entries for all years in the data
        const allMonths = [];

        if (years.length === 0) {
            return { labels: [], datasets: [] };
        }

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
                if (monthIndex !== -1) {
                    yearData[monthIndex] = d.reps;
                }
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

    /**
     * Prepare activity chart data
     */
    prepareActivityChartData() {
        const workouts = this.dataManager.getAllWorkouts();

        // Group workout data by date across all exercise types
        const dateTotals = {};
        workouts.forEach(workout => {
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
        activityData.sort((a, b) => new Date(a.date) - new Date(b.date));

        return activityData;
    }

    /**
     * Aggregate data by month
     */
    aggregateDataByMonth() {
        const workouts = this.dataManager.getAllWorkouts();
        const monthlyData = {};

        workouts.forEach(workout => {
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

    /**
     * Get unique dates from all workouts
     */
    getUniqueDates() {
        const workouts = this.dataManager.getAllWorkouts();
        const dateStrings = [...new Set(workouts.map(workout => workout.dateString))];

        // Sort by actual date values instead of string comparison
        return dateStrings.sort((a, b) => new Date(a) - new Date(b)).map(dateString => {
            const date = new Date(dateString);
            return this.createShortFormattedDate(date);
        });
    }

    /**
     * Create short formatted date
     */
    createShortFormattedDate(date) {
        return new Intl.DateTimeFormat().format(date);
    }    /**
     * Generate color scale for charts
     */
    generateColorScale(count) {
        // Use the global generateColorScale function if available
        if (typeof generateColorScale === 'function') {
            return generateColorScale(count);
        }

        // Fallback color scale
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
            '#FF9F40', '#FFCD56', '#4BC0C0', '#36A2EB'
        ];

        // Generate additional colors if needed
        const result = [];
        for (let i = 0; i < count; i++) {
            if (i < colors.length) {
                result.push(colors[i]);
            } else {
                // Generate HSL colors for additional entries
                const hue = (i * 360 / count) % 360;
                result.push(`hsla(${hue}, 70%, 60%, 0.7)`);
            }
        }

        return result;
    }

    /**
     * Destroy all charts and clean up resources
     */
    destroyAllCharts() {
        this.charts.forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts.clear();
    }

    /**
     * Remove all event listeners
     */
    removeAllEventListeners() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.destroyAllCharts();
        this.removeAllEventListeners();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartManager;
} else {
    window.ChartManager = ChartManager;
}
