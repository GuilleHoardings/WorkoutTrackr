/**
 * WorkoutDataManager - Handles data storage, retrieval, and persistence
 */
class WorkoutDataManager {
    constructor() {
        this.workoutsData = [];
        this.DATA_VERSION_V1 = 1;
        this.DATA_VERSION_V2 = 2;
        this.DATA_VERSION_V3 = 3;
        this.CURRENT_DATA_VERSION = this.DATA_VERSION_V3;
    }

    /**
     * Load workout data from localStorage
     * @returns {Array} Array of workout data
     */
    async loadWorkoutData() {
        try {
            // First try to load from the current storage key
            if (localStorage.getItem("workoutData")) {
                const storedDataStr = localStorage.getItem("workoutData");
                if (!storedDataStr.trim()) {
                    throw new Error("Stored data is empty");
                }
                const storedData = JSON.parse(storedDataStr);
                this.processStoredData(storedData, "workoutData");
            }
            // Check for legacy data storage key for backward compatibility
            else if (localStorage.getItem("pushUpsData")) {
                const storedDataStr = localStorage.getItem("pushUpsData");
                if (!storedDataStr.trim()) {
                    throw new Error("Legacy data is empty");
                }
                const storedData = JSON.parse(storedDataStr);
                this.processStoredData(storedData, "pushUpsData");

                // After successfully migrating, remove the old data
                try {
                    localStorage.removeItem("pushUpsData");
                } catch (removeError) {
                    console.warn("Could not remove legacy data:", removeError);
                }
            }
        } catch (error) {
            console.error("Error loading workout data:", error);
            this.workoutsData = [];
            throw new Error("Failed to load saved data. Starting with empty workout list.");
        }

        return this.workoutsData;
    }

    /**
     * Process stored data and handle different format versions
     * @param {Object|Array} storedData - The stored data
     * @param {string} storageKey - The storage key used
     */
    processStoredData(storedData, storageKey) {
        try {
            // Check if the stored data is an array (original format)
            if (Array.isArray(storedData)) {
                const migratedData = this.migrateArrayToV2Format(storedData);
                localStorage.setItem("workoutData", JSON.stringify(migratedData));
                this.workoutsData = migratedData.data;
            }
            // Check if it's v1 format
            else if (storedData.version === this.DATA_VERSION_V1) {
                const migratedData = this.migrateV1ToV2Format(storedData);
                localStorage.setItem("workoutData", JSON.stringify(migratedData));
                this.workoutsData = migratedData.data;
            }
            // Already v2 or v3 format
            else if (storedData.version === this.DATA_VERSION_V2 || storedData.version === this.DATA_VERSION_V3) {
                this.workoutsData = storedData.data || [];

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
                this.workoutsData = [];
            }
        } catch (error) {
            console.error("Error processing stored data:", error);
            this.workoutsData = [];
            throw new Error("Failed to process stored data. Starting with empty workout list.");
        }

        return this.workoutsData;
    }

    /**
     * Save workout data to localStorage
     */
    async saveWorkoutData() {
        try {
            const dataToSave = {
                version: this.CURRENT_DATA_VERSION,
                data: this.workoutsData
            };
            localStorage.setItem("workoutData", JSON.stringify(dataToSave));
            return true;
        } catch (error) {
            console.error("Error saving workout data:", error);
            throw new Error("Failed to save workout data. Your data might be lost.");
        }
    }

    /**
     * Add a new workout or series to existing workout
     * @param {string} exercise - Exercise type
     * @param {number} reps - Number of reps
     * @param {number|null} weight - Weight used (null for bodyweight)
     * @returns {Object} The workout that was created or updated
     */
    addWorkout(exercise, reps, weight) {
        const newEntryTime = new Date();
        const dateString = newEntryTime.toISOString().split('T')[0]; // YYYY-MM-DD

        // Check if a workout for today already exists
        const existingWorkout = this.workoutsData.find(workout =>
            workout.dateString === dateString &&
            workout.exercise === exercise
        );

        if (existingWorkout) {
            // If a workout exists for today with the same exercise, add a new series
            const newSeries = {
                reps: reps,
                weight: weight,
                timestamp: newEntryTime.toISOString()
            };

            existingWorkout.series.push(newSeries);

            // Update the totals
            existingWorkout.totalReps += reps;

            // Calculate total time between first and last series
            const firstSeriesTime = new Date(existingWorkout.series[0].timestamp).getTime();
            const lastSeriesTime = newEntryTime.getTime();
            existingWorkout.totalTime = Math.round((lastSeriesTime - firstSeriesTime) / 60000);

            return existingWorkout;
        } else {
            // Create a new workout for today
            const newWorkout = {
                date: newEntryTime.toISOString(),
                dateString: dateString,
                exercise: exercise,
                series: [{
                    reps: reps,
                    weight: weight,
                    timestamp: newEntryTime.toISOString()
                }],
                totalTime: 0, // First series, so no time elapsed yet
                totalReps: reps
            };

            this.workoutsData.push(newWorkout);
            return newWorkout;
        }
    }

