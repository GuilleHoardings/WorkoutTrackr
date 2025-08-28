/**
 * UIManager - Handles DOM manipulation and user interface updates
 */
class UIManager {
    constructor(dataManager, notificationManager, refreshCallback = null, exerciseTypeManager = null) {
        this.dataManager = dataManager;
        this.notificationManager = notificationManager;
        this.refreshCallback = refreshCallback;
        this.exerciseTypeManager = exerciseTypeManager;
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
            workoutListContainer: document.getElementById('workout-list-container'),
            // Exercise management elements
            exerciseManagement: document.querySelector('.exercise-management'),
            exerciseManagementHeader: document.getElementById("exercise-management-header"),
            exerciseManagementContent: document.getElementById("exercise-management-content"),
            exerciseCount: document.getElementById("exercise-count"),
            toggleArrow: document.getElementById("toggle-arrow"),
            newExerciseInput: document.getElementById("new-exercise-input"),
            addExerciseBtn: document.getElementById("add-exercise-btn"),
            exerciseTypesList: document.getElementById("exercise-types-list"),
            resetExercisesBtn: document.getElementById("reset-exercises-btn")
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
            let sortedWorkouts = this.dataManager.getWorkoutsSortedByDate();

            // Filter out workouts with deleted exercise types if configured to do so
            if (this.exerciseTypeManager && this.exerciseTypeManager.hideDeletedExercisesFromTable) {
                const allowedExerciseTypes = new Set(this.exerciseTypeManager.getExerciseTypes());
                sortedWorkouts = sortedWorkouts.filter(workout => 
                    allowedExerciseTypes.has(workout.exercise)
                );
            }

            // Add each workout to the list
            sortedWorkouts.forEach(workout => this.addWorkoutToList(workout));

            // Add event listeners to toggle the details view
            this.setupToggleListeners();

            // Notify layout enhancements that list changed
            document.dispatchEvent(new CustomEvent('workoutListUpdated'));
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

        // Check if this exercise type is deleted
        const isDeletedExerciseType = this.exerciseTypeManager && 
            !this.exerciseTypeManager.getExerciseTypes().includes(workout.exercise);

        // Create the main workout item
        const workoutItem = document.createElement('div');
        workoutItem.className = 'workout-item';
        if (isDeletedExerciseType) {
            workoutItem.classList.add('deleted-exercise-type');
        }
        workoutItem.dataset.id = new Date(workout.date).getTime(); // Use timestamp as ID

        // Format date
        const dateDetail = document.createElement('div');
        dateDetail.className = 'workout-detail date';
        dateDetail.textContent = this.createLongFormattedDate(new Date(workout.date));

        // Exercise type
        const exerciseDetail = document.createElement('div');
        exerciseDetail.className = 'workout-detail exercise';
        exerciseDetail.textContent = workout.exercise;
        if (isDeletedExerciseType) {
            exerciseDetail.title = 'This exercise type has been deleted';
            exerciseDetail.innerHTML += ' <span class="deleted-indicator">(deleted)</span>';
        }

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
        const workoutId = new Date(workout.date).getTime().toString();
        seriesContainer.innerHTML = this.createSeriesListHtml(workout.series, workoutId);

        // Add the workout item and series container to the list
        this.domElements.workoutListContainer.appendChild(workoutItem);
        this.domElements.workoutListContainer.appendChild(seriesContainer);
    }

