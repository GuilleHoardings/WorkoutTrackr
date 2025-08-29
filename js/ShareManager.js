class ShareManager {
    constructor(workoutDataManager, notificationManager, exerciseTypeManager) {
        this.workoutDataManager = workoutDataManager;
        this.notificationManager = notificationManager;
        this.exerciseTypeManager = exerciseTypeManager;
        this.maxUrlLength = 8192; // Conservative limit for server compatibility (8KB, 8192 characters)
        this.initializeShareButton();
        this.checkForSharedData();
    }

    initializeShareButton() {
        const shareButton = document.getElementById('share-data');
        if (shareButton) {
            shareButton.addEventListener('click', () => this.shareData());
        }
    }

    // Simple compression: pack with dictionaries & base64url encode
    compressOptimized(optimizedObj) {
        const dateMap = new Map();
        const exerciseMap = new Map();
        const dates = [];
        const exercises = [];
        const packedWorkouts = optimizedObj.w.map(([date, exercise, series]) => {
            if (!dateMap.has(date)) { dateMap.set(date, dates.length); dates.push(date); }
            if (!exerciseMap.has(exercise)) { exerciseMap.set(exercise, exercises.length); exercises.push(exercise); }
            return [dateMap.get(date), exerciseMap.get(exercise), series];
        });
        const packed = { v: 1, t: optimizedObj.t, d: dates, e: exercises, x: optimizedObj.x || [], w: packedWorkouts };
        const json = JSON.stringify(packed);
        const b64 = btoa(json).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
        return 'C1' + b64; // prefix for format identification
    }

    decompressString(compressed) {
        if (!compressed.startsWith('C1')) throw new Error('Unsupported compressed data');
        let b64 = compressed.slice(2).replace(/-/g,'+').replace(/_/g,'/');
        while (b64.length % 4) b64 += '=';
        const json = atob(b64);
        const packed = JSON.parse(json);
        if (packed.v !== 1) throw new Error('Bad version');
        const optimized = {
            v: 1,
            t: packed.t,
            x: packed.x || [],
            w: packed.w.map(([di, ei, series]) => [
                packed.d[di],
                packed.e[ei],
                series
            ])
        };
        return JSON.stringify(optimized);
    }

    // Build optimized transferable structure from internal workouts
    optimizeDataForCompression(shareData) {
        // Internal workout: {date: Date, dateString, exercise, series:[{reps, weight, timestamp}], ...}
        // Optimized: { v:1, t: timestamp, x: exerciseTypes, w: [ [dateString, exercise, [ [reps, weight], ... ] ] ... ] }
        const optimized = {
            v: 1,
            t: shareData.timestamp,
            x: shareData.exerciseTypes || [],
            w: shareData.workouts.map(w => [
                w.dateString || (w.date && new Date(w.date).toISOString().split('T')[0]),
                w.exercise,
                w.series.map(s => [s.reps, s.weight || 0])
            ])
        };
        return optimized;
    }

    restoreDataFromOptimized(optimized) {
        const workouts = [];
        optimized.w.forEach(([dateStr, exercise, series]) => {
            const iso = (dateStr || '').split('T')[0];
            const baseDate = new Date(iso + 'T00:00:00.000Z');
            const workout = {
                date: baseDate,
                dateString: iso,
                exercise,
                series: [],
                totalTime: 0,
                totalReps: 0
            };
            (series || []).forEach((arr, idx) => {
                let reps = Array.isArray(arr) ? arr[0] : 0;
                let weight = Array.isArray(arr) ? (arr[1] || 0) : 0;
                if (typeof reps !== 'number' || Number.isNaN(reps)) reps = 0;
                if (typeof weight !== 'number' || Number.isNaN(weight)) weight = 0;
                const ts = new Date(baseDate.getTime() + idx * 60000);
                workout.series.push({ reps, weight, timestamp: ts });
                workout.totalReps += reps;
            });
            if (workout.series.length > 1) workout.totalTime = workout.series.length - 1;
            workouts.push(workout);
        });
        return { timestamp: optimized.t, exerciseTypes: optimized.x || [], workouts };
    }

    async shareData() {
        try {
            const workouts = this.workoutDataManager.getAllWorkouts();
            const exerciseTypes = this.exerciseTypeManager.getExerciseTypes();
            
            const shareData = {
                workouts: workouts,
                exerciseTypes: exerciseTypes,
                timestamp: new Date().toISOString()
            };

            // Calculate original size before optimization
            const originalJsonString = JSON.stringify(shareData);
            const originalSize = originalJsonString.length;

            // Optimize data structure for compression
            const optimizedData = this.optimizeDataForCompression(shareData);
            const jsonString = JSON.stringify(optimizedData);
            
            // Show compression statistics
            this.notificationManager.showInfo(
                `Compressing ${workouts.length} workouts (${(originalSize / 1024).toFixed(1)}KB)...`
            );

            // Compress the data
            const compressed = this.compressOptimized(optimizedData);
            const compressedSize = compressed.length;
            const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
            
            // Create the share URL
            const currentUrl = window.location.origin + window.location.pathname;
            const shareUrl = `${currentUrl}?c=${compressed}`;
            
            console.log(`Compression stats:
                Original: ${originalSize} chars (${(originalSize / 1024).toFixed(1)}KB)
                Optimized: ${jsonString.length} chars (${(jsonString.length / 1024).toFixed(1)}KB)
                Compressed: ${compressedSize} chars (${(compressedSize / 1024).toFixed(1)}KB)
                Saved: ${compressionRatio}%
                URL length: ${shareUrl.length} chars`);
            
            if (shareUrl.length > this.maxUrlLength) {
                this.handleLargeDataset(shareData, workouts.length, {
                    original: originalSize,
                    compressed: compressedSize,
                    ratio: compressionRatio
                });
            } else {
                await this.copyToClipboard(shareUrl);
                this.notificationManager.showSuccess(
                    `Share link copied! Compressed ${compressionRatio}% (${workouts.length} workouts)`
                );
            }
            
        } catch (error) {
            console.error('Error creating share link:', error);
            this.notificationManager.showError(
                'Error creating share link.'
            );
        }
    }

    handleLargeDataset(shareData, workoutCount, compressionStats) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 10000;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white; padding: 20px; border-radius: 8px;
            max-width: 500px; text-align: center;
        `;
        
        dialog.innerHTML = `
            <h3>Dataset Too Large for URL</h3>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0; text-align: left;">
                <strong>Compression Results:</strong><br>
                Original: ${(compressionStats.original / 1024).toFixed(1)}KB<br>
                Compressed: ${(compressionStats.compressed / 1024).toFixed(1)}KB<br>
                Saved: ${compressionStats.ratio}%<br>
                Workouts: ${workoutCount}
            </div>
            <p>Choose an alternative sharing method:</p>
            <div style="margin: 20px 0;">
                <button id="share-recent" style="margin: 5px; padding: 10px 15px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Share Recent 100 Workouts
                </button>
                <button id="share-csv" style="margin: 5px; padding: 10px 15px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Download CSV Instead
                </button>
            </div>
            <button id="cancel-share" style="background: #ccc; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                Cancel
            </button>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        dialog.querySelector('#share-recent').addEventListener('click', async () => {
            await this.shareRecentWorkouts(shareData, 100);
            modal.remove();
        });
        
        dialog.querySelector('#share-csv').addEventListener('click', () => {
            this.downloadAsCSV();
            modal.remove();
        });
        
        dialog.querySelector('#cancel-share').addEventListener('click', () => {
            modal.remove();
        });
    }

    async shareRecentWorkouts(shareData, limit) {
        try {
            const sortedWorkouts = shareData.workouts
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, limit);
            
            const limitedShareData = {
                ...shareData,
                workouts: sortedWorkouts,
                isPartial: true,
                originalCount: shareData.workouts.length
            };
            
            const optimizedData = this.optimizeDataForCompression(limitedShareData);
            const jsonString = JSON.stringify(optimizedData);
            const compressed = this.compressOptimized(optimizedData);
            
            const currentUrl = window.location.origin + window.location.pathname;
            const shareUrl = `${currentUrl}?c=${compressed}`;
            
            await this.copyToClipboard(shareUrl);
            
            this.notificationManager.showSuccess(
                `Share link created with ${limit} most recent workouts (of ${shareData.workouts.length} total)`
            );
            
        } catch (error) {
            console.error('Error sharing recent workouts:', error);
            this.notificationManager.showError('Error creating share link.');
        }
    }

    downloadAsCSV() {
        // Trigger CSV download using existing functionality
        const downloadButton = document.getElementById('download-csv');
        if (downloadButton) {
            downloadButton.click();
        }
        
        this.notificationManager.showSuccess(
            'CSV file downloaded. Share this file to transfer your workout data.'
        );
    }

    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                // Fallback for legacy browsers: document.execCommand('copy') is deprecated; modern browsers should use navigator.clipboard API.
                document.execCommand('copy');
                textArea.remove();
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showManualCopyDialog(text);
        }
    }

    showManualCopyDialog(text) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 10000;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white; padding: 20px; border-radius: 8px;
            max-width: 90%; max-height: 90%; overflow: auto;
        `;
        dialog.innerHTML = `
            <h3>Copy Share Link</h3>
            <p>Please copy this link manually:</p>
            <textarea readonly style="width: 100%; height: 100px; margin: 10px 0; font-family: monospace; font-size: 12px;">${text}</textarea>
            <button id="close-copy-modal">Close</button>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);

        dialog.querySelector('#close-copy-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        const textarea = dialog.querySelector('textarea');
        textarea.focus();
        textarea.select();
    }
    }

    checkForSharedData() {
        const urlParams = new URLSearchParams(window.location.search);
        const compressedData = urlParams.get('c');
        const legacyData = urlParams.get('data'); // For backward compatibility
        
        if (compressedData) {
            this.importCompressedData(compressedData);
        } else if (legacyData) {
            this.importSharedData(legacyData);
        }
    }

    async importCompressedData(compressedData) {
        try {
            this.notificationManager.showInfo(
                'Decompressing shared workout data...'
            );
            
            // Use custom decompression for URL data
            const jsonString = this.decompressString(compressedData);
            const optimizedData = JSON.parse(jsonString);
            const shareData = this.restoreDataFromOptimized(optimizedData);
            
            this.showImportDialog(shareData);
            
        } catch (error) {
            console.error('Error importing compressed data:', error);
            this.notificationManager.showError(
                'Error importing shared workout data. The link may be corrupted.'
            );
        }
    }

    importSharedData(encodedData) {
        try {
            const jsonString = decodeURIComponent(atob(encodedData));
            const shareData = JSON.parse(jsonString);
            this.showImportDialog(shareData);
        } catch (error) {
            console.error('Error importing legacy shared data:', error);
            this.notificationManager.showError(
                'Error importing shared workout data.'
            );
        }
    }

    showImportDialog(shareData) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 10000;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white; padding: 20px; border-radius: 8px;
            max-width: 400px; text-align: center;
        `;
        
        const workoutCount = shareData.workouts.length;
        const shareDate = new Date(shareData.timestamp).toLocaleDateString();
        const isPartial = shareData.isPartial;
        
        dialog.innerHTML = `
            <h3>Import Shared Workouts</h3>
            <p>Someone shared ${workoutCount} workout(s) with you from ${shareDate}.</p>
            ${isPartial ? `<p><em>Note: This is a partial dataset (${shareData.originalCount} total workouts)</em></p>` : ''}
            <p><strong>This will replace all your current data!</strong></p>
            <div style="margin-top: 20px;">
                <button id="confirm-import" style="margin-right: 10px; background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                    Import Data
                </button>
                <button id="cancel-import" style="background: #ccc; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        dialog.querySelector('#confirm-import').addEventListener('click', () => {
            this.performImport(shareData);
            modal.remove();
            window.history.replaceState({}, document.title, window.location.pathname);
        });
        
        dialog.querySelector('#cancel-import').addEventListener('click', () => {
            modal.remove();
            window.history.replaceState({}, document.title, window.location.pathname);
        });
    }

    performImport(shareData) {
        try {
            // Import exercise types if provided
            if (shareData.exerciseTypes && Array.isArray(shareData.exerciseTypes)) {
                this.exerciseTypeManager.setExerciseTypes(shareData.exerciseTypes);
            }
            
            // Import workouts
            this.workoutDataManager.replaceAllData(shareData.workouts);
            // Persist immediately
            if (this.workoutDataManager.saveWorkoutData) {
                this.workoutDataManager.saveWorkoutData();
            }
            
            this.notificationManager.showSuccess(
                `Successfully imported ${shareData.workouts.length} workout(s)!`
            );
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            console.error('Error performing import:', error);
            this.notificationManager.showError(
                'Error importing workout data.'
            );
        }
    }
}
