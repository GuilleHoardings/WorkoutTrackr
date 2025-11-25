// ChartDataUtils - pure data aggregation and date/period helpers used by ChartManager

function createShortFormattedDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function createMonthKey(year, month) {
    const monthNumber = parseInt(month, 10);
    const safeMonth = isNaN(monthNumber) ? 1 : Math.min(Math.max(monthNumber, 1), 12);
    return `${year}-${safeMonth.toString().padStart(2, '0')}`;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getPeriodKey(date, period) {
    const year = date.getFullYear();

    switch (period) {
        case 'daily': {
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        case 'weekly': {
            const week = getWeekNumber(date);
            return `${year}-W${week.toString().padStart(2, '0')}`;
        }
        case 'monthly':
            return createMonthKey(year, date.getMonth() + 1);
        case 'yearly':
            return year.toString();
        default:
            throw new Error(`Unsupported period type: ${period}. Supported types are: daily, weekly, monthly, yearly`);
    }
}

function generatePeriodRange(workouts, period) {
    const workoutDates = workouts.map(w => new Date(w.date)).sort((a, b) => a - b);
    const firstDate = workoutDates[0];
    const lastDate = workoutDates[workoutDates.length - 1];
    const periods = [];

    switch (period) {
        case 'daily': {
            const currentDay = new Date(firstDate);
            while (currentDay <= lastDate) {
                periods.push(getPeriodKey(currentDay, period));
                currentDay.setDate(currentDay.getDate() + 1);
            }
            break;
        }
        case 'weekly': {
            const firstMonday = new Date(firstDate);
            firstMonday.setDate(firstDate.getDate() - (firstDate.getDay() || 7) + 1);
            const currentWeekStart = new Date(firstMonday);
            while (currentWeekStart <= lastDate) {
                periods.push(getPeriodKey(currentWeekStart, period));
                currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            }
            break;
        }
        case 'monthly': {
            const currentMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
            const endDate = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
            while (currentMonth <= endDate) {
                periods.push(getPeriodKey(currentMonth, period));
                currentMonth.setMonth(currentMonth.getMonth() + 1);
            }
            break;
        }
        case 'yearly': {
            const firstYear = firstDate.getFullYear();
            const lastYear = lastDate.getFullYear();
            for (let year = firstYear; year <= lastYear; year++) {
                periods.push(year.toString());
            }
            break;
        }
        default:
            throw new Error(`Unsupported period type: ${period}`);
    }

    return periods;
}

function aggregateDataByMonth(workouts) {
    const monthlyData = {};

    workouts.forEach(workout => {
        const date = new Date(workout.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = createMonthKey(year, month);

        if (!monthlyData[key]) {
            monthlyData[key] = {
                year: year,
                month: month,
                reps: 0
            };
        }

        monthlyData[key].reps += workout.totalReps;
    });

    return Object.values(monthlyData).sort((a, b) => {
        return a.year - b.year || a.month - b.month;
    });
}

function getAllDatesBetweenWorkouts(workouts, maxDays = 90) {
    if (workouts.length === 0) {
        return [];
    }

    const workoutDates = workouts.map(w => new Date(w.date)).sort((a, b) => a - b);
    const firstDate = workoutDates[0];
    const lastDate = workoutDates[workoutDates.length - 1];

    const today = new Date();
    const maxDaysAgo = new Date(today);
    maxDaysAgo.setDate(today.getDate() - maxDays);

    const startDate = new Date(Math.max(firstDate.getTime(), maxDaysAgo.getTime()));
    const endDate = new Date(Math.min(lastDate.getTime(), today.getTime()));

    const allDates = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        allDates.push(createShortFormattedDate(new Date(currentDate)));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return allDates;
}

function prepareWeeklyChartData(workouts) {
    const weeklyData = {};

    workouts.forEach(workout => {
        const date = new Date(workout.date);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
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

    const sortedWeeks = Object.values(weeklyData)
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-53);

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

function preparePeriodRepsData(workouts, exerciseTypes, period, getExerciseBaseColor, convertToValidColor, adjustColorOpacity, generateColorScaleFn) {
    const periodData = {};

    if (workouts.length === 0) {
        return { labels: [], datasets: [] };
    }

    workouts.forEach(workout => {
        const date = new Date(workout.date);
        const periodKey = getPeriodKey(date, period);

        if (!periodData[periodKey]) {
            periodData[periodKey] = {};
        }

        if (!periodData[periodKey][workout.exercise]) {
            periodData[periodKey][workout.exercise] = 0;
        }

        periodData[periodKey][workout.exercise] += workout.totalReps;
    });

    const allPeriods = generatePeriodRange(workouts, period);

    const yearlyColors = period === 'yearly'
        ? (generateColorScaleFn || (() => []))(exerciseTypes.length)
        : null;

    const datasets = exerciseTypes.map((exerciseType, index) => {
        const data = allPeriods.map(periodKey =>
            (periodData[periodKey] && periodData[periodKey][exerciseType]) || 0
        );
        const baseColor = getExerciseBaseColor(exerciseType, index);
        const validColor = convertToValidColor(baseColor);

        const datasetConfig = {
            label: exerciseType,
            data: data,
            borderWidth: 1,
            stack: period === 'yearly' ? 'year' : 'stack1'
        };

        if (period === 'yearly' && yearlyColors && yearlyColors.length) {
            datasetConfig.backgroundColor = yearlyColors[index % yearlyColors.length];
        } else {
            datasetConfig.backgroundColor = adjustColorOpacity(validColor, 0.8);
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

function preparePeriodRepsPerMinuteData(workouts, exerciseTypes, period, getExerciseBaseColor, convertToValidColor, adjustColorOpacity) {
    const periodData = {};

    if (workouts.length === 0) {
        return { labels: [], datasets: [] };
    }

    workouts.forEach(workout => {
        const date = new Date(workout.date);
        const periodKey = getPeriodKey(date, period);

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

    const allPeriods = generatePeriodRange(workouts, period);

    const datasets = exerciseTypes.map((exerciseType, index) => {
        const data = allPeriods.map(periodKey => {
            const entry = periodData[periodKey] && periodData[periodKey][exerciseType];
            if (entry && entry.totalTime > 0) {
                return entry.totalReps / entry.totalTime;
            }
            return 0;
        });

        const baseColor = getExerciseBaseColor(exerciseType, index);
        const validColor = convertToValidColor(baseColor);

        return {
            label: exerciseType,
            data: data,
            borderColor: validColor,
            backgroundColor: adjustColorOpacity(validColor, 0.1),
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createShortFormattedDate,
        createMonthKey,
        getWeekNumber,
        getPeriodKey,
        generatePeriodRange,
        aggregateDataByMonth,
        getAllDatesBetweenWorkouts,
        prepareWeeklyChartData,
        preparePeriodRepsData,
        preparePeriodRepsPerMinuteData
    };
} else {
    window.ChartDataUtils = {
        createShortFormattedDate,
        createMonthKey,
        getWeekNumber,
        getPeriodKey,
        generatePeriodRange,
        aggregateDataByMonth,
        getAllDatesBetweenWorkouts,
        prepareWeeklyChartData,
        preparePeriodRepsData,
        preparePeriodRepsPerMinuteData
    };
}
