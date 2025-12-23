/**
 * ChartManager - Handles chart creation, updates, and management
 */
class ChartManager {
    constructor(dataManager, notificationManager) {
        this.dataManager = dataManager;
        this.notificationManager = notificationManager;
        this.charts = new Map();
        this.eventListeners = [];
        this.totalRepsViewType = 'weekly'; // 'daily', 'weekly', 'monthly', or 'yearly'
        this.repsPerMinuteViewType = 'weekly'; // 'daily', 'weekly', or 'monthly'
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

            const exerciseTypes = this.getExerciseTypes();
            
            const uniqueDates = this.getUniqueDates();

            const options = this.getBaseChartOptions();

            this.createTotalRepsChart(exerciseTypes, uniqueDates, options);

            // Set up chart view toggle buttons
            this.setupChartToggleButtons();
            this.setupRepsPerMinuteToggleButtons();

            this.createRepsPerMinuteChart(exerciseTypes, uniqueDates, options);
            this.createMonthlyChart();
            this.createWeeklySummaryChart();
            this.createPersonalRecordsChart();
            this.createActivityChart();

        } catch (error) {
            console.error("Error creating charts:", error);
            this.notificationManager.showError("Failed to create charts. Please refresh the page.");
        }
    }

    /**
     * Create total reps chart - supports daily, weekly, and monthly views
     */
    createTotalRepsChart(exerciseTypes, uniqueDates, options) {
        const canvasChartTotal = document.getElementById("reps-chart");
        if (!canvasChartTotal) {
            console.warn("Reps chart canvas not found");
            return;
        }

        const viewConfig = {
            daily: 'Daily',
            weekly: 'Weekly',
            monthly: 'Monthly',
            yearly: 'Yearly'
        };

        const period = this.totalRepsViewType;
        const chartTitle = `${viewConfig[period] || 'Daily'} Total Reps by Exercise`;
        const isStacked = true;

        const chartData = period === 'daily'
            ? { labels: uniqueDates, datasets: this.createChartDatasets(exerciseTypes, uniqueDates, false) }
            : ChartDataUtils.preparePeriodRepsData(
                this.dataManager.getAllWorkouts(),
                exerciseTypes,
                period,
                this.getExerciseBaseColor.bind(this),
                ColorUtils.convertToValidColor,
                ColorUtils.adjustColorOpacity,
                this.generateColorScale.bind(this)
            );

        const mergedOptions = this.getChartOptions(chartTitle, {
            plugins: {
                title: {
                    font: { family: 'Montserrat', size: 16, weight: 'bold' },
                    color: '#374151',
                    padding: 20
                },
                tooltip: {
                    ...options.plugins.tooltip,
                    callbacks: this.totalRepsViewType !== 'daily' ? {
                        afterBody: (context) => {
                            const total = context.reduce((sum, item) => sum + item.parsed.y, 0);
                            const periodName = { weekly: 'week', monthly: 'month', yearly: 'year' }[this.totalRepsViewType] || 'period';
                            return `Total for ${periodName}: ${total} reps`;
                        }
                    } : undefined
                }
            },
            animation: { duration: 1500, easing: 'easeInOutQuart' },
            interaction: { intersect: false, mode: 'index' },
            scales: {
                x: {
                    stacked: isStacked,
                    ticks: { callback: this.getXAxisTickCallback() }
                },
                y: {
                    stacked: isStacked,
                    title: { display: true, text: 'Total Reps', font: { family: 'Montserrat', size: 13, weight: 'bold' }, color: '#64748b' }
                }
            }
        });

        const chart = this.createChart(canvasChartTotal, 'bar', chartData, { options: mergedOptions });

        this.charts.set('totalReps', chart);
    }

    /**
     * Create reps per minute chart - supports daily, weekly, and monthly views
     */
    createRepsPerMinuteChart(exerciseTypes, uniqueDates, options) {
        const canvasChartRepsPerMinute = document.getElementById("reps-per-minute-chart");
        if (!canvasChartRepsPerMinute) {
            console.warn("Reps per minute chart canvas not found");
            return;
        }

        const viewConfig = {
            daily: 'Daily',
            weekly: 'Weekly Average',
            monthly: 'Monthly Average'
        };

        const period = this.repsPerMinuteViewType;
        const chartTitle = `${viewConfig[period] || 'Daily'} Reps per Minute by Exercise`;

        const chartData = period === 'daily' 
            ? { labels: uniqueDates, datasets: this.createChartDatasets(exerciseTypes, uniqueDates, true) }
            : ChartDataUtils.preparePeriodRepsPerMinuteData(
                this.dataManager.getAllWorkouts(),
                exerciseTypes,
                period,
                this.getExerciseBaseColor.bind(this),
                ColorUtils.convertToValidColor,
                ColorUtils.adjustColorOpacity
            );

        const rpmOptions = this.getChartOptions(chartTitle, {
            plugins: {
                title: { font: { family: 'Montserrat', size: 16, weight: 'bold' }, color: '#374151', padding: 20 },
                tooltip: {
                    ...options.plugins.tooltip,
                    callbacks: this.repsPerMinuteViewType !== 'daily' ? {
                        afterBody: (context) => {
                            const values = context.filter(item => item.parsed.y > 0);
                            const avgRpm = values.length > 0
                                ? (values.reduce((sum, item) => sum + item.parsed.y, 0) / values.length).toFixed(2)
                                : 0;
                            const periodName = this.repsPerMinuteViewType === 'weekly' ? 'week' : 'month';
                            return `Average for ${periodName}: ${avgRpm} reps/min`;
                        }
                    } : undefined
                }
            },
            animation: { duration: 2000, easing: 'easeInOutQuart' },
            interaction: { intersect: false, mode: 'index' },
            elements: {
                point: { radius: 5, hoverRadius: 8, backgroundColor: '#fff', borderWidth: 2 },
                line: { borderWidth: 3, tension: 0.2 }
            },
            scales: { x: { ticks: { callback: this.getRepsPerMinuteXAxisTickCallback() } }, y: { title: { display: true, text: 'Reps per Minute', font: { family: 'Montserrat', size: 13, weight: 'bold' }, color: '#64748b' } } }
        });

        const chart = this.createChart(canvasChartRepsPerMinute, 'line', chartData, { options: rpmOptions });

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

        const monthlyOptions = this.getChartOptions('Monthly Progress', {
            plugins: {
                title: { font: { family: 'Montserrat', size: 16, weight: 'bold' }, color: '#374151', padding: 20 },
                legend: { labels: { font: { family: 'Montserrat', size: 13 }, color: '#374151', usePointStyle: true, pointStyle: 'circle' } },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#e5e7eb',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    font: { family: 'Montserrat' },
                    callbacks: {
                        title: function (context) {
                            const label = context[0].label;
                            const [year, month] = label.split('-');
                            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                            return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
                        },
                        label: function (context) { return `Total Reps: ${context.parsed.y}`; }
                    }
                }
            },
            animation: { duration: 1800, easing: 'easeInOutQuart' },
            interaction: { intersect: false, mode: 'index' },
            scales: {
                x: {
                    grid: { color: '#e8e9ed', lineWidth: 1 },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0,
                        color: '#64748b',
                        font: { family: 'Montserrat', size: 11 },
                        callback: function (val, index) {
                            const label = this.getLabelForValue(val); if (!label) return '';
                            const [year, month] = label.split('-');
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const monthName = monthNames[parseInt(month, 10) - 1];
                            if (index === 0 || (monthlyChartData.labels[index - 1] && monthlyChartData.labels[index - 1].split('-')[0] !== year)) return [`${monthName}`, year];
                            return monthName;
                        }
                    }
                },
                y: { beginAtZero: true, grid: { color: '#e8e9ed', lineWidth: 1 }, ticks: { color: '#64748b', font: { family: 'Montserrat', size: 12 } } }
            }
        });

        const chart = this.createChart(canvasChartRepsPerMonth, 'bar', monthlyChartData, { options: monthlyOptions });

        this.charts.set('monthly', chart);
    }    /**
     * Create personal records chart showing best sets over time
     */
    createPersonalRecordsChart() {
        const prData = this.preparePersonalRecordsData();
        const canvas = document.getElementById('personal-records-chart');

        if (!canvas) {
            console.warn("Personal records chart canvas not found");
            return;
        }

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const prOptions = this.getChartOptions('Personal Records (Best Single Set)', {
            plugins: {
                title: { font: { family: 'Montserrat', size: 16, weight: 'bold' }, color: '#374151', padding: 20 },
                legend: { labels: { font: { family: 'Montserrat', size: 13 }, color: '#374151', usePointStyle: true, pointStyle: 'circle' } },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#e5e7eb',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    font: { family: 'Montserrat' },
                    callbacks: {
                        title: function(context) {
                            const label = context[0].label;
                            const [year, month] = label.split('-');
                            return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} reps (PR)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: '#e8e9ed', lineWidth: 1 },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0,
                        color: '#64748b',
                        font: { family: 'Montserrat', size: 11 },
                        callback: function(val, index) {
                            const label = this.getLabelForValue(val);
                            if (!label) return '';
                            const [year, month] = label.split('-');
                            const monthName = monthNames[parseInt(month, 10) - 1];
                            if (index === 0 || (prData.labels[index - 1] && prData.labels[index - 1].split('-')[0] !== year)) {
                                return [`${monthName}`, year];
                            }
                            return monthName;
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: '#e8e9ed', lineWidth: 1 },
                    ticks: { color: '#64748b', font: { family: 'Montserrat', size: 12 } },
                    title: { display: true, text: 'Best Reps in Single Set', font: { family: 'Montserrat', size: 13, weight: 'bold' }, color: '#64748b' }
                }
            },
            elements: {
                point: { radius: 5, hoverRadius: 8, backgroundColor: '#fff', borderWidth: 2 },
                line: { borderWidth: 3, tension: 0.3 }
            },
            animation: { duration: 2000, easing: 'easeInOutQuart' }
        });

        const chart = this.createChart(canvas, 'line', prData, { options: prOptions });

        this.charts.set('personalRecords', chart);
    }

    /**
     * Prepare personal records data
     */
    preparePersonalRecordsData() {
        const exerciseTypes = this.getExerciseTypes();
        return ChartDataUtils.preparePersonalRecordsData(
            this.dataManager.getAllWorkouts(),
            exerciseTypes,
            this.getExerciseBaseColor.bind(this),
            ColorUtils.convertToValidColor,
            ColorUtils.adjustColorOpacity
        );
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
     * Create weekly summary chart showing trends
     */
    createWeeklySummaryChart() {
        const weeklyData = this.prepareWeeklyChartData();
        const canvas = document.getElementById('weekly-summary-chart');

        if (!canvas) {
            console.warn("Weekly summary chart canvas not found");
            return;
        }

        const weeklyOptions = this.getChartOptions('Weekly Progress Trends', {
            plugins: {
                title: { font: { family: 'Montserrat', size: 16, weight: 'bold' }, color: '#374151', padding: 20 },
                legend: { labels: { font: { family: 'Montserrat', size: 13 }, color: '#374151', usePointStyle: true, pointStyle: 'circle' } },
                tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1, cornerRadius: 8, displayColors: true, font: { family: 'Montserrat' } }
            },
            scales: {
                x: { grid: { color: '#e8e9ed', lineWidth: 1 }, ticks: { color: '#64748b', font: { family: 'Montserrat', size: 12 } } },
                y: { beginAtZero: true, grid: { color: '#e8e9ed', lineWidth: 1 }, ticks: { color: '#64748b', font: { family: 'Montserrat', size: 12 } } },
                y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#10B981', font: { family: 'Montserrat', size: 12 } } }
            },
            elements: { point: { radius: 4, hoverRadius: 6, backgroundColor: '#fff', borderWidth: 2 }, line: { borderWidth: 3, tension: 0.3, fill: true } },
            animation: { duration: 2000, easing: 'easeInOutQuart' }
        });

        const chart = this.createChart(canvas, 'line', weeklyData, { options: weeklyOptions });

        this.charts.set('weeklySummary', chart);
    }

    /**
     * Update all existing charts
     */
    updateCharts() {
        try {
            const exerciseTypes = this.getExerciseTypes();
            const uniqueDates = this.getUniqueDates();
            const workouts = this.dataManager.getAllWorkouts();

            // Update total reps chart
            this.updateChartData('totalReps', () =>
                this.totalRepsViewType === 'daily'
                    ? { labels: uniqueDates, datasets: this.createChartDatasets(exerciseTypes, uniqueDates, false) }
                    : ChartDataUtils.preparePeriodRepsData(
                        workouts,
                        exerciseTypes,
                        this.totalRepsViewType,
                        this.getExerciseBaseColor.bind(this),
                        ColorUtils.convertToValidColor,
                        ColorUtils.adjustColorOpacity,
                        this.generateColorScale.bind(this)
                    )
            );

            // Update reps per minute chart
            this.updateChartData('repsPerMinute', () => 
                this.repsPerMinuteViewType === 'daily'
                    ? { labels: uniqueDates, datasets: this.createChartDatasets(exerciseTypes, uniqueDates, true) }
                    : ChartDataUtils.preparePeriodRepsPerMinuteData(
                        workouts,
                        exerciseTypes,
                        this.repsPerMinuteViewType,
                        this.getExerciseBaseColor.bind(this),
                        ColorUtils.convertToValidColor,
                        ColorUtils.adjustColorOpacity
                    )
            );

            // Update monthly chart
            this.updateChartData('monthly', () => this.prepareMonthlyChartData());

            // Update activity chart
            this.createActivityChart();

            // Update weekly summary chart
            this.updateChartData('weeklySummary', () => this.prepareWeeklyChartData());

            // Update personal records chart
            this.updateChartData('personalRecords', () => this.preparePersonalRecordsData());

        } catch (error) {
            console.error("Error updating charts:", error);
            this.notificationManager.showWarning("Failed to update charts.");
        }
    }

    /**
     * Helper method to update chart data
     */
    updateChartData(chartKey, dataFn) {
        const chart = this.charts.get(chartKey);
        if (chart) {
            const chartData = dataFn();
            chart.data.labels = chartData.labels;
            chart.data.datasets = chartData.datasets;
            chart.update();
        }
    }

    /**
     * Small helper to create and configure a Chart instance to reduce duplication
     */
    createChart(canvas, defaultType, data, config) {
        // Ensure the config object is present and merge dataset and type
        const cfg = config || {};
        cfg.type = cfg.type || defaultType;
        cfg.data = data;
        return new Chart(canvas, cfg);
    }

    /**
     * Get exercise types from manager or data
     */
    getExerciseTypes() {
        return window.workoutApp?.exerciseTypeManager?.getExerciseTypes() 
            || this.dataManager.getUniqueExerciseTypes();
    }

    /**
     * Create chart datasets for each exercise type
     */
    createChartDatasets(exerciseTypes, uniqueDates, isRepsPerMinute = false) {
        const datasets = [];
        const workouts = this.dataManager.getAllWorkouts();

        exerciseTypes.forEach((exerciseType, index) => {
            const exerciseData = workouts.filter(workout => workout.exercise === exerciseType);

            // Create mapping of dates to aggregated values for this exercise
            const dateToValue = {};
            exerciseData.forEach(workout => {
                const formattedDate = ChartDataUtils.createShortFormattedDate(new Date(workout.date));

                if (!dateToValue[formattedDate]) {
                    dateToValue[formattedDate] = isRepsPerMinute
                        ? { totalReps: 0, totalTime: 0 }
                        : 0;
                }

                if (isRepsPerMinute) {
                    // Aggregate totals so multiple sessions per day get combined instead of overwritten
                    const time = workout.totalTime && workout.totalTime > 0 ? workout.totalTime : 1;
                    dateToValue[formattedDate].totalReps += workout.totalReps;
                    dateToValue[formattedDate].totalTime += time;
                } else {
                    dateToValue[formattedDate] += workout.totalReps;
                }
            });

            // Fill in data for all dates (with zeros for missing dates to show gaps)
            const valueData = uniqueDates.map(date => {
                const value = dateToValue[date];
                if (!value) {
                    return 0;
                }
                if (isRepsPerMinute) {
                    const { totalReps, totalTime } = value;
                    return totalReps / (totalTime || 1);
                }
                return value;
            });

            // Get base color for this exercise (consistent across all charts)
            const baseColor = this.getExerciseBaseColor(exerciseType, index);

            // Create appropriate dataset based on chart type
            if (isRepsPerMinute) {
                datasets.push({
                    label: exerciseType,
                    data: valueData,
                    fill: false,
                    borderColor: baseColor,
                    backgroundColor: baseColor,
                    tension: 0.2,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: baseColor,
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: baseColor,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                });
            } else {
                // Create gradient for bar charts
                const canvas = document.getElementById("reps-chart");
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);

                    // Convert color to valid format for gradients
                    const validColor = ColorUtils.convertToValidColor(baseColor);
                    const validOpacityColor = ColorUtils.adjustColorOpacity(validColor, 0.6);

                    gradient.addColorStop(0, validColor);
                    gradient.addColorStop(1, validOpacityColor);

                    datasets.push({
                        label: exerciseType,
                        data: valueData,
                        backgroundColor: gradient,
                        borderColor: validColor,
                        borderWidth: 2,
                        borderRadius: 4,
                        borderSkipped: false,
                        hoverBackgroundColor: ColorUtils.adjustColorOpacity(validColor, 0.8),
                        hoverBorderColor: validColor,
                        hoverBorderWidth: 3
                    });
                } else {
                    // Fallback without gradient
                    const validColor = ColorUtils.convertToValidColor(baseColor);
                    datasets.push({
                        label: exerciseType,
                        data: valueData,
                        backgroundColor: ColorUtils.adjustColorOpacity(validColor, 0.7),
                        borderColor: validColor,
                        borderWidth: 2,
                        borderRadius: 4
                    });
                }
            }
        });

        return datasets;
    }    /**
     * Adjust color opacity
     */
    // NOTE: color utilities are provided by js/ColorUtils.js - use ColorUtils.convertToValidColor/adjustColorOpacity
    /**
     * Get a consistent base color for an exercise type across all charts.
     * Priority:
     * 1. ExerciseTypeManager hue mapping (same as activity tracker)
     * 2. Stable hash-based HSL if manager absent
     * 3. Fallback to generated color scale
     */
    getExerciseBaseColor(exerciseType, index = 0) {
        try {
            if (window.workoutApp && window.workoutApp.exerciseTypeManager) {
                const info = window.workoutApp.exerciseTypeManager.getExerciseColor(exerciseType);
                if (info && typeof info.hue === 'number') {
                    // Fixed lightness for charts (activity tracker varies lightness by reps)
                    return `hsl(${info.hue}, 70%, 45%)`;
                }
            }
        } catch (e) { /* ignore and fallback */ }

        // Stable hash-based hue (deterministic) if manager unavailable
        let hash = 0;
        for (let i = 0; i < exerciseType.length; i++) {
            hash = exerciseType.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 45%)`;
    }

    /**
     * Convert any color to a valid hex color for gradients
     */
    convertToValidColor(color) {
    // Note: kept for backward compatibility - delegate to ColorUtils
        return ColorUtils.convertToValidColor(color);
    }

    /**
     * Prepare monthly chart data
     */
    prepareMonthlyChartData() {
        const monthlyData = ChartDataUtils.aggregateDataByMonth(this.dataManager.getAllWorkouts());
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
                allMonths.push(ChartDataUtils.createMonthKey(year, month));
            }
        }

        const monthKeyToIndex = allMonths.reduce((acc, key, index) => {
            acc[key] = index;
            return acc;
        }, {});

        const monthlyDatasets = years.map((year, index) => {
            const yearData = new Array(allMonths.length).fill(null);
            monthlyData
                .filter(d => d.year === year)
                .forEach(d => {
                    const monthKey = ChartDataUtils.createMonthKey(d.year, d.month);
                    const monthIndex = monthKeyToIndex[monthKey];
                    if (typeof monthIndex === 'number') {
                        yearData[monthIndex] = d.reps;
                    }
                });

            const color = yearColorScale[index % yearColorScale.length];
            return {
                label: year.toString(),
                data: yearData,
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1,
            };
        });

        return {
            labels: allMonths,
            datasets: monthlyDatasets
        };
    }    /**
     * Prepare activity chart data
     */
    prepareActivityChartData() {
        const workouts = this.dataManager.getAllWorkouts();

        // Get allowed exercise types from ExerciseTypeManager if available
        let allowedExerciseTypes = null;
        if (window.workoutApp && window.workoutApp.exerciseTypeManager) {
            allowedExerciseTypes = new Set(window.workoutApp.exerciseTypeManager.getExerciseTypes());
        }

        // Group workout data by date and exercise type
        const dateExerciseData = {};
        workouts.forEach(workout => {
            // Skip workouts with deleted exercise types if we have a managed list
            if (allowedExerciseTypes && !allowedExerciseTypes.has(workout.exercise)) {
                return;
            }

            const dateString = workout.dateString;
            if (!dateExerciseData[dateString]) {
                dateExerciseData[dateString] = {
                    date: new Date(workout.date),
                    exercises: {},
                    totalReps: 0
                };
            }

            if (!dateExerciseData[dateString].exercises[workout.exercise]) {
                dateExerciseData[dateString].exercises[workout.exercise] = 0;
            }

            dateExerciseData[dateString].exercises[workout.exercise] += workout.totalReps;
            dateExerciseData[dateString].totalReps += workout.totalReps;
        });

        // Convert to activity data format
        const activityData = Object.values(dateExerciseData).map(data => ({
            date: data.date,
            value: data.totalReps,
            exercises: data.exercises
        }));

        // Sort the activity data chronologically (oldest to newest)
        activityData.sort((a, b) => new Date(a.date) - new Date(b.date));

        return activityData;
    }

    /**
     * Get X-axis tick callback based on provided view type (or default to totalRepsViewType)
     */
    getXAxisTickCallback(viewType = this.totalRepsViewType) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const formatters = {
            weekly: (label) => {
                const [year, week] = label.split('-W');
                return `W${week}\n${year}`;
            },
            monthly: (label) => {
                const [year, month] = label.split('-');
                return `${monthNames[parseInt(month, 10) - 1]}\n${year}`;
            },
            yearly: (label) => label,
            daily: (label) => {
                const parts = label.split('-');
                if (parts.length !== 3) return label;
                const [year, month, day] = parts;
                return `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`;
            }
        };

        const formatter = formatters[viewType];
        return formatter ? function(val) {
            const label = this.getLabelForValue(val);
            return label ? formatter(label) : '';
        } : undefined;
    }

    /**
     * Get X-axis tick callback based on current view type for reps per minute chart
     */
    getRepsPerMinuteXAxisTickCallback() {
        return this.getXAxisTickCallback(this.repsPerMinuteViewType);
    }





    /**
     * Generic method to set up toggle buttons for chart views
     * @param {Object} config - Configuration object for the toggle buttons
     */
    setupToggleButtons(config) {
        const buttons = config.buttonIds.map(id => document.getElementById(id));
        
        if (buttons.some(btn => !btn)) {
            console.warn(`${config.name} toggle buttons not found`);
            return;
        }

        config.viewTypes.forEach((viewType, index) => {
            const button = buttons[index];
            const handler = () => {
                config.switchFunction.call(this, viewType);
                this.setActiveButton(button, buttons.filter(b => b !== button));
            };
            
            button.addEventListener('click', handler);
            this.eventListeners.push({ element: button, event: 'click', handler });
        });
    }

    /**
     * Set up chart toggle buttons
     */
    setupChartToggleButtons() {
        this.setupToggleButtons({
            name: 'Chart',
            buttonIds: ['daily-view-btn', 'weekly-view-btn', 'monthly-view-btn', 'yearly-view-btn'],
            viewTypes: ['daily', 'weekly', 'monthly', 'yearly'],
            switchFunction: this.switchTotalRepsView
        });
    }



    /**
     * Set up reps per minute chart toggle buttons
     */
    setupRepsPerMinuteToggleButtons() {
        this.setupToggleButtons({
            name: 'Reps per minute chart',
            buttonIds: ['rpm-daily-view-btn', 'rpm-weekly-view-btn', 'rpm-monthly-view-btn'],
            viewTypes: ['daily', 'weekly', 'monthly'],
            switchFunction: this.switchRepsPerMinuteView
        });
    }

    /**
     * Get base chart options for consistent styling across all charts
     * @returns {Object} Base chart options object
     */
    getBaseChartOptions() {
        return {
            scales: {
                y: {
                    beginAtZero: true,
                    display: true,
                    grid: {
                        color: '#e8e9ed',
                        lineWidth: 1,
                        display: true
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'Montserrat',
                            size: 12
                        },
                        display: true
                    },
                    border: {
                        display: true,
                        color: '#d1d5db',
                        width: 1
                    }
                },
                x: {
                    display: true,
                    position: 'bottom',
                    grid: {
                        color: '#e8e9ed',
                        lineWidth: 1,
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: true
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'Montserrat',
                            size: 10
                        },
                        maxRotation: 35,
                        minRotation: 0,
                        display: true,
                        padding: 8
                    },
                    border: {
                        display: true,
                        color: '#d1d5db',
                        width: 2
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 10,
                    bottom: 50,
                    left: 15,
                    right: 15
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            family: 'Montserrat',
                            size: 13
                        },
                        color: '#374151',
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#e5e7eb',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    font: {
                        family: 'Montserrat'
                    }
                }
            }
        };
    }

    /**
     * Build chart options from base options, a title, and chart-specific overrides.
     * This produces a deep-ish merge for common nested plugin and scales areas.
     */
    getChartOptions(title, overrides = {}) {
        const base = this.getBaseChartOptions();
        // Merge title into base plugins
        const options = {
            ...base,
            ...overrides,
            plugins: {
                ...base.plugins,
                ...(overrides.plugins || {}),
                title: {
                    ...(base.plugins && base.plugins.title ? base.plugins.title : {}),
                    ...(overrides.plugins && overrides.plugins.title ? overrides.plugins.title : {}),
                    display: true,
                    text: title,
                }
            }
        };

        // Deep-merge scales and ticks if provided
        if (base.scales && overrides.scales) {
            options.scales = {
                ...base.scales,
                ...overrides.scales,
            };

            Object.keys(base.scales).forEach(axis => {
                if (overrides.scales[axis]) {
                    options.scales[axis] = {
                        ...base.scales[axis],
                        ...overrides.scales[axis],
                        ticks: {
                            ...(base.scales[axis] && base.scales[axis].ticks ? base.scales[axis].ticks : {}),
                            ...(overrides.scales[axis] && overrides.scales[axis].ticks ? overrides.scales[axis].ticks : {})
                        }
                    };
                }
            });
        }

        return options;
    }

    /**
     * Generic method to switch chart views
     * @param {string} chartKey - Key for the chart in the charts Map
     * @param {string} viewTypeProperty - Property name for the view type (e.g., 'totalRepsViewType')
     * @param {string} viewType - New view type to switch to
     * @param {Function} createChartMethod - Method to recreate the chart
     */
    switchChartView(chartKey, viewTypeProperty, viewType, createChartMethod) {
        if (this[viewTypeProperty] === viewType) return;

        this[viewTypeProperty] = viewType;
        
        // Destroy and recreate the chart with new view
        const chart = this.charts.get(chartKey);
        if (chart) {
            chart.destroy();
            this.charts.delete(chartKey);
        }

        // Get current data and recreate chart
        try {
            const exerciseTypes = this.getExerciseTypes();
            
            const uniqueDates = this.getUniqueDates();
            const options = this.getBaseChartOptions();

            createChartMethod.call(this, exerciseTypes, uniqueDates, options);
        } catch (error) {
            console.error("Error switching chart view:", error);
            this.notificationManager.showError("Failed to switch chart view.");
        }
    }

    /**
     * Set active button state
     */
    setActiveButton(activeBtn, inactiveBtns) {
        activeBtn.classList.add('active');
        inactiveBtns.forEach(btn => btn.classList.remove('active'));
    }

    /**
     * Switch total reps chart view between daily, weekly, monthly, and yearly
     */
    switchTotalRepsView(viewType) {
        this.switchChartView('totalReps', 'totalRepsViewType', viewType, this.createTotalRepsChart);
    }

    /**
     * Switch reps per minute chart view between daily, weekly, and monthly
     */
    switchRepsPerMinuteView(viewType) {
        this.switchChartView('repsPerMinute', 'repsPerMinuteViewType', viewType, this.createRepsPerMinuteChart);
    }

    /**
     * Prepare weekly chart data
     */
    prepareWeeklyChartData() {
        return ChartDataUtils.prepareWeeklyChartData(this.dataManager.getAllWorkouts());
    }

    /**
     * Get unique dates from all workouts - includes all days between first and last workout
     */
    getUniqueDates() {
        const workouts = this.dataManager.getAllWorkouts();
        
        if (workouts.length === 0) {
            return [];
        }

        return ChartDataUtils.getAllDatesBetweenWorkouts(workouts, 90);
    }

    /**
     * Generate color scale for charts
     */
    generateColorScale(count) {
        // Use the global generateColorScale function if available
        if (typeof generateColorScale === 'function') {
            return generateColorScale(count);
        }

        // Enhanced color palette with better contrast and visual appeal
        const colors = [
            '#3B82F6', // Blue
            '#EF4444', // Red  
            '#10B981', // Green
            '#F59E0B', // Amber
            '#8B5CF6', // Violet
            '#06B6D4', // Cyan
            '#F97316', // Orange
            '#84CC16', // Lime
            '#EC4899', // Pink
            '#6366F1', // Indigo
            '#14B8A6', // Teal
            '#F43F5E'  // Rose
        ];

        // Generate additional colors if needed
        const result = [];
        for (let i = 0; i < count; i++) {
            if (i < colors.length) {
                result.push(colors[i]);
            } else {
                // Generate HSL colors for additional entries with better distribution
                const hue = (i * 137.5) % 360; // Using golden angle for better distribution
                const saturation = 70 + (i % 3) * 10; // Vary saturation slightly
                const lightness = 50 + (i % 2) * 10;  // Vary lightness slightly
                result.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
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
