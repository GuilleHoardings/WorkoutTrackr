# WorkoutTrackr

A simple, intuitive web application for tracking your workout exercises and monitoring your progress over time.

**Live Demo:** [https://guillehoardings.github.io/WorkoutTrackr/](https://guillehoardings.github.io/WorkoutTrackr/)

![WorkoutTrackr Logo](pushup.png)

## Features

- **Exercise Tracking**: Log different types of exercises including Push-ups, Pull-ups, Squats, Sit-ups, Lunges, Dips, and Planks
- **Data Visualization**: View your progress through multiple charts:
  - Repetitions over time
  - Repetitions per minute
  - Monthly activity summary
  - Activity calendar
- **Data Export/Import**: Download your workout data as CSV or import existing CSV data
- **Persistence**: All workout data is stored locally in your browser

## How to Use

1. Select an exercise from the dropdown menu
2. Enter the number of repetitions 
3. Add weight information if applicable
4. Click "Add Exercise" to log your workout
5. View your progress in the charts on the right side

## Data Management

- **Download CSV**: Export all your workout data to a CSV file
- **Add CSV data**: Import workout data from a CSV file without replacing existing data
- **Import CSV (Replace All)**: Replace all existing data with imported CSV data

## Important: Data Storage Limitations

WorkoutTrackr stores all your workout data in your browser's local storage. Please be aware of the following limitations:

- **Browser-specific storage**: Your data is only accessible from the specific browser where you entered it. If you use a different browser or device, your data won't be available there.
- **Data loss risk**: Clearing your browser cache, cookies, or local storage will permanently delete all your workout data.
- **Private/Incognito mode**: Data entered while browsing in private/incognito mode will be lost when you close the browser.
- **Storage limits**: Browsers typically limit local storage to 5-10MB per domain.

**Recommendation:** Regularly export your data to CSV using the "Download CSV" feature. This allows you to:
- Back up your workout history
- Transfer data between browsers or devices (via import)
- Preserve your data during browser cleanups
- Analyze your data in external applications like Excel

## Local Development

1. Clone the repository
2. Open `index.html` in your browser
3. Make changes to the JavaScript files as needed:
   - `workouttracker.js`: Core application functionality
   - `activity-tracker.js`: Visualization and activity tracking

## License

See the [LICENSE](LICENSE) file for details.