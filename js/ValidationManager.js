/**
 * ValidationManager - Handles input validation and data integrity checks
 */
class ValidationManager {
    constructor(notificationManager) {
        this.notificationManager = notificationManager;
    }

    /**
     * Validate workout form inputs
     * @param {number} reps - Number of reps
     * @param {string} exercise - Exercise type
     * @param {number|null} weight - Weight value
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validateWorkoutInput(reps, exercise, weight) {
        const errors = [];

        // Validate reps
        if (isNaN(reps) || reps <= 0) {
            errors.push("Please enter a valid number of reps (greater than 0).");
        } else if (reps > 10000) {
            errors.push("Number of reps seems unusually high. Please check your input.");
        }

        // Validate exercise
        if (!exercise || exercise.trim() === "") {
            errors.push("Please select an exercise type.");
        }

        // Validate weight
        if (weight !== null) {
            if (isNaN(weight) || weight < 0) {
                errors.push("Please enter a valid weight (0 or greater).");
            } else if (weight > 1000) {
                errors.push("Weight seems unusually high. Please check your input.");
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate workout data structure
     * @param {Object} workout - Workout object to validate
     * @returns {Object} Validation result
     */
    validateWorkoutData(workout) {
        const errors = [];
        const required = ['date', 'exercise', 'series', 'totalReps'];

        // Check required fields
        const missing = required.filter(field => !(field in workout));
        if (missing.length > 0) {
            errors.push(`Missing required fields: ${missing.join(', ')}`);
        }

        // Validate date
        if (workout.date && isNaN(new Date(workout.date).getTime())) {
            errors.push('Invalid workout date');
        }

        // Validate series
        if (!Array.isArray(workout.series) || workout.series.length === 0) {
            errors.push('Workout must have at least one series');
        } else {
            // Validate each series
            workout.series.forEach((series, index) => {
                const seriesErrors = this.validateSeriesData(series);
                if (!seriesErrors.isValid) {
                    errors.push(`Series ${index + 1}: ${seriesErrors.errors.join(', ')}`);
                }
            });
        }

        // Validate total reps
        if (workout.totalReps && (isNaN(workout.totalReps) || workout.totalReps <= 0)) {
            errors.push('Invalid total reps value');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate series data structure
     * @param {Object} series - Series object to validate
     * @returns {Object} Validation result
     */
    validateSeriesData(series) {
        const errors = [];

        // Check required fields
        if (!('reps' in series)) {
            errors.push('Missing reps field');
        } else if (isNaN(series.reps) || series.reps <= 0) {
            errors.push('Invalid reps value');
        }

        if (!('timestamp' in series)) {
            errors.push('Missing timestamp field');
        } else if (isNaN(new Date(series.timestamp).getTime())) {
            errors.push('Invalid timestamp');
        }

        // Validate weight if present
        if ('weight' in series && series.weight !== null) {
            if (isNaN(series.weight) || series.weight < 0) {
                errors.push('Invalid weight value');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate CSV file
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     */
    validateCSVFile(file) {
        const errors = [];

        if (!file) {
            errors.push("Please select a file to import.");
        } else {
            // Check file type
            if (!file.name.toLowerCase().endsWith('.csv')) {
                errors.push("Please select a valid CSV file.");
            }

            // Check file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                errors.push("File is too large. Maximum size is 10MB.");
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate CSV data content
     * @param {string} csvData - CSV data string
     * @returns {Object} Validation result
     */
    validateCSVData(csvData) {
        const errors = [];

        if (!csvData || csvData.trim() === '') {
            errors.push("The selected file is empty.");
        } else {
            // Basic CSV structure validation
            const lines = csvData.split('\n');
            if (lines.length < 2) {
                errors.push("CSV file must have at least a header and one data row.");
            }

            // Check for header
            const header = lines[0];
            if (!header || header.trim() === '') {
                errors.push("CSV file must have a header row.");
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate parsed workout data array
     * @param {Array} workouts - Array of workout objects
     * @returns {Object} Validation result with valid workouts
     */
    validateParsedWorkouts(workouts) {
        if (!Array.isArray(workouts)) {
            return {
                isValid: false,
                errors: ['Invalid workout data format'],
                validWorkouts: []
            };
        }

        const validWorkouts = [];
        const errors = [];

        workouts.forEach((workout, index) => {
            const validation = this.validateWorkoutData(workout);
            if (validation.isValid) {
                validWorkouts.push(workout);
            } else {
                errors.push(`Workout ${index + 1}: ${validation.errors.join(', ')}`);
            }
        });

        return {
            isValid: validWorkouts.length > 0,
            errors: errors,
            validWorkouts: validWorkouts,
            invalidCount: workouts.length - validWorkouts.length
        };
    }

    /**
     * Sanitize string input
     * @param {string} input - Input string
     * @returns {string} Sanitized string
     */
    sanitizeString(input) {
        if (typeof input !== 'string') {
            return '';
        }
        return input.trim().replace(/[<>]/g, ''); // Basic HTML tag removal
    }

    /**
     * Validate and show errors for workout input
     * @param {number} reps - Number of reps
     * @param {string} exercise - Exercise type
     * @param {number|null} weight - Weight value
     * @returns {boolean} True if valid, false otherwise
     */
    validateAndShowWorkoutErrors(reps, exercise, weight) {
        const validation = this.validateWorkoutInput(reps, exercise, weight);

        if (!validation.isValid) {
            // Show the first error (can be modified to show all errors)
            this.notificationManager.showError(validation.errors[0]);
            return false;
        }

        return true;
    }

    /**
     * Validate and show errors for CSV file
     * @param {File} file - File to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validateAndShowCSVErrors(file) {
        const validation = this.validateCSVFile(file);

        if (!validation.isValid) {
            this.notificationManager.showError(validation.errors[0]);
            return false;
        }

        return true;
    }

    /**
     * Check if localStorage is available
     * @returns {boolean} True if localStorage is available
     */
    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Validate localStorage data before saving
     * @param {Object} data - Data to validate
     * @returns {Object} Validation result
     */
    validateStorageData(data) {
        const errors = [];

        if (!data) {
            errors.push('No data to save');
        } else {
            // Check data structure
            if (!('version' in data)) {
                errors.push('Missing version information');
            }

            if (!('data' in data) || !Array.isArray(data.data)) {
                errors.push('Invalid data structure');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationManager;
} else {
    window.ValidationManager = ValidationManager;
}
