// Constants
const pushUpForm = document.getElementById("push-up-form");
const pushUpTable = document.getElementById("push-up-table");
const pushUpsInput = document.getElementById("push-ups");
const pushUpsChart = document.getElementById("push-up-chart");
const pushUpsPerMinuteChart = document.getElementById("push-up-per-minute-chart");

// Variables to store push-up data and charts
let pushUpsData = [];
let chart1, chart2;

// Load previously stored data from localStorage
if (localStorage.getItem("pushUpsData")) {
    pushUpsData = JSON.parse(localStorage.getItem("pushUpsData"));
    pushUpsData.forEach(data => addRowToTable(data));
    createOrUpdateCharts();
}

// Listen to the form's submit event
pushUpForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Get push-up count from the input field
    const pushUps = parseInt(pushUpsInput.value);
    const currentDate = new Date();

    // Remove the time part from the current date to compare only the date part
    currentDate.setHours(0, 0, 0, 0);

    // Check if an entry with the current date already exists in the array
    const existingEntry = pushUpsData.find(data => new Date(data.date).setHours(0, 0, 0, 0) === currentDate.getTime());

    if (existingEntry) {
        // If an entry exists, update the push-up count
        existingEntry.pushUps += pushUps;
    } else {
        // Create a new data object and push it into the array
        const pushUpData = {
            date: currentDate,
            pushUps: pushUps,
            timeBetweenFirstAndLast: 0
        };
        pushUpsData.push(pushUpData);
    }

    // Save to the localStorage
    localStorage.setItem("pushUpsData", JSON.stringify(pushUpsData));

    // Clear and repopulate the table rows
    pushUpsData.forEach(data => {
        pushUpTable.deleteRow(-1);
    });

    pushUpsData.forEach(data => {
        addRowToTable(data);
    });

    // Update the charts
    createOrUpdateCharts();

});


function addRowToTable(data) {
    const row = pushUpTable.insertRow(-1);
    const dateCell = row.insertCell(0);
    const pushUpsCell = row.insertCell(1);
    const timeCell = row.insertCell(2);

    // Format and display the data in the table
    const formattedDate = new Intl.DateTimeFormat().format(new Date(data.date));
    dateCell.innerHTML = formattedDate;
    pushUpsCell.innerHTML = data.pushUps;
    timeCell.innerHTML = data.timeBetweenFirstAndLast + ' minutes';
}

function createOrUpdateCharts() {
    // Check if the charts already exist, if they do, update the data
    if (chart1 && chart2) {
        chart1.data.labels = pushUpsData.map(data => new Intl.DateTimeFormat().format(new Date(data.date)));
        chart1.data.datasets[0].data = pushUpsData.map(data => data.pushUps);
        chart1.update();

        chart2.data.labels = pushUpsData.map(data => new Intl.DateTimeFormat().format(new Date(data.date)));
        chart2.data.datasets[0].data = pushUpsData.map(data => data.pushUps / data.timeBetweenFirstAndLast);
        chart2.update();
    } else {
        // Create the charts using Chart.js
        chart1 = new Chart(pushUpsChart, {
            type: "bar",
            data: {
                labels: pushUpsData.map(data => new Intl.DateTimeFormat().format(new Date(data.date))),
                datasets: [{
                    label: "Push ups",
                    data: pushUpsData.map(data => data.pushUps),
                    backgroundColor: "rgba(75, 192, 192, 0.2)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1,
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        chart2 = new Chart(pushUpsPerMinuteChart, {
            type: "line",
            data: {
                labels: pushUpsData.map(data => new Intl.DateTimeFormat().format(new Date(data.date))),
                datasets: [{
                    label: "Push ups per minute",
                    data: pushUpsData.map(data => data.pushUps / data.timeBetweenFirstAndLast),
                    fill: false,
                    borderColor: "rgba(255, 99, 132, 1)",
                    tension: 0.1,
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}