    /**
     * Recalculate totals for a workout (totalReps, totalTime, etc.)
     * @param {Object} workout - The workout to update
     */
    recalculateWorkoutTotals(workout) {
        if (!workout.series || workout.series.length === 0) {
            workout.totalReps = 0;
            workout.totalTime = 0;
            return;
        }

        // Sort series by timestamp to ensure chronological order
        workout.series.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Recalculate total reps
        workout.totalReps = workout.series.reduce((sum, s) => sum + s.reps, 0);

        // Recalculate total time between first and last series
        if (workout.series.length > 1) {
            const firstSeriesTime = new Date(workout.series[0].timestamp).getTime();
            const lastSeriesTime = new Date(workout.series[workout.series.length - 1].timestamp).getTime();
            workout.totalTime = Math.round((lastSeriesTime - firstSeriesTime) / 60000);
        } else {
            workout.totalTime = 0;
        }

        // Update the main workout date and dateString to match the first series
        workout.date = workout.series[0].timestamp;
        workout.dateString = new Date(workout.date).toISOString().split('T')[0];
    }

    /**
     * Delete a series from a workout and recalculate totals
     * @param {string} workoutId - Workout identifier (timestamp as string)
     * @param {number} seriesIndex - Index of the series to delete
     * @returns {boolean} True if series was deleted, false if workout was deleted
     */
    deleteSeries(workoutId, seriesIndex) {
        const workoutIndex = this.workoutsData.findIndex(workout =>
            new Date(workout.date).getTime().toString() === workoutId
        );

        if (workoutIndex === -1) {
            throw new Error("Workout not found");
        }

        const workout = this.workoutsData[workoutIndex];

        if (seriesIndex < 0 || seriesIndex >= workout.series.length) {
            throw new Error("Series index out of bounds");
        }

        // If this is the only series, delete the entire workout
        if (workout.series.length === 1) {
            this.workoutsData.splice(workoutIndex, 1);
            return false; // Indicates workout was deleted
        }

        // Remove the series
        workout.series.splice(seriesIndex, 1);

        // Recalculate totals
        this.recalculateWorkoutTotals(workout);

        return true; // Indicates series was deleted but workout remains
    }

    /**
     * Update an existing series in a workout and recalculate totals
     * @param {string} workoutId - Workout identifier (timestamp as string)
     * @param {number} seriesIndex - Index of the series to update
     * @param {number} reps - New number of reps
     * @param {number|null} weight - New weight used
     * @param {Date|null} newTimestamp - Optional new timestamp for the series
     * @returns {Object} The updated (or new) workout
     */
    updateSeries(workoutId, seriesIndex, reps, weight, newTimestamp = null) {
        const workoutIndex = this.workoutsData.findIndex(workout =>
            new Date(workout.date).getTime().toString() === workoutId
        );

        if (workoutIndex === -1) {
            throw new Error("Workout not found");
        }

        const workout = this.workoutsData[workoutIndex];

        if (seriesIndex < 0 || seriesIndex >= workout.series.length) {
            throw new Error("Series index out of bounds");
        }

        // Update the series data
        const series = workout.series[seriesIndex];
        
        if (newTimestamp) {
            const oldTimestamp = new Date(series.timestamp);
            const oldDateString = oldTimestamp.toISOString().split('T')[0];
            const newDateString = newTimestamp.toISOString().split('T')[0];

            if (oldDateString !== newDateString) {
                // The date has changed, create a new series object and move it
                const movedSeries = {
                    ...series,
                    reps: reps,
                    weight: weight !== null && !isNaN(weight) ? weight : null,
                    timestamp: newTimestamp.toISOString()
                };

                // 1. Remove from current workout
                workout.series.splice(seriesIndex, 1);
                
                // 2. If current workout is now empty, remove it
                if (workout.series.length === 0) {
                    this.workoutsData.splice(workoutIndex, 1);
                } else {
                    // Otherwise update original workout's totals
                    this.recalculateWorkoutTotals(workout);
                }

                // 3. Find or create a workout on the new date
                let targetWorkout = this.workoutsData.find(w => 
                    w.dateString === newDateString && 
                    w.exercise === workout.exercise
                );

                if (targetWorkout) {
                    // Add to existing workout
                    targetWorkout.series.push(movedSeries);
                    this.recalculateWorkoutTotals(targetWorkout);
                    return targetWorkout;
                } else {
                    // Create new workout for this date
                    const newWorkout = {
                        date: newTimestamp.toISOString(),
                        dateString: newDateString,
                        exercise: workout.exercise,
                        series: [movedSeries],
                        totalTime: 0,
                        totalReps: movedSeries.reps
                    };
                    this.workoutsData.push(newWorkout);
                    // Keep workouts sorted by date (newest first)
                    this.workoutsData.sort((a, b) => new Date(b.date) - new Date(a.date));
                    return newWorkout;
                }
            } else {
                // Same day, update in place
                series.reps = reps;
                series.weight = weight !== null && !isNaN(weight) ? weight : null;
                series.timestamp = newTimestamp.toISOString();
                this.recalculateWorkoutTotals(workout);
                return workout;
            }
        } else {
            // No timestamp change, update in place
            series.reps = reps;
            series.weight = weight !== null && !isNaN(weight) ? weight : null;
            this.recalculateWorkoutTotals(workout);
            return workout;
        }
    }

