/**
 * WorkoutTrackerApp - Main application controller that coordinates all modules
 */
class WorkoutTrackerApp {
    constructor() {
        // Initialize managers
        this.notificationManager = new NotificationManager();
        this.dataManager = new WorkoutDataManager();
        this.exerciseTypeManager = new ExerciseTypeManager(this.dataManager, this.notificationManager);
        this.validationManager = new ValidationManager(this.notificationManager);
        this.uiManager = new UIManager(this.dataManager, this.notificationManager, this.refreshUI.bind(this), this.exerciseTypeManager);
        this.chartManager = new ChartManager(this.dataManager, this.notificationManager);
        this.csvManager = new CSVManager(this.dataManager, this.notificationManager, this.validationManager);

        // Bind methods to preserve context
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.handleCSVExport = this.handleCSVExport.bind(this);
        this.handleCSVImport = this.handleCSVImport.bind(this);
        this.handleCSVReplace = this.handleCSVReplace.bind(this);

        // Application state
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing Workout Tracker App...');

            // Initialize exercise types first
            await this.exerciseTypeManager.initializeExerciseTypes();

            // Load workout data
            await this.loadData();

            // Initialize UI
            await this.uiManager.initializeUI();

            // Setup event listeners
            this.setupEventListeners();

            // Create charts if we have data
            if (this.dataManager.getAllWorkouts().length > 0) {
                this.chartManager.createOrUpdateCharts();
            }

            this.isInitialized = true;
            console.log('Workout Tracker App initialized successfully');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.notificationManager.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Load workout data from storage
     */
    async loadData() {
        try {
            await this.dataManager.loadWorkoutData();
        } catch (error) {
            console.error('Error loading data:', error);
            this.notificationManager.showError(error.message || 'Failed to load workout data');
        }
    }

    /**
     * Setup event listeners for the application
     */
    setupEventListeners() {
        // Form submission
        const form = document.getElementById('workout-form');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmit);
        }

        // CSV export
        const exportBtn = document.getElementById('download-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', this.handleCSVExport);
        }

        // CSV import
        const importBtn = document.getElementById('import-csv');
        const importInput = document.getElementById('file-input');
        if (importBtn && importInput) {
            importBtn.addEventListener('click', () => importInput.click());
            importInput.addEventListener('change', this.handleCSVImport);
        }

        // CSV replace import
        const replaceBtn = document.getElementById('import-csv-replace');
        const replaceInput = document.getElementById('file-input-replace');
        if (replaceBtn && replaceInput) {
            replaceBtn.addEventListener('click', () => replaceInput.click());
            replaceInput.addEventListener('change', this.handleCSVReplace);
        }
    }

    /**
     * Handle form submission for adding workouts
     * @param {Event} event - Form submit event
     */
    async handleFormSubmit(event) {
        event.preventDefault();

        try {
            // Get form values
            const formData = this.uiManager.getFormValues();

            // Validate input
            if (!this.validationManager.validateAndShowWorkoutErrors(
                formData.reps,
                formData.exercise,
                formData.weight
            )) {
                return;
            }

            // Add workout to data
            const workout = this.dataManager.addWorkout(
                formData.exercise,
                formData.reps,
                formData.weight
            );

            // Save data
            await this.dataManager.saveWorkoutData();
            this.notificationManager.showSuccess("Workout saved successfully!");

            // Update UI
            this.refreshUI();

        } catch (error) {
            console.error("Error processing workout submission:", error);
            this.notificationManager.showError("An error occurred while adding your workout. Please try again.");
        }
    }

    /**
     * Handle CSV export
     * @param {Event} event - Click event
     */
    async handleCSVExport(event) {
        event.preventDefault();
        await this.csvManager.exportToCSV();
    }

    /**
     * Handle CSV import
     * @param {Event} event - File input change event
     */
    async handleCSVImport(event) {
        const file = event.target.files[0];
        if (file) {
            const success = await this.csvManager.importFromCSV(file, false);
            if (success) {
                this.refreshUI();
            }
        }
        // Clear the input
        event.target.value = '';
    }

    /**
     * Handle CSV replace import
     * @param {Event} event - File input change event
     */
    async handleCSVReplace(event) {
        const file = event.target.files[0];
        if (file) {
            const success = await this.csvManager.importFromCSV(file, true);
            if (success) {
                this.refreshUI();
            }
        }
        // Clear the input
        event.target.value = '';
    }

    /**
     * Refresh the entire UI
     */
    refreshUI() {
        try {
            this.uiManager.refreshUI();
            this.chartManager.createOrUpdateCharts();
        } catch (error) {
            console.error('Error refreshing UI:', error);
            this.notificationManager.showWarning('Failed to refresh display. Please refresh the page.');
        }
    }

    /**
     * Get application statistics
     * @returns {Object} Application statistics
     */
    getStats() {
        const workouts = this.dataManager.getAllWorkouts();
        const exerciseTypes = this.dataManager.getUniqueExerciseTypes();

        const totalWorkouts = workouts.length;
        const totalReps = workouts.reduce((sum, workout) => sum + workout.totalReps, 0);
        const totalSeries = workouts.reduce((sum, workout) => sum + workout.series.length, 0);

        return {
            totalWorkouts,
            totalReps,
            totalSeries,
            exerciseTypes: exerciseTypes.length,
            exerciseTypesList: exerciseTypes
        };
    }

    /**
     * Clean up resources and event listeners
     */
    cleanup() {
        try {
            // Remove event listeners
            const form = document.getElementById('workout-form');
            if (form) {
                form.removeEventListener('submit', this.handleFormSubmit);
            }

            const exportBtn = document.getElementById('download-csv');
            if (exportBtn) {
                exportBtn.removeEventListener('click', this.handleCSVExport);
            }

            const importInput = document.getElementById('file-input');
            if (importInput) {
                importInput.removeEventListener('change', this.handleCSVImport);
            }

            const replaceInput = document.getElementById('file-input-replace');
            if (replaceInput) {
                replaceInput.removeEventListener('change', this.handleCSVReplace);
            }

            // Clean up chart manager
            this.chartManager.cleanup();

            this.isInitialized = false;
            console.log('Workout Tracker App cleanup completed');

        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    /**
     * Reset application data (with confirmation)
     */
    resetData() {
        this.notificationManager.showConfirmation(
            'Are you sure you want to delete all workout data? This action cannot be undone.',
            () => {
                try {
                    this.dataManager.replaceAllData([]);
                    this.dataManager.saveWorkoutData();
                    this.refreshUI();
                    this.notificationManager.showSuccess('All workout data has been cleared.');
                } catch (error) {
                    console.error('Error resetting data:', error);
                    this.notificationManager.showError('Failed to reset data.');
                }
            }
        );
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance
    window.workoutApp = new WorkoutTrackerApp();

    // Initialize the app
    window.workoutApp.init().catch(error => {
        console.error('Failed to start application:', error);
    });
});

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch(registrationError => {
                console.log('Service Worker registration failed:', registrationError);
            });
    });
}

// Handle page unload cleanup
window.addEventListener('beforeunload', () => {
    if (window.workoutApp) {
        window.workoutApp.cleanup();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutTrackerApp;
} else {
    window.WorkoutTrackerApp = WorkoutTrackerApp;
}
