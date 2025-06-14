/**
 * Calculates the week number of the year for the given date.
 * 
 * The week number is calculated based on the first day of the year, considering
 * Sunday as the last day of the week (6) if the first day of the year is a
 * Sunday (0).
 * 
 * @param {Date} date - The date for which to calculate the week number.
 * @returns {number} The week number of the year for the given date, starting from 0.
 */
function weeksFromYearStart(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);

    // Get the day of the week for the first day of the year. If it's Sunday (0),
    // we consider it the last day of the week (6)
    const firstDayOfYearWeekIndex = firstDayOfYear.getDay() === 0 ? 6 : firstDayOfYear.getDay() - 1;

    const firstWeekStart = new Date(firstDayOfYear);
    firstWeekStart.setDate(firstDayOfYear.getDate() - firstDayOfYearWeekIndex);
    const diff = date - firstWeekStart;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay) + 1;
    const weekNumber = Math.ceil(dayOfYear / 7);
    return weekNumber - 1;
}

/**
 * Generates an array of HSLA color strings with the specified number of colors.
 * The colors are evenly distributed around the color wheel, with a fixed
 * saturation and lightness, and an alpha value of 0.7.
 *
 * @param {number} numColors - The number of colors to generate.
 * @returns {string[]} An array of HSLA color strings.
 */
function generateColorScale(numColors) {
    const colors = [];
    for (let i = 0; i < numColors; i++) {
        const hue = (i * 360 / numColors) % 360;
        colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
    }
    return colors;
}

function getGreenShadeDiscrete(pushUps) {
    // Return green, but it make it proportional to the push-up count, with a
    // maximum of 120. The hihger the push-up count, the darker the shade of
    // green. Using github's color scale.
    var maxPushUps = 160;
    var color = '#ebedf0';
    if (pushUps > 0) {
        var colors = ['#ffffff', '#d8f0b1', '#96e08e', '#2dbf55', '#1e763e', '#0e6630', '#08401a']
        var shade = Math.round((pushUps / maxPushUps) * (color.length + 1));
    }
    return colors[shade] || color;
}

/**
 * Gets the color for a specific exercise with intensity based on reps
 * 
 * @param {string} exercise - The exercise name
 * @param {number} reps - Number of reps for this exercise
 * @returns {string} The color for the exercise
 */
function getColorForExercise(exercise, reps) {
    // Exercise color mapping
    const exerciseColors = {
        'Push-ups': { hue: 130, name: 'Push-ups' },      // Green
        'Pull-ups': { hue: 210, name: 'Pull-ups' },      // Blue
        'Squats': { hue: 270, name: 'Squats' },          // Purple
        'Sit-ups': { hue: 30, name: 'Sit-ups' },         // Orange
        'Lunges': { hue: 300, name: 'Lunges' },          // Magenta
        'Dips': { hue: 180, name: 'Dips' },              // Cyan
        'Planks': { hue: 60, name: 'Planks' }            // Yellow
    };

    // Get the color for the exercise
    const exerciseColor = exerciseColors[exercise] || { hue: 130, name: 'Unknown' };

    // Calculate intensity based on reps
    const maxReps = 160;
    const minLightness = 20;
    const maxLightness = 70;

    const lightness = maxLightness - (reps / maxReps) * (maxLightness - minLightness);

    return `hsl(${exerciseColor.hue}, 70%, ${Math.max(minLightness, Math.min(maxLightness, lightness))}%)`;
}

/**
 * Gets the color for a cell based on the exercise types and their values.
 * If multiple exercises exist for a day, it will choose the dominant exercise.
 * 
 * @param {Object} cellData - The cell data containing exercise information
 * @returns {string} The color for the cell
 */
function getExerciseColor(cellData) {
    // If no exercises or total value is 0, return default color
    if (!cellData.exercises || cellData.value === 0) {
        return '#ebedf0';
    }

    // Get the exercise with the highest reps for this day
    const exercises = cellData.exercises;
    const dominantExercise = Object.keys(exercises).reduce((a, b) =>
        exercises[a] > exercises[b] ? a : b
    );

    const repsForExercise = exercises[dominantExercise];
    return getColorForExercise(dominantExercise, repsForExercise);
}

