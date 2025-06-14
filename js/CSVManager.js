/**
 * CSVManager - Handles CSV import and export functionality
 */
class CSVManager {
    constructor(dataManager, notificationManager, validationManager) {
        this.dataManager = dataManager;
        this.notificationManager = notificationManager;
        this.validationManager = validationManager;
    }

    /**
     * Export workout data to CSV
     * @returns {boolean} True if export was successful
     */
    async exportToCSV() {
        try {
            const workouts = this.dataManager.getAllWorkouts();

            if (workouts.length === 0) {
                this.notificationManager.showInfo("No workout data to export.");
                return false;
            }

            // Convert to CSV format
            const csvData = this.convertWorkoutsToCSV(workouts);

            if (!csvData || csvData.length <= 1) {
                this.notificationManager.showWarning("No valid workout data found to export.");
                return false;
            }

            // Create and download CSV file
            this.downloadCSVFile(csvData);
            this.notificationManager.showSuccess("CSV file downloaded successfully!");
            return true;

        } catch (error) {
            console.error("Error exporting CSV:", error);
            this.notificationManager.showError("Failed to export CSV file. Please try again.");
            return false;
        }
    }

    /**
     * Convert workouts to CSV format
     * @param {Array} workouts - Array of workout objects
     * @returns {Array} Array of CSV rows
     */
    convertWorkoutsToCSV(workouts) {
        const csvRows = [
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

        return csvRows;
    }

    /**
     * Download CSV file
     * @param {Array} csvRows - Array of CSV rows
     */
    downloadCSVFile(csvRows) {
        const csv = csvRows.map(row => row.join(',')).join('\n');
        const csvContent = 'data:text/csv;charset=utf-8,' + csv;
        const encodedUri = encodeURI(csvContent);

        // Get current date in YYYY-MM-DD format for the filename
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `workout_data_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Import workouts from CSV file
     * @param {File} file - CSV file to import
     * @param {boolean} replace - Whether to replace existing data
     * @returns {boolean} True if import was successful
     */
    async importFromCSV(file, replace = false) {
        try {
            // Validate file
            if (!this.validationManager.validateAndShowCSVErrors(file)) {
                return false;
            }

            const hideLoading = this.notificationManager.showLoading('Processing CSV file...');

            try {
                const csvData = await this.readFileAsText(file);

                // Validate CSV data
                const csvValidation = this.validationManager.validateCSVData(csvData);
                if (!csvValidation.isValid) {
                    this.notificationManager.showError(csvValidation.errors[0]);
                    return false;
                }

                const parsedData = this.parseCSVData(csvData);

                if (!parsedData || parsedData.length === 0) {
                    this.notificationManager.showError("No valid workout data found in the CSV file.");
                    return false;
                }

                // Validate parsed workouts
                const validation = this.validationManager.validateParsedWorkouts(parsedData);

                if (!validation.isValid) {
                    this.notificationManager.showError("No valid workouts found in the CSV file.");
                    return false;
                }

                // Update data
                if (replace) {
                    this.dataManager.replaceAllData(validation.validWorkouts);
                    this.notificationManager.showSuccess(
                        `Replaced all data with ${validation.validWorkouts.length} workouts from CSV.`
                    );
                } else {
                    this.dataManager.addMultipleWorkouts(validation.validWorkouts);
                    this.notificationManager.showSuccess(
                        `Imported ${validation.validWorkouts.length} workouts from CSV.`
                    );
                }

                // Show warning if some workouts were invalid
                if (validation.invalidCount > 0) {
                    this.notificationManager.showWarning(
                        `${validation.invalidCount} invalid workouts were skipped during import.`
                    );
                }

                // Save data
                await this.dataManager.saveWorkoutData();
                return true;

            } finally {
                hideLoading();
            }

        } catch (error) {
            console.error("Error importing CSV:", error);
            this.notificationManager.showError("An error occurred while importing the CSV file.");
            return false;
        }
    }

    /**
     * Read file as text
     * @param {File} file - File to read
     * @returns {Promise<string>} File content as string
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = function (event) {
                resolve(event.target.result);
            };

            reader.onerror = function () {
                reject(new Error("Failed to read the selected file."));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Parse CSV data into workout objects
     * @param {string} csvData - CSV data string
     * @returns {Array} Array of workout objects
     */
    parseCSVData(csvData) {
        const rows = csvData.split('\n').filter(row => row.trim() !== '');
        const parsedData = [];

        if (rows.length < 2) {
            return parsedData;
        }

        // Check the header to determine the CSV format
        const header = rows[0].split(',').map(col => col.trim());

        // New format - has 8 columns including series data
        if (header.length >= 7 && header.includes('Series Number')) {
            return this.parseNewFormatCSV(rows);
        }
        // Old format - 3 columns: date, pushUps, timeBetweenFirstAndLast
        else if (header.length >= 3) {
            return this.parseOldFormatCSV(rows);
        }

        return parsedData;
    }

    /**
     * Parse new format CSV (with series data)
     * @param {Array} rows - CSV rows
     * @returns {Array} Array of workout objects
     */
    parseNewFormatCSV(rows) {
        const workoutMap = new Map(); // Map to group series by workout date AND exercise type

        // Skip header row
        for (let i = 1; i < rows.length; i++) {
            const columns = rows[i].split(',');
            if (columns.length >= 7) {
                try {
                    const workoutDate = new Date(columns[0]);
                    const dateString = workoutDate.toISOString().split('T')[0];
                    const exercise = columns[1];
                    const seriesNumber = parseInt(columns[2]);
                    const reps = parseInt(columns[3]);
                    const weight = columns[4] === 'BW' ? null : parseFloat(columns[4]);
                    const seriesTime = new Date(columns[5]);
                    const totalReps = parseInt(columns[6]);
                    const totalTime = columns.length >= 8 ? parseInt(columns[7]) : 0;

                    // Skip invalid data
                    if (isNaN(workoutDate.getTime()) || isNaN(reps) || isNaN(totalReps)) {
                        continue;
                    }

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
                } catch (error) {
                    console.warn(`Error parsing CSV row ${i}:`, error);
                }
            }
        }

        // Convert the map to an array
        return Array.from(workoutMap.values());
    }

    /**
     * Parse old format CSV (legacy format)
     * @param {Array} rows - CSV rows
     * @returns {Array} Array of workout objects
     */
    parseOldFormatCSV(rows) {
        const parsedData = [];

        // Process as old format and convert to new format
        for (let i = 1; i < rows.length; i++) {
            const columns = rows[i].split(',');
            if (columns.length >= 3) {
                try {
                    const date = new Date(columns[0]);
                    const pushUps = parseInt(columns[1]);
                    const timeBetweenFirstAndLast = parseInt(columns[2]);

                    // Skip invalid data
                    if (isNaN(date.getTime()) || isNaN(pushUps) || isNaN(timeBetweenFirstAndLast)) {
                        continue;
                    }

                    // Convert to new format with series
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
                } catch (error) {
                    console.warn(`Error parsing CSV row ${i}:`, error);
                }
            }
        }

        return parsedData;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSVManager;
} else {
    window.CSVManager = CSVManager;
}
