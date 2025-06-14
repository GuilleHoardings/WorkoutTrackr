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

            // Enhanced chart options with better styling
            const options = {
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e8e9ed',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Montserrat',
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: '#e8e9ed',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Montserrat',
                                size: 12
                            },
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
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

            // Create total reps chart
            this.createTotalRepsChart(exerciseTypes, uniqueDates, options);

            // Create reps per minute chart
            this.createRepsPerMinuteChart(exerciseTypes, uniqueDates, options);

            // Create monthly chart
            this.createMonthlyChart();

            // Create activity chart
            this.createActivityChart();

            // Create weekly summary chart
            this.createWeeklySummaryChart();

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
                    ...options.plugins,
                    title: {
                        display: true,
                        text: 'Total Reps by Exercise',
                        font: {
                            family: 'Montserrat',
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#374151',
                        padding: 20
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    ...options.scales,
                    x: {
                        ...options.scales.x,
                        stacked: false
                    },
                    y: {
                        ...options.scales.y,
                        stacked: false
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
                    ...options.plugins,
                    title: {
                        display: true,
                        text: 'Reps per Minute by Exercise',
                        font: {
                            family: 'Montserrat',
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#374151',
                        padding: 20
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        radius: 5,
                        hoverRadius: 8,
                        backgroundColor: '#fff',
                        borderWidth: 2
                    },
                    line: {
                        borderWidth: 3,
                        tension: 0.2
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
                        grid: {
                            color: '#e8e9ed',
                            lineWidth: 1
                        },
                        ticks: {
                            autoSkip: false,
                            maxRotation: 0,
                            minRotation: 0,
                            color: '#64748b',
                            font: {
                                family: 'Montserrat',
                                size: 11
                            },
                            callback: function (val, index) {
                                const label = this.getLabelForValue(val);
                                if (!label) return '';
                                const [year, month] = label.split('-');
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                const monthName = monthNames[parseInt(month) - 1];

                                if (index === 0 || (monthlyChartData.labels[index - 1] &&
                                    monthlyChartData.labels[index - 1].split('-')[0] !== year)) {
                                    return [`${monthName}`, year];
                                }
                                return monthName;
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e8e9ed',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Montserrat',
                                size: 12
                            }
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Progress',
                        font: {
                            family: 'Montserrat',
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#374151',
                        padding: 20
                    },
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
                        },
                        callbacks: {
                            title: function (context) {
                                const label = context[0].label;
                                const [year, month] = label.split('-');
                                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                    'July', 'August', 'September', 'October', 'November', 'December'];
                                return `${monthNames[parseInt(month) - 1]} ${year}`;
                            },
                            label: function (context) {
                                return `Total Reps: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 1800,
                    easing: 'easeInOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        this.charts.set('monthly', chart);
    }    /**
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

        const chart = new Chart(canvas, {
            type: 'line',
            data: weeklyData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Weekly Progress Trends',
                        font: {
                            family: 'Montserrat',
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#374151',
                        padding: 20
                    },
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
                },
                scales: {
                    x: {
                        grid: {
                            color: '#e8e9ed',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Montserrat',
                                size: 12
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e8e9ed',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Montserrat',
                                size: 12
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 4,
                        hoverRadius: 6,
                        backgroundColor: '#fff',
                        borderWidth: 2
                    },
                    line: {
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });

        this.charts.set('weeklySummary', chart);
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

            // Update weekly summary chart
            const weeklySummaryChart = this.charts.get('weeklySummary');
            if (weeklySummaryChart) {
                const weeklyChartData = this.prepareWeeklyChartData();
                weeklySummaryChart.data.labels = weeklyChartData.labels;
                weeklySummaryChart.data.datasets = weeklyChartData.datasets;
                weeklySummaryChart.update();
            }

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

            // Get base color for this exercise
            const baseColor = colorScale[index % colorScale.length];

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
                    const validColor = this.convertToValidColor(baseColor);
                    const validOpacityColor = this.adjustColorOpacity(validColor, 0.6);

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
                        hoverBackgroundColor: this.adjustColorOpacity(validColor, 0.8),
                        hoverBorderColor: validColor,
                        hoverBorderWidth: 3
                    });
                } else {
                    // Fallback without gradient
                    const validColor = this.convertToValidColor(baseColor);
                    datasets.push({
                        label: exerciseType,
                        data: valueData,
                        backgroundColor: this.adjustColorOpacity(validColor, 0.7),
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
    adjustColorOpacity(color, opacity) {
        // Convert hex to rgba
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        // Handle existing rgba
        else if (color.startsWith('rgba')) {
            return color.replace(/[\d\.]+\)$/, `${opacity})`);
        }
        // Handle rgb
        else if (color.startsWith('rgb')) {
            return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
        }
        // Handle hsla
        else if (color.startsWith('hsla')) {
            return color.replace(/[\d\.]+\)$/, `${opacity})`);
        }
        // Handle hsl - convert to hsla
        else if (color.startsWith('hsl')) {
            return color.replace('hsl', 'hsla').replace(')', `, ${opacity})`);
        }
        // Fallback - return original color
        return color;
    }

    /**
     * Convert any color to a valid hex color for gradients
     */
    convertToValidColor(color) {
        // If it's already a hex color, return as is
        if (color.startsWith('#')) {
            return color;
        }

        // For HSL colors, convert to RGB first then to hex
        if (color.startsWith('hsl')) {
            // Create a temporary element to use browser's color parsing
            const temp = document.createElement('div');
            temp.style.color = color;
            document.body.appendChild(temp);
            const computedColor = window.getComputedStyle(temp).color;
            document.body.removeChild(temp);

            // Convert rgb to hex
            if (computedColor.startsWith('rgb')) {
                const matches = computedColor.match(/\d+/g);
                if (matches && matches.length >= 3) {
                    const r = parseInt(matches[0]);
                    const g = parseInt(matches[1]);
                    const b = parseInt(matches[2]);
                    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                }
            }
        }

        // For RGB colors, convert to hex
        if (color.startsWith('rgb')) {
            const matches = color.match(/\d+/g);
            if (matches && matches.length >= 3) {
                const r = parseInt(matches[0]);
                const g = parseInt(matches[1]);
                const b = parseInt(matches[2]);
                return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            }
        }

        // Fallback to a default color
        return '#3B82F6';
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
        }        // Sort the months chronologically
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
    }    /**
     * Prepare activity chart data
     */
    prepareActivityChartData() {
        const workouts = this.dataManager.getAllWorkouts();

        // Group workout data by date and exercise type
        const dateExerciseData = {};
        workouts.forEach(workout => {
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
     * Prepare weekly chart data
     */
    prepareWeeklyChartData() {
        const workouts = this.dataManager.getAllWorkouts();
        const weeklyData = {};

        workouts.forEach(workout => {
            const date = new Date(workout.date);
            const year = date.getFullYear();
            const week = this.getWeekNumber(date);
            const key = `${year}-W${week.toString().padStart(2, '0')}`;

            if (!weeklyData[key]) {
                weeklyData[key] = {
                    week: key,
                    totalReps: 0,
                    workoutDays: new Set(),
                    exercises: new Set()
                };
            }

            weeklyData[key].totalReps += workout.totalReps;
            weeklyData[key].workoutDays.add(workout.dateString);
            weeklyData[key].exercises.add(workout.exercise);
        });

        // Convert to arrays and sort
        const sortedWeeks = Object.values(weeklyData)
            .sort((a, b) => a.week.localeCompare(b.week))
            .slice(-12); // Last 12 weeks

        const labels = sortedWeeks.map(w => w.week);
        const totalRepsData = sortedWeeks.map(w => w.totalReps);
        const workoutDaysData = sortedWeeks.map(w => w.workoutDays.size);

        return {
            labels: labels,
            datasets: [
                {
                    label: 'Total Reps',
                    data: totalRepsData,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y'
                },
                {
                    label: 'Workout Days',
                    data: workoutDaysData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    yAxisID: 'y1'
                }
            ]
        };
    }

    /**
     * Get week number for a date
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
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
