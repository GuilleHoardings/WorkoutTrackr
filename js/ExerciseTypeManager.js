/**
 * ExerciseTypeManager - Handles exercise type storage, retrieval, and management
 */
class ExerciseTypeManager {
    constructor(dataManager, notificationManager) {
        this.dataManager = dataManager;
        this.notificationManager = notificationManager;
        this.exerciseTypes = [];
        
        // Configuration options
        this.hideDeletedExercisesFromTable = false; // Set to true to completely hide deleted exercises from table
        this.isCollapsed = true; // Start collapsed to save space
        
        this.exerciseColors = {
            'Push-ups': { hue: 130, name: 'Push-ups' },      // Green
            'Pull-ups': { hue: 210, name: 'Pull-ups' },      // Blue
            'Squats': { hue: 270, name: 'Squats' },          // Purple
            'Sit-ups': { hue: 30, name: 'Sit-ups' },         // Orange
            'Lunges': { hue: 300, name: 'Lunges' },          // Magenta
            'Dips': { hue: 180, name: 'Dips' },              // Cyan
            'Planks': { hue: 60, name: 'Planks' },           // Yellow
            'Back': { hue: 45, name: 'Back' },               // Gold/Yellow
        };
        
        // Default exercise types
        this.defaultExerciseTypes = [
            'Push-ups', 'Pull-ups', 'Squats', 'Sit-ups', 
            'Lunges', 'Dips', 'Planks'
        ];
    }
    
    /**
     * Initialize exercise types from localStorage or use defaults
     */
    async initializeExerciseTypes() {
        console.log('Initializing exercise types...');
        try {
            const storedTypes = localStorage.getItem('exerciseTypes');
            if (storedTypes) {
                this.exerciseTypes = JSON.parse(storedTypes);
                console.log('Loaded exercise types from storage:', this.exerciseTypes);
            } else {
                // Use default types if none stored
                this.exerciseTypes = [...this.defaultExerciseTypes];
                await this.saveExerciseTypes();
                console.log('Using default exercise types:', this.exerciseTypes);
            }
        } catch (error) {
            console.error('Error loading exercise types:', error);
            this.exerciseTypes = [...this.defaultExerciseTypes];
            this.notificationManager.showError('Failed to load exercise types. Using defaults.');
        }
    }

    /**
     * Save exercise types to localStorage
     */
    async saveExerciseTypes() {
        try {
            localStorage.setItem('exerciseTypes', JSON.stringify(this.exerciseTypes));
        } catch (error) {
            console.error('Error saving exercise types:', error);
            this.notificationManager.showError('Failed to save exercise types.');
            throw error;
        }
    }

    /**
     * Get all exercise types
     * @returns {Array} Array of exercise type names
     */
    getExerciseTypes() {
        return [...this.exerciseTypes];
    }

    /**
     * Set exercise types (for importing)
     * @param {Array} exerciseTypes - Array of exercise type names
     */
    async setExerciseTypes(exerciseTypes) {
        if (Array.isArray(exerciseTypes)) {
            this.exerciseTypes = [...exerciseTypes];
            await this.saveExerciseTypes();
        }
    }

    /**
     * Add a new exercise type
     * @param {string} exerciseType - The exercise type to add
     * @returns {boolean} True if added successfully, false if already exists
     */
    async addExerciseType(exerciseType) {
        if (!exerciseType || typeof exerciseType !== 'string') {
            this.notificationManager.showError('Invalid exercise type name.');
            return false;
        }

        const trimmedType = exerciseType.trim();
        if (trimmedType === '') {
            this.notificationManager.showError('Exercise type name cannot be empty.');
            return false;
        }

        if (this.exerciseTypes.includes(trimmedType)) {
            this.notificationManager.showError('Exercise type already exists.');
            return false;
        }

        try {
            this.exerciseTypes.push(trimmedType);
            await this.saveExerciseTypes();
            
            // Assign a color if not already assigned
            if (!this.exerciseColors[trimmedType]) {
                this.assignColorToExerciseType(trimmedType);
            }
            
            this.notificationManager.showSuccess(`Exercise type "${trimmedType}" added successfully.`);
            return true;
        } catch (error) {
            // Remove from array if save failed
            this.exerciseTypes = this.exerciseTypes.filter(type => type !== trimmedType);
            return false;
        }
    }