    /**
     * Create HTML for series list
     * @param {Array} series - Array of series objects
     * @param {string} workoutId - Workout identifier for delete functionality
     * @returns {string} HTML string for the series list
     */
    createSeriesListHtml(series, workoutId) {
        let seriesHtml = '<ul class="series-list">';
        series.forEach((series, index) => {
            const seriesTime = new Date(series.timestamp);
            const weightDisplay = series.weight ? `${series.weight} kg` : 'Bodyweight';
            seriesHtml += `
                <li class="series-item">
                    <span class="series-info">Series ${index + 1}: ${series.reps} reps - ${weightDisplay} - ${seriesTime.toLocaleTimeString()}</span>
                    <button class="delete-series-btn" data-workout-id="${workoutId}" data-series-index="${index}" title="Delete this series">×</button>
                </li>`;
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

        // Also setup delete listeners
        this.setupDeleteListeners();
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

        // Initialize exercise management UI
        this.initializeExerciseManagement();

        const workouts = this.dataManager.getAllWorkouts();
        if (workouts.length > 0) {
            this.updateWorkoutTable();
        }
        
        // Update activity legend
        this.updateActivityLegend();
    }

    /**
     * Refresh the entire UI
     */
    refreshUI() {
        this.updateWorkoutTable();
        this.updateExerciseDropdown();
        this.updateExerciseTypesList();
        this.updateActivityLegend();
    }

    /**
     * Setup event listeners for deleting series
     */
    setupDeleteListeners() {
        const deleteButtons = document.querySelectorAll('.delete-series-btn');

        deleteButtons.forEach(button => {
            // Remove existing listeners to prevent duplicates
            button.removeEventListener('click', this.handleDeleteSeries);
            button.addEventListener('click', this.handleDeleteSeries.bind(this));
        });
    }

    /**
     * Handle series deletion
     * @param {Event} event - Click event from delete button
     */
    async handleDeleteSeries(event) {
        event.stopPropagation(); // Prevent the workout item from toggling

        const workoutId = event.target.dataset.workoutId;
        const seriesIndex = parseInt(event.target.dataset.seriesIndex);

        try {
            // Show confirmation dialog
            const confirmed = confirm('Are you sure you want to delete this series?');
            if (!confirmed) {
                return;
            }

            // Delete the series using the data manager
            const workoutRemains = this.dataManager.deleteSeries(workoutId, seriesIndex);

            // Save the updated data
            await this.dataManager.saveWorkoutData();

            if (workoutRemains) {
                this.notificationManager.showSuccess('Series deleted successfully');
            } else {
                this.notificationManager.showSuccess('Workout deleted (was the last series)');
            }

            // Refresh the UI to show updated data
            if (this.refreshCallback) {
                this.refreshCallback();
            } else {
                this.refreshUI();
            }

        } catch (error) {
            console.error('Error deleting series:', error);
            this.notificationManager.showError('Failed to delete series: ' + error.message);
        }
    }

    /**
     * Initialize exercise management UI
     */
    initializeExerciseManagement() {
        console.log('Initializing exercise management UI...');
        
        if (!this.exerciseTypeManager) {
            console.warn('Exercise type manager not available');
            return;
        }

        // Set initial collapsed state
        this.updateAccordionState();

        // Update exercise dropdown
        this.updateExerciseDropdown();
        
        // Update exercise types list
        this.updateExerciseTypesList();
        
        // Setup event listeners
        this.setupExerciseManagementListeners();
        
        console.log('Exercise management UI initialized');
    }

    /**
     * Update the exercise dropdown with current exercise types
     */
    updateExerciseDropdown() {
        if (!this.exerciseTypeManager || !this.domElements.exerciseSelect) {
            return;
        }

        const exerciseTypes = this.exerciseTypeManager.getExerciseTypes();
        const currentValue = this.domElements.exerciseSelect.value;
        
        // Clear existing options
        this.domElements.exerciseSelect.innerHTML = '';
        
        // Add exercise types as options
        exerciseTypes.forEach(exerciseType => {
            const option = document.createElement('option');
            option.value = exerciseType;
            option.textContent = exerciseType;
            this.domElements.exerciseSelect.appendChild(option);
        });
        
        // Restore previous selection if it still exists
        if (exerciseTypes.includes(currentValue)) {
            this.domElements.exerciseSelect.value = currentValue;
        }
    }

    /**
     * Update the exercise types list display
     */
    updateExerciseTypesList() {
        if (!this.exerciseTypeManager || !this.domElements.exerciseTypesList) {
            return;
        }

        const exerciseTypes = this.exerciseTypeManager.getExerciseTypes();
        
        // Update exercise count in header
        if (this.domElements.exerciseCount) {
            const count = exerciseTypes.length;
            this.domElements.exerciseCount.textContent = `${count} exercise type${count !== 1 ? 's' : ''}`;
        }
        
        // Clear existing list
        this.domElements.exerciseTypesList.innerHTML = '';
        
        // Add each exercise type with delete button
        exerciseTypes.forEach(exerciseType => {
            const item = document.createElement('div');
            item.className = 'exercise-type-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'exercise-type-name';
            nameSpan.textContent = exerciseType;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-exercise-btn';
            deleteBtn.title = `Delete ${exerciseType}`;
            deleteBtn.addEventListener('click', () => this.handleDeleteExerciseType(exerciseType));
            
            item.appendChild(nameSpan);
            item.appendChild(deleteBtn);
            this.domElements.exerciseTypesList.appendChild(item);
        });
    }

    /**
     * Setup event listeners for exercise management
     */
    setupExerciseManagementListeners() {
        // Accordion toggle
        if (this.domElements.exerciseManagementHeader) {
            this.domElements.exerciseManagementHeader.addEventListener('click', () => this.toggleAccordion());
        }
        
        // Add exercise button
        if (this.domElements.addExerciseBtn) {
            this.domElements.addExerciseBtn.addEventListener('click', () => this.handleAddExerciseType());
        }
        
        // Add exercise input (Enter key)
        if (this.domElements.newExerciseInput) {
            this.domElements.newExerciseInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAddExerciseType();
                }
            });
        }
        