/**
 * Gets the dominant exercise for a cell (used for tooltip display)
 * 
 * @param {Object} cellData - The cell data containing exercise information
 * @returns {string} The name of the dominant exercise
 */
function getDominantExercise(cellData) {
    if (!cellData.exercises || Object.keys(cellData.exercises).length === 0) {
        return 'No exercises';
    }

    const exercises = cellData.exercises;
    return Object.keys(exercises).reduce((a, b) =>
        exercises[a] > exercises[b] ? a : b
    );
}

/**
 * Generates an activity chart on the provided canvas element based on the given data.
 * The chart displays a grid of cells, where each cell represents a day and is colored
 * based on the corresponding activity value.
 *
 * @param {Object[]} data - An array of objects, where each object represents an activity data point
 *                         with a `date` and `value` property.
 * @param {HTMLCanvasElement} canvas - The canvas element to render the activity chart on.
 */
function createActivityChart(data, canvas) {
    // Get the range of years
    const minYear = new Date(data[0].date).getFullYear();
    const maxYear = new Date(data[data.length - 1].date).getFullYear();
    const numYears = maxYear - minYear + 1;

    var ctx = canvas.getContext('2d');

    const cellSize = 10;
    const padding = 2;
    const yearPadding = 10;
    const yearTextSize = 25;
    const monthTextSize = 15;
    const weeksInYear = 53;
    const daysInWeek = 7;
    const yearLabelHeight = yearTextSize + monthTextSize;
    const yearWidth = weeksInYear * cellSize + padding * (weeksInYear + 1);
    const yearHeight = daysInWeek * cellSize + padding * (daysInWeek + 1) + yearLabelHeight;

    canvas.width = yearWidth;
    canvas.height = numYears * yearHeight + yearPadding * 4;

    for (var absYear = minYear; absYear <= maxYear; absYear++) {
        const relativeYear = maxYear - absYear;
        const yYearStart = relativeYear * yearHeight + (relativeYear + 1) * yearPadding + yearLabelHeight;
        printYearLabels(yYearStart);
        drawGrid(yYearStart);
    }

    // Create a map to store cell data
    const cellMap = new Map();

    // Create a tooltip element
    let tooltip = createTooltip();

    for (let i = 0; i < data.length; i++) {
        drawActivityCell(data[i]);
    }

    initTooltipEventHandlers();

    canvas.addEventListener('mouseout', function () {
        tooltip.style.display = 'none';
    }); function initTooltipEventHandlers() {
        canvas.addEventListener('mousemove', function (e) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Check each cell in our map
            let found = false;
            cellMap.forEach((cell) => {
                if (mouseX >= cell.x && mouseX <= cell.x + cell.width &&
                    mouseY >= cell.y && mouseY <= cell.y + cell.height) {
                    tooltip.style.display = 'block';
                    tooltip.style.left = (e.pageX + 10) + 'px';
                    tooltip.style.top = (e.pageY + 10) + 'px';                    // Create detailed tooltip content
                    let tooltipContent = `Date: ${cell.date.toLocaleDateString()}<br>`;
                    tooltipContent += `Total Reps: ${cell.cellValue}<br>`;

                    if (cell.exercises && Object.keys(cell.exercises).length > 0) {
                        const exerciseCount = Object.keys(cell.exercises).length;

                        if (exerciseCount === 2) {
                            tooltipContent += `<strong>Split Square - Two Exercises:</strong><br>`;
                        } else if (exerciseCount === 1) {
                            tooltipContent += `<strong>Single Exercise:</strong><br>`;
                        } else {
                            tooltipContent += `Dominant: ${cell.dominantExercise}<br>`;
                        }

                        tooltipContent += `Exercises:<br>`;
                        Object.entries(cell.exercises).forEach(([exercise, reps]) => {
                            tooltipContent += `&nbsp;&nbsp;${exercise}: ${reps}<br>`;
                        });
                    }

                    tooltip.innerHTML = tooltipContent;
                    found = true;
                }
            });

            if (!found) {
                tooltip.style.display = 'none';
            }
        });
    } function drawActivityCell(cellData) {
        const date = new Date(cellData.date);
        const relativeYear = maxYear - date.getFullYear();
        let dayOfWeekIndex = computeDayOfWeekIndex(date);
        const week = weeksFromYearStart(date);
        const x = week * cellSize + padding * (week + 1);
        const y = dayOfWeekIndex * cellSize + padding * (dayOfWeekIndex + 1) + relativeYear * yearHeight + (relativeYear + 1) * yearPadding + yearLabelHeight;

        // Store cell data with its position and dimensions
        cellMap.set(`${x},${y}`, {
            x: x,
            y: y,
            width: cellSize,
            height: cellSize,
            date: date,
            cellValue: cellData.value,
            exercises: cellData.exercises || {},
            dominantExercise: getDominantExercise(cellData)
        });

        // Check if there are exactly two exercises for this day
        const exercises = cellData.exercises || {};
        const exerciseNames = Object.keys(exercises);

        if (exerciseNames.length === 2) {
            // Split the square diagonally for two exercises
            drawSplitSquare(x, y, cellSize, exercises, exerciseNames);
        } else if (exerciseNames.length > 0) {
            // Single color for one exercise or dominant exercise for more than two
            var color = getExerciseColor(cellData);
            ctx.fillStyle = color;
            ctx.fillRect(x, y, cellSize, cellSize);
        } else {
            // No exercises - default color
            ctx.fillStyle = '#ebedf0';
            ctx.fillRect(x, y, cellSize, cellSize);
        }
    }

    /**
     * Draws a split square with two colors representing two exercises
     * 
     * @param {number} x - X coordinate of the square
     * @param {number} y - Y coordinate of the square
     * @param {number} size - Size of the square
     * @param {Object} exercises - Object containing exercise names and rep counts
     * @param {Array} exerciseNames - Array of exercise names
     */
    function drawSplitSquare(x, y, size, exercises, exerciseNames) {
        const exercise1 = exerciseNames[0];
        const exercise2 = exerciseNames[1];
        const reps1 = exercises[exercise1];
        const reps2 = exercises[exercise2];

        const color1 = getColorForExercise(exercise1, reps1);
        const color2 = getColorForExercise(exercise2, reps2);

        // Draw the split square using triangles
        ctx.beginPath();

        // First triangle (top-left to bottom-right diagonal)
        ctx.fillStyle = color1;
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x + size, y + size);
        ctx.closePath();
        ctx.fill();

        // Second triangle (bottom-left to top-right diagonal)
        ctx.fillStyle = color2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x + size, y + size);
        ctx.closePath();
        ctx.fill();
    }

    function computeDayOfWeekIndex(date) {
        let dayOfWeekIndex = date.getDay();
        if (dayOfWeekIndex === 0) {
            return 6;
        } else {
            return dayOfWeekIndex - 1;
        }
    }

    function createTooltip() {
        let tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.display = 'none';
        tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px';
        tooltip.style.borderRadius = '3px';
        tooltip.style.fontSize = '12px';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    function printYearLabels(yYearStart) {
        ctx.fillStyle = '#888';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(absYear, padding, yYearStart - monthTextSize);
    }

    function drawGrid(yYearStart) {
        // Define an array of month names each two months
        const monthNames = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov']

        for (var i = 0; i < 53; i++) {
            // Draw the month names
            if (i % 9 === 0) {
                const month = Math.floor(i / 9);
                ctx.fillStyle = '#888';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText(monthNames[month], i * cellSize + padding * (i + 1), yYearStart);
            }

            ctx.fillStyle = '#ddd';
            for (var j = 0; j < 7; j++) {
                const x = i * cellSize + padding * (i + 1);
                const y = j * cellSize + padding * (j + 1) + yYearStart;
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
    }
}
