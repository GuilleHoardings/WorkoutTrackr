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

/**
 * Gets the color for a specific exercise with intensity based on reps
 * 
 * @param {string} exercise - The exercise name
 * @param {number} reps - Number of reps for this exercise
 * @returns {string} The color for the exercise
 */
function getColorForExercise(exercise, reps) {
    // Try to get color from exercise type manager if available
    let exerciseColor = { hue: 130, name: 'Unknown' };
    
    if (window.workoutApp && window.workoutApp.exerciseTypeManager) {
        exerciseColor = window.workoutApp.exerciseTypeManager.getExerciseColor(exercise);
    } else {
        // Fallback to hardcoded exercise color mapping
        const exerciseColors = {
            'Push-ups': { hue: 130, name: 'Push-ups' },      // Green
            'Pull-ups': { hue: 210, name: 'Pull-ups' },      // Blue
            'Squats': { hue: 270, name: 'Squats' },          // Purple
            'Sit-ups': { hue: 30, name: 'Sit-ups' },         // Orange
            'Lunges': { hue: 300, name: 'Lunges' },          // Magenta
            'Dips': { hue: 180, name: 'Dips' },              // Cyan
            'Planks': { hue: 60, name: 'Planks' },            // Yellow
            'Back': { hue: 90, name: 'Back' }                
        };
        exerciseColor = exerciseColors[exercise] || { hue: 130, name: 'Unknown' };
    }

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
 * Clean up existing activity chart elements and event listeners
 * @param {HTMLCanvasElement} canvas - The canvas element to clean up
 */
function cleanupActivityChart(canvas) {
    // Remove existing tooltips
    const existingTooltips = document.querySelectorAll('[data-activity-tooltip]');
    existingTooltips.forEach(tooltip => tooltip.remove());
    
    // Clone the canvas to remove all event listeners
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    
    // Update the reference to point to the new canvas
    const originalCanvas = canvas;
    canvas = newCanvas;
    
    return newCanvas;
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
    // Check if data is available
    if (!data || data.length === 0) {
        console.warn("No data available for activity chart");
        return;
    }
    
    // Clean up existing tooltips and event listeners
    canvas = cleanupActivityChart(canvas);
    
    // Get the range of years by examining all data points
    const years = data.map(d => new Date(d.date).getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const numYears = maxYear - minYear + 1;
    var ctx = canvas.getContext('2d');

    // Clean styling constants
    const cellSize = 11;
    const padding = 2;
    const yearPadding = 20;
    const yearTextSize = 16;
    const monthTextSize = 16;
    const weeksInYear = 53;
    const daysInWeek = 7;
    const yearLabelHeight = yearTextSize + monthTextSize + 10;
    const yearWidth = weeksInYear * cellSize + padding * (weeksInYear + 1);
    const yearHeight = daysInWeek * cellSize + padding * (daysInWeek + 1) + yearLabelHeight;    // Calculate required canvas dimensions
    const requiredWidth = yearWidth + 40; // Extra padding

    // Fix: Calculate the exact space needed for all years
    // For the last year (oldest), yYearStart = (numYears-1) * yearHeight + numYears * yearPadding + yearLabelHeight
    // The grid extends from yYearStart to yYearStart + (7 * (cellSize + padding))
    // We also need space above yYearStart for the year label (yearTextSize + monthTextSize + 10)
    const lastYearStart = (numYears - 1) * yearHeight + numYears * yearPadding + yearLabelHeight;
    const gridHeight = daysInWeek * (cellSize + padding) + padding; // Height of the grid itself
    const requiredHeight = lastYearStart + gridHeight + 40; // Add extra bottom padding

    // Set high DPI scaling for crisp rendering
    const dpr = window.devicePixelRatio || 1;

    // Set canvas internal resolution for crisp rendering
    canvas.width = requiredWidth * dpr;
    canvas.height = requiredHeight * dpr;    // Set canvas display size
    canvas.style.width = requiredWidth + 'px';
    canvas.style.height = requiredHeight + 'px';

    // Scale the drawing context for DPI
    ctx.scale(dpr, dpr); for (var absYear = minYear; absYear <= maxYear; absYear++) {
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
        const x = week * (cellSize + padding) + padding;
        const y = dayOfWeekIndex * (cellSize + padding) + padding + relativeYear * yearHeight + (relativeYear + 1) * yearPadding + yearLabelHeight;

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
        const exerciseNames = Object.keys(exercises); if (exerciseNames.length === 2) {
            // Split the square diagonally for two exercises
            drawSplitSquare(x, y, cellSize, exercises, exerciseNames);
        } else if (exerciseNames.length > 0) {
            // Single color for one exercise or dominant exercise for more than two
            var color = getExerciseColor(cellData);

            // Draw main cell - simple and clean
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
     */    function drawSplitSquare(x, y, size, exercises, exerciseNames) {
        const exercise1 = exerciseNames[0];
        const exercise2 = exerciseNames[1];
        const reps1 = exercises[exercise1];
        const reps2 = exercises[exercise2];

        const color1 = getColorForExercise(exercise1, reps1);
        const color2 = getColorForExercise(exercise2, reps2);

        // Draw the split square using triangles - clean and simple
        ctx.save();

        // First triangle (top-left to bottom-right diagonal)
        ctx.beginPath();
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

        ctx.restore();
    }

    function computeDayOfWeekIndex(date) {
        let dayOfWeekIndex = date.getDay();
        if (dayOfWeekIndex === 0) {
            return 6;
        } else {
            return dayOfWeekIndex - 1;
        }
    } function createTooltip() {
        let tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.display = 'none';
        tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.fontFamily = 'system-ui, sans-serif';
        tooltip.style.lineHeight = '1.4';
        tooltip.style.zIndex = '1000';
        tooltip.style.pointerEvents = 'none';
        
        // Add data attribute for identification and cleanup
        tooltip.setAttribute('data-activity-tooltip', 'true');

        document.body.appendChild(tooltip);
        return tooltip;
    } function printYearLabels(yYearStart) {
        ctx.fillStyle = '#666';
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'left';
        // Align year label horizontally with the leftmost squares and month labels
        ctx.fillText(absYear, padding, yYearStart - monthTextSize - 5);
    } function drawGrid(yYearStart) {
        // Month names display
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Draw day labels (Mon, Wed, Fri)
        const dayLabels = ['M', 'W', 'F'];
        ctx.fillStyle = '#888';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'right';

        for (let i = 0; i < dayLabels.length; i++) {
            const dayIndex = i * 2 + 1; // Mon=1, Wed=3, Fri=5
            const y = dayIndex * cellSize + padding * (dayIndex + 1) + yYearStart + cellSize / 2 + 3;
            ctx.fillText(dayLabels[i], padding - 5, y);
        } for (var i = 0; i < 53; i++) {
            // Draw the month names - better distribution across the year
            if (i % 4 === 0 && i < 52) { // Every 4 weeks, show month
                // Calculate month index based on week position in year (52 weeks total)
                const monthIndex = Math.min(Math.floor(i * 12 / 52), 11);
                ctx.fillStyle = '#666';
                ctx.font = '11px system-ui, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(monthNames[monthIndex], i * (cellSize + padding) + padding, yYearStart - 5);
            }// Draw clean grid cells
            for (var j = 0; j < 7; j++) {
                const x = i * (cellSize + padding) + padding;
                const y = j * (cellSize + padding) + padding + yYearStart;

                // Draw simple background cell
                ctx.fillStyle = '#ebedf0';
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }

        ctx.textAlign = 'left'; // Reset text alignment
    }
}
