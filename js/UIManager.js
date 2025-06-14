/**
 * UIManager - Handles DOM manipulation and user interface updates
 */
class UIManager {
    constructor(dataManager, notificationManager) {
        this.dataManager = dataManager;
        this.notificationManager = notificationManager;
        this.domElements = this.initializeDOMElements();
    }

    /**
     * Initialize and cache DOM elements
     * @returns {Object} Object containing cached DOM elements
     */
    initializeDOMElements() {
        return {
            exerciseForm: document.getElementById("workout-form"),
            exerciseTable: document.getElementById("workout-table"),
            repsInput: document.getElementById("reps"),
            weightInput: document.getElementById("weight"),
            exerciseSelect: document.getElementById("exercise-select"),
            workoutListContainer: document.getElementById('workout-list-container')
        };
    }

    /**
     * Validate that all essential DOM elements exist
     * @returns {boolean} True if all elements exist, false otherwise
     */
    validateEssentialElements() {
        const essentialElements = {
            'workout-form': this.domElements.exerciseForm,
            'reps': this.domElements.repsInput,
            'weight': this.domElements.weightInput,
            'exercise-select': this.domElements.exerciseSelect
        };

        const missingElements = [];
        for (const [id, element] of Object.entries(essentialElements)) {
            if (!element) {
                missingElements.push(id);
            }
        }

        if (missingElements.length > 0) {
            console.error("Missing essential DOM elements:", missingElements);
            this.notificationManager.showError(`Application error: Missing required elements (${missingElements.join(', ')}). Please refresh the page.`);
            return false;
        }

        return true;
    }

    /**
     * Update the workout table/list display
     */
    updateWorkoutTable() {
        try {
            if (!this.domElements.workoutListContainer) {
                console.error("Workout list container not found");
                return;
            }

            // Clear the current list
            this.domElements.workoutListContainer.innerHTML = '';

            // Get sorted workouts from data manager
            const sortedWorkouts = this.dataManager.getWorkoutsSortedByDate();

            // Add each workout to the list
            sortedWorkouts.forEach(workout => this.addWorkoutToList(workout));

            // Add event listeners to toggle the details view
            this.setupToggleListeners();
        } catch (error) {
            console.error("Error updating workout table:", error);
            this.notificationManager.showWarning("Failed to update workout display. Please refresh the page.");
        }
    }

    /**
     * Add a single workout item to the list
     * @param {Object} workout - The workout object to add
     */
    addWorkoutToList(workout) {
        if (!this.domElements.workoutListContainer) {
            console.error("Workout list container not found");
            return;
        }

        // Create the main workout item
        const workoutItem = document.createElement('div');
        workoutItem.className = 'workout-item';
        workoutItem.dataset.id = new Date(workout.date).getTime(); // Use timestamp as ID

        // Format date
        const dateDetail = document.createElement('div');
        dateDetail.className = 'workout-detail date';
        dateDetail.textContent = this.createLongFormattedDate(new Date(workout.date));

        // Exercise type
        const exerciseDetail = document.createElement('div');
        exerciseDetail.className = 'workout-detail exercise';
        exerciseDetail.textContent = workout.exercise;

        // Total reps
        const repsDetail = document.createElement('div');
        repsDetail.className = 'workout-detail reps';
        repsDetail.textContent = workout.totalReps;

        // Time
        const timeDetail = document.createElement('div');
        timeDetail.className = 'workout-detail time';
        const displayTime = workout.totalTime || 0;
        timeDetail.textContent = displayTime + ' min';

        // Reps per minute
        const repsPerMinDetail = document.createElement('div');
        repsPerMinDetail.className = 'workout-detail reps-per-min';
        const repsPerMinute = displayTime > 0 ? (workout.totalReps / displayTime).toFixed(2) : 'N/A';
        repsPerMinDetail.textContent = repsPerMinute;

        // Toggle icon
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '▶';
        repsPerMinDetail.appendChild(toggleIcon);

        // Add all details to the workout item
        workoutItem.appendChild(dateDetail);
        workoutItem.appendChild(exerciseDetail);
        workoutItem.appendChild(repsDetail);
        workoutItem.appendChild(timeDetail);
        workoutItem.appendChild(repsPerMinDetail);

        // Create the collapsible series container
        const seriesContainer = document.createElement('div');
        seriesContainer.className = 'series-container';

        // Create series list using the helper function
        seriesContainer.innerHTML = this.createSeriesListHtml(workout.series);

        // Add the workout item and series container to the list
        this.domElements.workoutListContainer.appendChild(workoutItem);
        this.domElements.workoutListContainer.appendChild(seriesContainer);
    }

    /**
     * Create HTML for series list
     * @param {Array} series - Array of series objects
     * @returns {string} HTML string for the series list
     */
    createSeriesListHtml(series) {
        let seriesHtml = '<ul class="series-list">';
        series.forEach((series, index) => {
            const seriesTime = new Date(series.timestamp);
            const weightDisplay = series.weight ? `${series.weight} kg` : 'Bodyweight';
            seriesHtml += `<li>Series ${index + 1}: ${series.reps} reps - ${weightDisplay} - ${seriesTime.toLocaleTimeString()}</li>`;
        });
        seriesHtml += '</ul>';
        return seriesHtml;
    }

    /**
     * Setup event listeners for toggling series details
     */
    setupToggleListeners() {
        const workoutItems = document.querySelectorAll('.workout-item');

        workoutItems.forEach(item => {
            // Remove existing listeners to prevent duplicates
            item.removeEventListener('click', this.handleWorkoutItemClick);
            item.addEventListener('click', this.handleWorkoutItemClick.bind(this));
        });
    }

    /**
     * Handle workout item click for toggling details
     * @param {Event} event - Click event
     */
    handleWorkoutItemClick(event) {
        event.currentTarget.classList.toggle('expanded');
    }

    /**
     * Clear form inputs
     */
    clearFormInputs() {
        if (this.domElements.repsInput) this.domElements.repsInput.value = '';
        if (this.domElements.weightInput) this.domElements.weightInput.value = '';
    }

    /**
     * Get form values
     * @returns {Object} Object containing form values
     */
    getFormValues() {
        return {
            reps: parseInt(this.domElements.repsInput?.value),
            exercise: this.domElements.exerciseSelect?.value,
            weight: this.domElements.weightInput?.value ? parseFloat(this.domElements.weightInput.value) : null
        };
    }

    /**
     * Create long formatted date string
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    createLongFormattedDate(date) {
        return new Intl.DateTimeFormat('es-ES', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            year: '2-digit',
        }).format(date);
    }

    /**
     * Create short formatted date string
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    createShortFormattedDate(date) {
        return new Intl.DateTimeFormat().format(date);
    }

    /**
     * Initialize the UI with loaded data
     */
    async initializeUI() {
        if (!this.validateEssentialElements()) {
            return;
        }

        const workouts = this.dataManager.getAllWorkouts();
        if (workouts.length > 0) {
            this.updateWorkoutTable();
        }
    }

    /**
     * Refresh the entire UI
     */
    refreshUI() {
        this.updateWorkoutTable();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
}
