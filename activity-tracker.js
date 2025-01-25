function weeksFromYearStart(date) {
    // Returns the number of weeks from the first week of the year, considering
    // the first week of the year as the first week where there is a day of the
    // year.
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);

    // Get the day of the week for the first day of the year. If it's Sunday (0),
    // we consider it the last day of the week (6)
    const firstDayOfYearWeekIndex = firstDayOfYear.getDay() === 0 ? 6 : firstDayOfYear.getDay() - 1;

    const firstWeekStart = new Date(firstDayOfYear);
    firstWeekStart.setDate(firstDayOfYear.getDate() - firstDayOfYearWeekIndex);
    const diff = date - firstWeekStart;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay) + 1;
    const weekNumber = Math.ceil(dayOfYear / 7);
    return weekNumber - 1;
}
