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

            // Get exercise types from ExerciseTypeManager if available, otherwise fall back to data-based types
            let exerciseTypes;
            if (window.workoutApp && window.workoutApp.exerciseTypeManager) {
                exerciseTypes = window.workoutApp.exerciseTypeManager.getExerciseTypes();
            } else {
                exerciseTypes = this.dataManager.getUniqueExerciseTypes();
            }
            
            const uniqueDates = this.getUniqueDates();

            const options = this.getBaseChartOptions();

            this.createTotalRepsChart(exerciseTypes, uniqueDates, options);

            // Set up chart view toggle buttons
            this.setupChartToggleButtons();
            this.setupRepsPerMinuteToggleButtons();

            this.createRepsPerMinuteChart(exerciseTypes, uniqueDates, options);
            this.createMonthlyChart();
            this.createWeeklySummaryChart();
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

        let chartData;
        let chartTitle;
        let isStacked;

        if (this.totalRepsViewType === 'weekly') {
            chartData = this.preparePeriodRepsData(exerciseTypes, 'weekly');
            chartTitle = 'Weekly Total Reps by Exercise';
            isStacked = true;
        } else if (this.totalRepsViewType === 'monthly') {
            chartData = this.preparePeriodRepsData(exerciseTypes, 'monthly');
            chartTitle = 'Monthly Total Reps by Exercise';
            isStacked = true;
        } else if (this.totalRepsViewType === 'yearly') {
            chartData = this.preparePeriodRepsData(exerciseTypes, 'yearly');
            chartTitle = 'Yearly Total Reps by Exercise';
            isStacked = true;
        } else {
            chartData = {
                labels: uniqueDates,
                datasets: this.createChartDatasets(exerciseTypes, uniqueDates, false)
            };
            chartTitle = 'Daily Total Reps by Exercise';
            isStacked = false;
        }

        const chart = new Chart(canvasChartTotal, {
            type: "bar",
            data: chartData,
            options: {
                ...options,
                plugins: {
                    ...options.plugins,
                    title: {
                        display: true,
                        text: chartTitle,
                        font: {
                            family: 'Montserrat',
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#374151',
                        padding: 20
                    },
                    tooltip: {
                        ...options.plugins.tooltip,
                        callbacks: (this.totalRepsViewType === 'weekly' || this.totalRepsViewType === 'monthly' || this.totalRepsViewType === 'yearly') ? {
                            afterBody: function(context) {
                                let total = 0;
                                context.forEach(item => {
                                    total += item.parsed.y;
                                });
                                let period = 'period';
                                if (this.totalRepsViewType === 'weekly') period = 'week';
                                else if (this.totalRepsViewType === 'monthly') period = 'month';
                                else if (this.totalRepsViewType === 'yearly') period = 'year';
                                return `Total for ${period}: ${total} reps`;
                            }.bind(this)
                        } : undefined
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
                        stacked: isStacked,
                        ticks: {
                            ...options.scales.x.ticks,
                            callback: this.getXAxisTickCallback()
                        }
                    },
                    y: {
                        ...options.scales.y,
                        stacked: isStacked,
                        title: {
                            display: true,
                            text: 'Total Reps',
                            font: {
                                family: 'Montserrat',
                                size: 13,
                                weight: 'bold'
                            },
                            color: '#64748b'
                        }
                    }
                }
            }
        });

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

        let chartData;
        let chartTitle;

        if (this.repsPerMinuteViewType === 'weekly') {
            chartData = this.preparePeriodRepsPerMinuteData(exerciseTypes, 'weekly');
            chartTitle = 'Weekly Average Reps per Minute by Exercise';
        } else if (this.repsPerMinuteViewType === 'monthly') {
            chartData = this.preparePeriodRepsPerMinuteData(exerciseTypes, 'monthly');
            chartTitle = 'Monthly Average Reps per Minute by Exercise';
        } else {
            chartData = {
                labels: uniqueDates,
                datasets: this.createChartDatasets(exerciseTypes, uniqueDates, true)
            };
            chartTitle = 'Daily Reps per Minute by Exercise';
        }

        const chart = new Chart(canvasChartRepsPerMinute, {
            type: "line",
            data: chartData,
            options: {
                ...options,
                plugins: {
                    ...options.plugins,
                    title: {
                        display: true,
                        text: chartTitle,
                        font: {
                            family: 'Montserrat',
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#374151',
                        padding: 20
                    },
                    tooltip: {
                        ...options.plugins.tooltip,
                        callbacks: (this.repsPerMinuteViewType === 'weekly' || this.repsPerMinuteViewType === 'monthly') ? {
                            afterBody: function(context) {
                                let totalRpm = 0;
                                let count = 0;
                                context.forEach(item => {
                                    if (item.parsed.y > 0) {
                                        totalRpm += item.parsed.y;
                                        count++;
                                    }
                                });
                                const avgRpm = count > 0 ? (totalRpm / count).toFixed(2) : 0;
                                const period = this.repsPerMinuteViewType === 'weekly' ? 'week' : 'month';
                                return `Average for ${period}: ${avgRpm} reps/min`;
                            }.bind(this)
                        } : undefined
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
                },
                scales: {
                    ...options.scales,
                    x: {
                        ...options.scales.x,
                        ticks: {
                            ...options.scales.x.ticks,
                            callback: this.getRepsPerMinuteXAxisTickCallback()
                        }
                    },
                    y: {
                        ...options.scales.y,
                        title: {
                            display: true,
                            text: 'Reps per Minute',
                            font: {
                                family: 'Montserrat',
                                size: 13,
                                weight: 'bold'
                            },
                            color: '#64748b'
                        }
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
                                const monthName = monthNames[parseInt(month, 10) - 1];

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
                                return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
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
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            color: '#10B981',
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
            // Get exercise types from ExerciseTypeManager if available, otherwise fall back to data-based types
            let exerciseTypes;
            if (window.workoutApp && window.workoutApp.exerciseTypeManager) {
                exerciseTypes = window.workoutApp.exerciseTypeManager.getExerciseTypes();
            } else {
                exerciseTypes = this.dataManager.getUniqueExerciseTypes();
            }
            
            const uniqueDates = this.getUniqueDates();

            // Update total reps chart
            const totalRepsChart = this.charts.get('totalReps');
            if (totalRepsChart) {
                let chartData;
                if (this.totalRepsViewType === 'weekly') {
                    chartData = this.preparePeriodRepsData(exerciseTypes, 'weekly');
                } else if (this.totalRepsViewType === 'monthly') {
                    chartData = this.preparePeriodRepsData(exerciseTypes, 'monthly');
                } else if (this.totalRepsViewType === 'yearly') {
                    chartData = this.preparePeriodRepsData(exerciseTypes, 'yearly');
                } else {
                    chartData = {
                        labels: uniqueDates,
                        datasets: this.createChartDatasets(exerciseTypes, uniqueDates, false)
                    };
                }
                totalRepsChart.data.labels = chartData.labels;
                totalRepsChart.data.datasets = chartData.datasets;
                totalRepsChart.update();
            }

            // Update reps per minute chart
            const repsPerMinuteChart = this.charts.get('repsPerMinute');
            if (repsPerMinuteChart) {
                let rpmChartData;
                if (this.repsPerMinuteViewType === 'weekly') {
                    rpmChartData = this.preparePeriodRepsPerMinuteData(exerciseTypes, 'weekly');
                } else if (this.repsPerMinuteViewType === 'monthly') {
                    rpmChartData = this.preparePeriodRepsPerMinuteData(exerciseTypes, 'monthly');
                } else {
                    rpmChartData = {
                        labels: uniqueDates,
                        datasets: this.createChartDatasets(exerciseTypes, uniqueDates, true)
                    };
                }
                repsPerMinuteChart.data.labels = rpmChartData.labels;
                repsPerMinuteChart.data.datasets = rpmChartData.datasets;
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
        const datasets = [];
        const workouts = this.dataManager.getAllWorkouts();

        exerciseTypes.forEach((exerciseType, index) => {
            const exerciseData = workouts.filter(workout => workout.exercise === exerciseType);

            // Create mapping of dates to aggregated values for this exercise
            const dateToValue = {};
            exerciseData.forEach(workout => {
                const formattedDate = this.createShortFormattedDate(new Date(workout.date));

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
                allMonths.push(this.createMonthKey(year, month));
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
                    const monthKey = this.createMonthKey(d.year, d.month);
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
     * Get X-axis tick callback based on current view type
     */
    getXAxisTickCallback() {
        if (this.totalRepsViewType === 'weekly') {
            return function(val, index) {
                const label = this.getLabelForValue(val);
                if (!label) return '';
                
                // Format week labels to be more readable
                const [year, week] = label.split('-W');
                return `W${week}\n${year}`;
            };
        } else if (this.totalRepsViewType === 'monthly') {
            return function(val, index) {
                const label = this.getLabelForValue(val);
                if (!label) return '';
                
                // Format month labels to be more readable
                const [year, month] = label.split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthName = monthNames[parseInt(month, 10) - 1];
                return `${monthName}\n${year}`;
            };
        } else if (this.totalRepsViewType === 'daily') {
            return function(val) {
                const label = this.getLabelForValue(val);
                if (!label) return '';

                const parts = label.split('-');
                if (parts.length !== 3) return label;

                const [year, month, day] = parts;
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthName = monthNames[parseInt(month, 10) - 1];
                return `${monthName} ${parseInt(day, 10)}`;
            };
        }
        return undefined; // Use Chart.js defaults for other views
    }

    /**
     * Get X-axis tick callback based on current view type for reps per minute chart
     */
    getRepsPerMinuteXAxisTickCallback() {
        if (this.repsPerMinuteViewType === 'weekly') {
            return function(val, index) {
                const label = this.getLabelForValue(val);
                if (!label) return '';
                
                // Format week labels to be more readable
                const [year, week] = label.split('-W');
                return `W${week}\n${year}`;
            };
        } else if (this.repsPerMinuteViewType === 'monthly') {
            return function(val, index) {
                const label = this.getLabelForValue(val);
                if (!label) return '';
                
                // Format month labels to be more readable
                const [year, month] = label.split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthName = monthNames[parseInt(month, 10) - 1];
                return `${monthName}\n${year}`;
            };
        } else if (this.repsPerMinuteViewType === 'daily') {
            return function(val) {
                const label = this.getLabelForValue(val);
                if (!label) return '';

                const parts = label.split('-');
                if (parts.length !== 3) return label;

                const [year, month, day] = parts;
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthName = monthNames[parseInt(month, 10) - 1];
                return `${monthName} ${parseInt(day, 10)}`;
            };
        }
        return undefined; // Use Chart.js defaults for other views
    }



    /**
     * Generic method to prepare reps data for different time periods
     * @param {Array} exerciseTypes - Array of exercise types
     * @param {string} period - Time period: 'daily', 'weekly', 'monthly', or 'yearly'
     * @returns {Object} Chart data with labels and datasets
     */
    preparePeriodRepsData(exerciseTypes, period) {
        const workouts = this.dataManager.getAllWorkouts();
        const periodData = {};

        if (workouts.length === 0) {
            return { labels: [], datasets: [] };
        }

        // Group workouts by period and exercise type
        workouts.forEach(workout => {
            const date = new Date(workout.date);
            const periodKey = this.getPeriodKey(date, period);

            if (!periodData[periodKey]) {
                periodData[periodKey] = {};
            }

            if (!periodData[periodKey][workout.exercise]) {
                periodData[periodKey][workout.exercise] = 0;
            }

            periodData[periodKey][workout.exercise] += workout.totalReps;
        });

        // Generate all periods in the range
        const allPeriods = this.generatePeriodRange(workouts, period);

        // Create datasets for each exercise type
        const datasets = exerciseTypes.map((exerciseType, index) => {
            const data = allPeriods.map(period => periodData[period] && periodData[period][exerciseType] || 0);
            const baseColor = this.getExerciseBaseColor(exerciseType, index);
            const validColor = this.convertToValidColor(baseColor);

            // Use consistent styling for weekly/monthly, special handling for yearly
            const datasetConfig = {
                label: exerciseType,
                data: data,
                borderWidth: 1,
                stack: period === 'yearly' ? 'year' : 'stack1'
            };

            if (period === 'yearly') {
                datasetConfig.backgroundColor = this.generateColorScale(exerciseTypes.length)[index];
            } else {
                datasetConfig.backgroundColor = this.adjustColorOpacity(validColor, 0.8);
                datasetConfig.borderColor = validColor;
                datasetConfig.borderRadius = 2;
                datasetConfig.borderSkipped = false;
            }

            return datasetConfig;
        });

        return {
            labels: allPeriods,
            datasets: datasets
        };
    }

    /**
     * Generate a period key for a given date and period type
     * @param {Date} date - The date to generate a key for
     * @param {string} period - The period type: 'daily', 'weekly', 'monthly', or 'yearly'
     * @returns {string} The period key
     */
    getPeriodKey(date, period) {
        const year = date.getFullYear();
        
        switch (period) {
            case 'daily':
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                return `${year}-${month}-${day}`;
            case 'weekly':
                const week = this.getWeekNumber(date);
                return `${year}-W${week.toString().padStart(2, '0')}`;
            case 'monthly':
                return this.createMonthKey(year, date.getMonth() + 1);
            case 'yearly':
                return year.toString();
            default:
                throw new Error(`Unsupported period type: ${period}. Supported types are: daily, weekly, monthly, yearly`);
        }
    }

    /**
     * Generate a range of periods from first to last workout
     * @param {Array} workouts - Array of workout data
     * @param {string} period - The period type: 'daily', 'weekly', 'monthly', or 'yearly'
     * @returns {Array} Array of period keys
     */
    generatePeriodRange(workouts, period) {
        const workoutDates = workouts.map(w => new Date(w.date)).sort((a, b) => a - b);
        const firstDate = workoutDates[0];
        const lastDate = workoutDates[workoutDates.length - 1];
        const periods = [];

        switch (period) {
            case 'daily':
                const currentDay = new Date(firstDate);
                while (currentDay <= lastDate) {
                    periods.push(this.getPeriodKey(currentDay, period));
                    currentDay.setDate(currentDay.getDate() + 1);
                }
                break;
            case 'weekly':
                // Start from the Monday of the first workout's week
                const firstMonday = new Date(firstDate);
                firstMonday.setDate(firstDate.getDate() - (firstDate.getDay() || 7) + 1);
                const currentWeekStart = new Date(firstMonday);
                while (currentWeekStart <= lastDate) {
                    periods.push(this.getPeriodKey(currentWeekStart, period));
                    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
                }
                break;
            case 'monthly':
                const currentMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
                const endDate = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
                while (currentMonth <= endDate) {
                    periods.push(this.getPeriodKey(currentMonth, period));
                    currentMonth.setMonth(currentMonth.getMonth() + 1);
                }
                break;
            case 'yearly':
                const firstYear = firstDate.getFullYear();
                const lastYear = lastDate.getFullYear();
                for (let year = firstYear; year <= lastYear; year++) {
                    periods.push(year.toString());
                }
                break;
            default:
                throw new Error(`Unsupported period type: ${period}`);
        }

        return periods;
    }





    /**
     * Generic method to prepare reps per minute data for different time periods
     * @param {Array} exerciseTypes - Array of exercise types
     * @param {string} period - Time period: 'daily', 'weekly', or 'monthly'
     * @returns {Object} Chart data with labels and datasets
     */
    preparePeriodRepsPerMinuteData(exerciseTypes, period) {
        const workouts = this.dataManager.getAllWorkouts();
        const periodData = {};

        if (workouts.length === 0) {
            return { labels: [], datasets: [] };
        }

        // Group workouts by period and exercise type, calculating average reps per minute
        workouts.forEach(workout => {
            const date = new Date(workout.date);
            const periodKey = this.getPeriodKey(date, period);

            if (!periodData[periodKey]) {
                periodData[periodKey] = {};
            }

            if (!periodData[periodKey][workout.exercise]) {
                periodData[periodKey][workout.exercise] = {
                    totalReps: 0,
                    totalTime: 0,
                    workoutCount: 0
                };
            }

            periodData[periodKey][workout.exercise].totalReps += workout.totalReps;
            periodData[periodKey][workout.exercise].totalTime += workout.totalTime || 1;
            periodData[periodKey][workout.exercise].workoutCount += 1;
        });

        // Generate all periods in the range
        const allPeriods = this.generatePeriodRange(workouts, period);

        // Create datasets for each exercise type
        const datasets = exerciseTypes.map((exerciseType, index) => {
            const data = allPeriods.map(period => {
                if (periodData[period] && periodData[period][exerciseType]) {
                    const periodStats = periodData[period][exerciseType];
                    return periodStats.totalTime > 0 ? periodStats.totalReps / periodStats.totalTime : 0;
                }
                return 0;
            });
            const baseColor = this.getExerciseBaseColor(exerciseType, index);
            const validColor = this.convertToValidColor(baseColor);

            return {
                label: exerciseType,
                data: data,
                borderColor: validColor,
                backgroundColor: this.adjustColorOpacity(validColor, 0.1),
                borderWidth: 3,
                tension: 0.2,
                pointBackgroundColor: '#fff',
                pointBorderColor: validColor,
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: validColor,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                fill: true
            };
        });

        return {
            labels: allPeriods,
            datasets: datasets
        };
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
            let exerciseTypes;
            if (window.workoutApp && window.workoutApp.exerciseTypeManager) {
                exerciseTypes = window.workoutApp.exerciseTypeManager.getExerciseTypes();
            } else {
                exerciseTypes = this.dataManager.getUniqueExerciseTypes();
            }
            
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
            .slice(-53); // Last 53 weeks

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
     * Get unique dates from all workouts - includes all days between first and last workout
     */
    getUniqueDates() {
        const workouts = this.dataManager.getAllWorkouts();
        
        if (workouts.length === 0) {
            return [];
        }

        // For daily view, show all days between first and last workout to maintain consistency
        // with weekly/monthly views that show complete time frames
        return this.getAllDatesBetweenWorkouts();
    }

    /**
     * Get all dates between first and last workout (for comprehensive view)
     */
    getAllDatesBetweenWorkouts() {
        const workouts = this.dataManager.getAllWorkouts();
        
        if (workouts.length === 0) {
            return [];
        }

        // Find first and last workout dates
        const workoutDates = workouts.map(w => new Date(w.date)).sort((a, b) => a - b);
        const firstDate = workoutDates[0];
        const lastDate = workoutDates[workoutDates.length - 1];

        // For daily view, limit to last 90 days to keep it manageable
        const today = new Date();
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(today.getDate() - 90);
        
        // Use the later of either first workout date or 90 days ago
        const startDate = new Date(Math.max(firstDate.getTime(), ninetyDaysAgo.getTime()));
        const endDate = new Date(Math.min(lastDate.getTime(), today.getTime()));

        // Generate all dates between start and end
        const allDates = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            allDates.push(this.createShortFormattedDate(new Date(currentDate)));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return allDates;
    }

    /**
     * Create short formatted date
     */
    createShortFormattedDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Create a consistent YYYY-MM key for monthly aggregations
     */
    createMonthKey(year, month) {
        const monthNumber = parseInt(month, 10);
        const safeMonth = isNaN(monthNumber) ? 1 : Math.min(Math.max(monthNumber, 1), 12);
        return `${year}-${safeMonth.toString().padStart(2, '0')}`;
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
            const key = this.createMonthKey(year, month);

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