    /**
     * Update the date of a workout
     * @param {string} workoutId - Workout identifier (timestamp as string)
     * @param {Date} newDate - The new date for the workout
     * @returns {Object} The updated (or merged) workout
     */
    updateWorkoutDate(workoutId, newDate) {
        const workoutIndex = this.workoutsData.findIndex(workout =>
            new Date(workout.date).getTime().toString() === workoutId
        );

        if (workoutIndex === -1) {
            throw new Error("Workout not found");
        }

        const workout = this.workoutsData[workoutIndex];
        const newDateString = newDate.toISOString().split('T')[0];

        // Check if another workout for the same exercise already exists on the new date
        // (and it's not the same workout entry)
        const existingWorkout = this.workoutsData.find(w =>
            w.dateString === newDateString &&
            w.exercise === workout.exercise &&
            new Date(w.date).getTime().toString() !== workoutId
        );

        if (existingWorkout) {
            // Merge this workout into the existing one
            workout.series.forEach(s => {
                // Update timestamp for the series to match the new date but preserve time
                const seriesTime = new Date(s.timestamp);
                const updatedSeriesTime = new Date(newDate);
                updatedSeriesTime.setHours(seriesTime.getHours());
                updatedSeriesTime.setMinutes(seriesTime.getMinutes());
                updatedSeriesTime.setSeconds(seriesTime.getSeconds());
                updatedSeriesTime.setMilliseconds(seriesTime.getMilliseconds());
                s.timestamp = updatedSeriesTime.toISOString();
                
                existingWorkout.series.push(s);
            });

            // Recalculate totals and sort series
            this.recalculateWorkoutTotals(existingWorkout);

            // Remove the old workout entry
            this.workoutsData.splice(workoutIndex, 1);
            return existingWorkout;
        } else {
            // No conflict, update the date by updating all series timestamps
            workout.series.forEach(s => {
                const seriesTime = new Date(s.timestamp);
                const updatedSeriesTime = new Date(newDate);
                updatedSeriesTime.setHours(seriesTime.getHours());
                updatedSeriesTime.setMinutes(seriesTime.getMinutes());
                updatedSeriesTime.setSeconds(seriesTime.getSeconds());
                updatedSeriesTime.setMilliseconds(seriesTime.getMilliseconds());
                s.timestamp = updatedSeriesTime.toISOString();
            });

            // Recalculate everything (this updates workout.date and workout.dateString)
            this.recalculateWorkoutTotals(workout);
            return workout;
        }
    }

    /**
     * Get all workouts data
     * @returns {Array} Array of all workouts
     */
    getAllWorkouts() {
        return this.workoutsData;
    }

    /**
     * Get workouts sorted by date (newest first)
     * @returns {Array} Sorted array of workouts
     */
    getWorkoutsSortedByDate() {
        return [...this.workoutsData].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Get unique exercise types
     * @returns {Array} Array of unique exercise types
     */
    getUniqueExerciseTypes() {
        return [...new Set(this.workoutsData.map(workout => workout.exercise))];
    }

    /**
     * Replace all workout data (used for CSV import)
     * @param {Array} newData - New workout data
     */
    replaceAllData(newData) {
        this.workoutsData = newData;
    }

    /**
     * Add multiple workouts (used for CSV import)
     * @param {Array} newWorkouts - Array of new workouts to add
     */
    addMultipleWorkouts(newWorkouts) {
        this.workoutsData = this.workoutsData.concat(newWorkouts);
    }

    // Migration functions
    createMigratedSeries(date, totalReps, totalTime) {
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

    migrateArrayToV2Format(oldData) {
        const workouts = [];

        oldData.forEach(entry => {
            const date = new Date(entry.date);
            const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

            // Create series using shared function
            const series = this.createMigratedSeries(date, entry.pushUps, entry.timeBetweenFirstAndLast);

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
            version: this.DATA_VERSION_V2,
            data: workouts
        };
    }

    migrateV1ToV2Format(oldData) {
        const workouts = [];

        oldData.data.forEach(entry => {
            const date = new Date(entry.date);
            const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

            // Create series using shared function
            const series = this.createMigratedSeries(date, entry.pushUps, entry.timeBetweenFirstAndLast);

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
            version: this.DATA_VERSION_V2,
            data: workouts
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutDataManager;
} else {
    window.WorkoutDataManager = WorkoutDataManager;
}