        // Reset button
        if (this.domElements.resetExercisesBtn) {
            this.domElements.resetExercisesBtn.addEventListener('click', () => this.handleResetExerciseTypes());
        }
    }

    /**
     * Handle adding a new exercise type
     */
    async handleAddExerciseType() {
        if (!this.exerciseTypeManager || !this.domElements.newExerciseInput) {
            return;
        }

        const exerciseType = this.domElements.newExerciseInput.value.trim();
        if (!exerciseType) {
            this.notificationManager.showError('Please enter an exercise type name.');
            return;
        }

        const success = await this.exerciseTypeManager.addExerciseType(exerciseType);
        if (success) {
            // Clear input
            this.domElements.newExerciseInput.value = '';
            
            // Update UI
            this.updateExerciseDropdown();
            this.updateExerciseTypesList();
            
            // Update legend colors if needed
            this.updateActivityLegend();
        }
    }

    /**
     * Handle deleting an exercise type
     */
    async handleDeleteExerciseType(exerciseType) {
        if (!this.exerciseTypeManager) {
            return;
        }

        const success = await this.exerciseTypeManager.deleteExerciseType(exerciseType);
        if (success) {
            // Update UI
            this.updateExerciseDropdown();
            this.updateExerciseTypesList();
            
            // Update legend colors
            this.updateActivityLegend();
            
            // Refresh charts if callback exists
            if (this.refreshCallback) {
                this.refreshCallback();
            }
        }
    }

    /**
     * Handle resetting exercise types to defaults
     */
    async handleResetExerciseTypes() {
        if (!this.exerciseTypeManager) {
            return;
        }

        const success = await this.exerciseTypeManager.resetToDefaults();
        if (success) {
            // Update UI
            this.updateExerciseDropdown();
            this.updateExerciseTypesList();
            
            // Update legend colors
            this.updateActivityLegend();
            
            // Refresh charts if callback exists
            if (this.refreshCallback) {
                this.refreshCallback();
            }
        }
    }

    /**
     * Update the activity legend with current exercise colors
     */
    updateActivityLegend() {
        if (!this.exerciseTypeManager) {
            return;
        }

        const legendItems = document.querySelector('.legend-items');
        if (!legendItems) {
            return;
        }

        const exerciseTypes = this.exerciseTypeManager.getExerciseTypes();
        
        // Clear existing legend items
        legendItems.innerHTML = '';
        
        // Add legend item for each exercise type
        exerciseTypes.forEach(exerciseType => {
            const colorInfo = this.exerciseTypeManager.getExerciseColor(exerciseType);
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            const colorDiv = document.createElement('div');
            colorDiv.className = 'legend-color';
            colorDiv.style.backgroundColor = `hsl(${colorInfo.hue}, 70%, 45%)`;
            
            const span = document.createElement('span');
            span.textContent = exerciseType;
            
            legendItem.appendChild(colorDiv);
            legendItem.appendChild(span);
            legendItems.appendChild(legendItem);
        });
    }

    /**
     * Toggle the accordion state
     */
    toggleAccordion() {
        if (!this.exerciseTypeManager) {
            return;
        }

        const isCollapsed = this.exerciseTypeManager.toggleCollapsed();
        this.updateAccordionState();
    }

    /**
     * Update the accordion visual state
     */
    updateAccordionState() {
        if (!this.exerciseTypeManager || !this.domElements.exerciseManagement) {
            return;
        }

        const isCollapsed = this.exerciseTypeManager.getCollapsedState();
        
        if (isCollapsed) {
            this.domElements.exerciseManagement.classList.add('collapsed');
        } else {
            this.domElements.exerciseManagement.classList.remove('collapsed');
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
}
