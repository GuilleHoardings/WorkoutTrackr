/**
 * NotificationManager - Handles user notifications and messages
 */
class NotificationManager {
    constructor() {
        this.alertContainer = null;
        this.defaultDuration = 5000; // 5 seconds
    }

    /**
     * Show error message to the user
     * @param {string} message - Error message to display
     * @param {number} duration - Duration in milliseconds (optional)
     */
    showError(message, duration = this.defaultDuration) {
        this.showMessage(message, 'error', duration);
    }

    /**
     * Show success message to the user
     * @param {string} message - Success message to display
     * @param {number} duration - Duration in milliseconds (optional)
     */
    showSuccess(message, duration = this.defaultDuration) {
        this.showMessage(message, 'success', duration);
    }

    /**
     * Show warning message to the user
     * @param {string} message - Warning message to display
     * @param {number} duration - Duration in milliseconds (optional)
     */
    showWarning(message, duration = this.defaultDuration) {
        this.showMessage(message, 'warning', duration);
    }

    /**
     * Show info message to the user
     * @param {string} message - Info message to display
     * @param {number} duration - Duration in milliseconds (optional)
     */
    showInfo(message, duration = this.defaultDuration) {
        this.showMessage(message, 'info', duration);
    }

    /**
     * Show a message with specified type
     * @param {string} message - Message to display
     * @param {string} type - Type of message ('error', 'success', 'warning', 'info')
     * @param {number} duration - Duration in milliseconds
     */
    showMessage(message, type = 'info', duration = this.defaultDuration) {
        // Remove existing alert if present
        this.clearExistingAlert();

        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-message alert-${type}`;
        alertDiv.textContent = message;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            border-radius: 5px;
            color: white;
            z-index: 1000;
            max-width: 300px;
            background-color: ${this.getBackgroundColor(type)};
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
        `;

        // Add close button
        const closeButton = document.createElement('span');
        closeButton.innerHTML = '&times;';
        closeButton.style.cssText = `
            position: absolute;
            top: 5px;
            right: 10px;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
        `;
        closeButton.addEventListener('click', () => this.removeAlert(alertDiv));
        alertDiv.appendChild(closeButton);

        // Add to document
        document.body.appendChild(alertDiv);
        this.alertContainer = alertDiv;

        // Auto-remove after specified duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeAlert(alertDiv);
            }, duration);
        }
    }

    /**
     * Get background color for message type
     * @param {string} type - Message type
     * @returns {string} CSS color value
     */
    getBackgroundColor(type) {
        const colors = {
            'error': '#dc3545',
            'success': '#28a745',
            'warning': '#ffc107',
            'info': '#17a2b8'
        };
        return colors[type] || colors.info;
    }

    /**
     * Clear any existing alert
     */
    clearExistingAlert() {
        const existingAlert = document.querySelector('.alert-message');
        if (existingAlert) {
            existingAlert.remove();
        }
        this.alertContainer = null;
    }

    /**
     * Remove a specific alert element
     * @param {HTMLElement} alertElement - Alert element to remove
     */
    removeAlert(alertElement) {
        if (alertElement && alertElement.parentNode) {
            alertElement.remove();
            if (this.alertContainer === alertElement) {
                this.alertContainer = null;
            }
        }
    }

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Callback for confirmation
     * @param {Function} onCancel - Callback for cancellation (optional)
     */
    showConfirmation(message, onConfirm, onCancel = null) {
        const confirmed = confirm(message);
        if (confirmed && onConfirm) {
            onConfirm();
        } else if (!confirmed && onCancel) {
            onCancel();
        }
    }

    /**
     * Show loading message
     * @param {string} message - Loading message
     * @returns {Function} Function to hide the loading message
     */
    showLoading(message = 'Loading...') {
        this.showMessage(message, 'info', 0); // 0 duration means it won't auto-hide

        // Return function to hide loading
        return () => {
            this.clearExistingAlert();
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
} else {
    window.NotificationManager = NotificationManager;
}