    /**
     * Delete an exercise type
     * @param {string} exerciseType - The exercise type to delete
     * @returns {boolean} True if deleted successfully, false otherwise
     */
    async deleteExerciseType(exerciseType) {
        if (!this.exerciseTypes.includes(exerciseType)) {
            this.notificationManager.showError('Exercise type not found.');
            return false;
        }

        // Check if there are workouts using this exercise type
        const workoutsWithType = this.dataManager.getAllWorkouts().filter(
            workout => workout.exercise === exerciseType
        );

        if (workoutsWithType.length > 0) {
            const confirmed = await this.showDeleteConfirmation(exerciseType, workoutsWithType.length);
            if (!confirmed) {
                return false;
            }
        }

        try {
            this.exerciseTypes = this.exerciseTypes.filter(type => type !== exerciseType);
            await this.saveExerciseTypes();
            
            // Remove color assignment
            delete this.exerciseColors[exerciseType];
            
            this.notificationManager.showSuccess(`Exercise type "${exerciseType}" deleted successfully.`);
            return true;
        } catch (error) {
            // Restore if save failed
            this.exerciseTypes.push(exerciseType);
            return false;
        }
    }

    /**
     * Show confirmation dialog for deleting exercise type with existing workouts
     * @param {string} exerciseType - The exercise type to delete
     * @param {number} workoutCount - Number of workouts using this type
     * @returns {Promise<boolean>} True if user confirms deletion
     */
    async showDeleteConfirmation(exerciseType, workoutCount) {
        return new Promise((resolve) => {
            const message = `Are you sure you want to delete "${exerciseType}"?\n\n` +
                          `This exercise type is used in ${workoutCount} workout${workoutCount > 1 ? 's' : ''}.\n` +
                          `Deleting it will not remove the existing workout data, but the exercise type ` +
                          `will no longer be available for new workouts.`;
            
            const confirmed = confirm(message);
            resolve(confirmed);
        });
    }

    /**
     * Assign a color to an exercise type
     * @param {string} exerciseType - The exercise type
     */
    assignColorToExerciseType(exerciseType) {
        // Generate a hue based on the exercise type name
        let hash = 0;
        for (let i = 0; i < exerciseType.length; i++) {
            hash = exerciseType.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        
        this.exerciseColors[exerciseType] = {
            hue: hue,
            name: exerciseType
        };
    }

    /**
     * Get color information for an exercise type
     * @param {string} exerciseType - The exercise type
     * @returns {Object} Color information with hue and name
     */
    getExerciseColor(exerciseType) {
        if (!this.exerciseColors[exerciseType]) {
            this.assignColorToExerciseType(exerciseType);
        }
        return this.exerciseColors[exerciseType];
    }

    /**
     * Get all exercise colors
     * @returns {Object} Object mapping exercise types to colors
     */
    getAllExerciseColors() {
        return { ...this.exerciseColors };
    }

    /**
     * Reset exercise types to defaults
     */
    async resetToDefaults() {
        const confirmed = confirm('Are you sure you want to reset exercise types to defaults? This will remove any custom exercise types you have added.');
        if (!confirmed) {
            return false;
        }

        try {
            this.exerciseTypes = [...this.defaultExerciseTypes];
            await this.saveExerciseTypes();
            this.notificationManager.showSuccess('Exercise types reset to defaults.');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Toggle collapsed state
     */
    toggleCollapsed() {
        this.isCollapsed = !this.isCollapsed;
        return this.isCollapsed;
    }

    /**
     * Get collapsed state
     */
    getCollapsedState() {
        return this.isCollapsed;
    }

    /**
     * Set collapsed state
     */
    setCollapsed(collapsed) {
        this.isCollapsed = collapsed;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExerciseTypeManager;
} else {
    window.ExerciseTypeManager = ExerciseTypeManager;
}
