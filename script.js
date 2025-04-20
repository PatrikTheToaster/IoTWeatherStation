// Make sure the HTML page is ready before doing anything
document.addEventListener('DOMContentLoaded', () => {

    // --- STATE VARIABLES ---
    let currentView = 'view1'; // Initial view: 'view1', 'view2', 'view3'
    let selectedTimespanView2 = 'latest_20';
    let selectedTimespanView3 = 'latest_20';
    let displayMode = 'table'; // ADDED: 'table' or 'chart'
    let fullHourlyData = { // Store ALL the API data here once fetched
        times: [],
        temperature: [],
        rain: [],
        windSpeed: []
    };
    let isLoading = false; // Track loading state
    let errorState = null; // Hold any error message if things go wrong
    let currentChartInstance = null; // ADDED: To hold the Chart.js instance

    // --- DOM ELEMENT REFERENCES ---
    const navButtonView1 = document.getElementById('nav-view1');
    const navButtonView2 = document.getElementById('nav-view2');
    const navButtonView3 = document.getElementById('nav-view3');
    const mainNavigation = document.getElementById('main-navigation');

    const viewContainer = document.getElementById('view-content-area');
    const viewTitlePlaceholder = document.getElementById('view-title-placeholder');
    const timespanControlsContainer = document.getElementById('timespan-controls');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorDisplay = document.getElementById('error-message');

    // ADDED: References for graph/toggle elements (Ensure these IDs exist in your HTML!)
    const displayModeControlsContainer = document.getElementById('display-mode-controls');
    const showTableButton = document.getElementById('show-table-button');
    const showChartButton = document.getElementById('show-chart-button');
    const chartContainer = document.getElementById('chart-container'); // Container div for chart
    const chartCanvas = document.getElementById('weather-chart-canvas'); // The canvas element
    const tableContainer = document.getElementById('table-container'); // Container for the table

    // --- CONSTANTS ---
    const API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=61.4991&longitude=23.7871&hourly=temperature_2m,rain,wind_speed_10m&timezone=auto&past_days=31&wind_speed_unit=ms';
    const READINGS_COUNT = 20;
    const TIMESPAN_OPTIONS = ['latest_20', '24h', '48h', '72h', '1w', '1m'];

    // --- FUNCTIONS ---

    /**
     * Initializes the application.
     */
    function initializeApp() {
        // Setup navigation listeners
        if (navButtonView1) navButtonView1.addEventListener('click', () => navigateTo('view1'));
        if (navButtonView2) navButtonView2.addEventListener('click', () => navigateTo('view2'));
        if (navButtonView3) navButtonView3.addEventListener('click', () => navigateTo('view3'));

        // Setup timespan control listeners
        if (timespanControlsContainer) {
            timespanControlsContainer.addEventListener('click', (event) => {
                const button = event.target.closest('.timespan-button');
                if (button) {
                    const newTimespan = button.dataset.timespanValue;
                    if (newTimespan) handleTimespanChange(newTimespan);
                }
            });
        } else {
            console.warn("Timespan controls container not found in HTML.");
        }

        // ADDED: Setup display mode control listeners
        if (displayModeControlsContainer) {
             displayModeControlsContainer.addEventListener('click', (event) => {
                 const button = event.target.closest('.display-mode-button');
                 if (button && button.dataset.mode) {
                     handleDisplayModeChange(button.dataset.mode);
                 }
             });
        } else {
             // Use console.error if this element is critical and MUST exist
             console.error("CRITICAL: Display mode controls container not found in HTML (#display-mode-controls). Toggle will not work.");
        }

        // Check if other essential elements exist (optional but good for debugging)
        if (!chartContainer) console.error("CRITICAL: Chart container not found (#chart-container). Charts cannot be displayed.");
        if (!tableContainer) console.error("CRITICAL: Table container not found (#table-container). Tables cannot be displayed.");


        // Fetch initial data
        fetchAndProcessWeatherData();
    }

    /**
     * Handles view navigation.
     * @param {string} viewId - Target view ID.
     */
    function navigateTo(viewId) {
        if (viewId !== currentView) {
            currentView = viewId;
            renderApp(); // Update the view
            updateNavigationHighlighting();
        }
    }

    /**
     * Fetches and processes weather data.
     */
    async function fetchAndProcessWeatherData() {
        isLoading = true;
        errorState = null;
        renderApp(); // Render loading state immediately

        try {
            console.log("Fetching data from:", API_URL);
            const response = await fetch(API_URL);
            console.log("API Response Status:", response.status);
            if (!response.ok) throw new Error(`API request failed: ${response.status}`);
            const rawData = await response.json();
            processAndStoreFullHourlyData(rawData);
        } catch (error) {
            console.error("Error fetching/processing weather data:", error);
            errorState = `Failed to load weather data. Check console. (${error.message})`;
        } finally {
            isLoading = false;
            renderApp(); // Render final state (data or error)
        }
    }

    /**
     * Stores the fetched hourly data arrays.
     */
     function processAndStoreFullHourlyData(rawData) {
        fullHourlyData = { times: [], temperature: [], rain: [], windSpeed: [] }; // Reset
        if (rawData?.hourly) {
            fullHourlyData.times = rawData.hourly.time || [];
            fullHourlyData.temperature = rawData.hourly.temperature_2m || [];
            fullHourlyData.rain = rawData.hourly.rain || [];
            fullHourlyData.windSpeed = rawData.hourly.wind_speed_10m || [];
            console.log("Processed Data Lengths - Times:", fullHourlyData.times.length, "Temp:", fullHourlyData.temperature.length, "Rain:", fullHourlyData.rain.length, "Wind:", fullHourlyData.windSpeed.length);
            if (fullHourlyData.times.length === 0 && (fullHourlyData.temperature.length > 0 || fullHourlyData.rain.length > 0 || fullHourlyData.windSpeed.length > 0)) {
                errorState = 'Could not process weather data (missing time data).';
                 console.warn(errorState);
            }
             if (fullHourlyData.times.length !== fullHourlyData.temperature.length || fullHourlyData.times.length !== fullHourlyData.rain.length || fullHourlyData.times.length !== fullHourlyData.windSpeed.length) {
                 console.warn("Warning: Data array lengths do not match time array length after processing.");
             }
        } else {
            errorState = 'Could not process weather data (missing hourly data).';
            console.warn(errorState);
        }
    }

    /**
     * Main function to update the page based on the current state.
     * Handles rendering table OR chart based on displayMode.
     */
    function renderApp() {
        console.log("RenderApp Start - isLoading:", isLoading, "errorState:", errorState, "currentView:", currentView, "displayMode:", displayMode); // Enhanced Log

        updateLoadingIndicator(isLoading);
        updateErrorDisplay(errorState);
        updateNavigationHighlighting();
        updateDisplayModeHighlighting(); // Update toggle button style

        if (isLoading || errorState) {
            console.log("RenderApp: Handling Loading/Error state.");
            clearViewContent(); // Clear table/chart containers, destroy chart
            hideTimespanControls();
            toggleDisplayModeControls(false); // Hide toggle buttons
            if (viewTitlePlaceholder) viewTitlePlaceholder.textContent = isLoading ? 'Loading...' : 'Error';
            return;
        }

        // --- If we reach here, isLoading is false AND errorState is null ---
        console.log("RenderApp: Proceeding to render data.");
        toggleDisplayModeControls(true); // Show toggle buttons

        let viewTitle = '';
        let currentTimespan = null;
        let dataType = null;
        let yAxisLabel = '';
        const showTimespanControlsUI = currentView === 'view2' || currentView === 'view3';

        if (currentView === 'view1') {
            viewTitle = 'Temperature';
            currentTimespan = 'latest_20';
            dataType = 'temperature';
            yAxisLabel = 'Temperature (°C)';
        } else if (currentView === 'view2') {
            viewTitle = 'Rain';
            currentTimespan = selectedTimespanView2;
            dataType = 'rain';
            yAxisLabel = 'Rain (mm)';
        } else if (currentView === 'view3') {
            viewTitle = 'Wind Speed';
            currentTimespan = selectedTimespanView3;
            dataType = 'windSpeed';
            yAxisLabel = 'Wind Speed (m/s)';
        } else {
            updateErrorDisplay("Internal Error: Unknown view selected.");
            return;
        }

        const timespanLabel = getTimespanLabel(currentTimespan);
        if (viewTitlePlaceholder) viewTitlePlaceholder.textContent = `${viewTitle} (${timespanLabel})`;
        toggleTimespanControls(showTimespanControlsUI);
        if (showTimespanControlsUI) {
            renderTimespanControls(currentTimespan);
        }

        let dataToRender = [];
        if (dataType && fullHourlyData.times.length > 0) {
            dataToRender = getFilteredDataForView(dataType, currentTimespan);
            console.log("RenderApp: Filtered data length:", dataToRender.length);
        } else {
             console.log("RenderApp: No data type or no source data available for filtering.");
        }

        // --- RENDER EITHER TABLE OR CHART ---
        console.log("RenderApp - About to render:", displayMode); // Log before decision
        if (displayMode === 'chart') {
            if (tableContainer) tableContainer.style.display = 'none';
            if (chartContainer) chartContainer.style.display = 'block';
            else console.error("RenderApp: Chart container missing, cannot display chart."); // Error if container missing
            renderChart(dataToRender, yAxisLabel);
        } else { // Default to table
            if (chartContainer) chartContainer.style.display = 'none';
            destroyChart();
            if (tableContainer) tableContainer.style.display = 'block';
             else console.error("RenderApp: Table container missing, cannot display table."); // Error if container missing
            renderDataTable(dataToRender, yAxisLabel);
        }
        console.log("RenderApp End"); // Log end
    }

    /**
     * Filters hourly data (remains the same)
     */
    function getFilteredDataForView(dataType, timespan) {
        const sourceDataArray = fullHourlyData[dataType] || [];
        const sourceTimesArray = fullHourlyData.times || [];
        let results = [];
        const totalReadings = sourceTimesArray.length;
        const nowMillis = new Date().getTime();

        // console.log(`Filtering: dataType=${dataType}, timespan=${timespan}, totalReadings=${totalReadings}, now=${new Date().toISOString()}`); // Less verbose log

        if (totalReadings === 0 || sourceDataArray.length === 0) return [];
        if (sourceDataArray.length !== totalReadings) {
             console.warn(`Filter: Mismatch in lengths! Times: ${totalReadings}, Data (${dataType}): ${sourceDataArray.length}.`);
        }

        let pastAndPresentData = [];
        const safeLength = Math.min(totalReadings, sourceDataArray.length);

        for (let i = 0; i < safeLength; i++) {
            try {
                if (!sourceTimesArray[i]) continue;
                const readingTime = new Date(sourceTimesArray[i]);
                const readingTimeMillis = readingTime.getTime();

                if (isNaN(readingTimeMillis) || readingTimeMillis > nowMillis) continue;

                if (sourceDataArray[i] !== null && sourceDataArray[i] !== undefined) {
                    pastAndPresentData.push({ time: sourceTimesArray[i], value: sourceDataArray[i] });
                }
            } catch (error) {
                 console.error(`Filter: Error processing index ${i}, time: ${sourceTimesArray[i]}`, error);
            }
        }

        const availableReadings = pastAndPresentData.length;
        if (availableReadings === 0) return [];

        if (timespan === 'latest_20') {
            const startIndex = Math.max(0, availableReadings - READINGS_COUNT);
            results = pastAndPresentData.slice(startIndex);
            return results;
        }

        let cutOffTimeMillis = null;
        switch (timespan) {
            case '24h': cutOffTimeMillis = nowMillis - (24 * 60 * 60 * 1000); break;
            case '48h': cutOffTimeMillis = nowMillis - (48 * 60 * 60 * 1000); break;
            case '72h': cutOffTimeMillis = nowMillis - (72 * 60 * 60 * 1000); break;
            case '1w': cutOffTimeMillis = nowMillis - (7 * 24 * 60 * 60 * 1000); break;
            case '1m': cutOffTimeMillis = nowMillis - (30 * 24 * 60 * 60 * 1000); break;
            default: return [];
        }

        results = pastAndPresentData.filter(item => {
             try {
                 const readingTimeMillis = new Date(item.time).getTime();
                 return !isNaN(readingTimeMillis) && readingTimeMillis >= cutOffTimeMillis;
             } catch(e) { return false; }
        });
        return results;
    }


    /**
     * Renders the weather data as an HTML table inside #table-container.
     * MODIFIED to target #table-container.
     * @param {Array} dataArray - Array of {time, value} objects (already filtered).
     * @param {string} titleWithUnit - Title including unit (e.g., 'Temperature (°C)').
     */
    function renderDataTable(dataArray, titleWithUnit) {
        // console.log(`renderDataTable: Rendering ${dataArray.length} items for '${titleWithUnit}'`); // Less verbose
        let contentHtml = '';
        if (!tableContainer) { // Check container exists
            console.error("renderDataTable Error: Table container element (#table-container) not found!");
            return;
        }

        if (dataArray.length === 0) {
            contentHtml = `<p class="no-data-message">No data available for the selected period.</p>`;
        } else {
            const reversedDataArray = [...dataArray].reverse();
            let unit = '';
            if (titleWithUnit.includes('°C')) unit = '°C';
            else if (titleWithUnit.includes('(mm)')) unit = ' mm';
            else if (titleWithUnit.includes('(m/s)')) unit = ' m/s';

            contentHtml += '<table class="responsive-weather-table">';
            contentHtml += `<thead><tr><th>Time</th><th>${titleWithUnit}</th></tr></thead>`;
            contentHtml += '<tbody>';
            reversedDataArray.forEach(item => {
                const formattedTime = formatDateTime(item.time);
                let valueDisplay = 'N/A';
                if (item.value !== null && item.value !== undefined) {
                     if (typeof item.value === 'number') {
                        if (unit === '°C' || unit === ' m/s') valueDisplay = item.value.toFixed(1);
                        else if (unit === ' mm') valueDisplay = item.value.toFixed(2);
                        else valueDisplay = item.value;
                     } else { valueDisplay = item.value; }
                }
                contentHtml += `<tr><td data-label="Time:">${formattedTime}</td><td data-label="${titleWithUnit}:"><strong class="value">${valueDisplay}</strong>${unit}</td></tr>`;
            });
            contentHtml += '</tbody></table>';
        }
        tableContainer.innerHTML = contentHtml; // Update the correct container
    }

    // ADDED: renderChart function
    /**
     * Renders the weather data as a bar chart using Chart.js.
     * @param {Array} dataArray - Array of {time, value} objects (already filtered).
     * @param {string} yAxisLabel - Label for the Y-axis (e.g., 'Temperature (°C)').
     */
    function renderChart(dataArray, yAxisLabel) {
        if (!chartCanvas || !chartContainer) {
            console.error("renderChart Error: Canvas or Container element not found!");
            return;
        }
        if (typeof Chart === 'undefined') {
             console.error("renderChart Error: Chart.js library is not loaded!");
             chartContainer.innerHTML = `<p class="error">Error: Chart library not loaded.</p>`;
             return;
         }

        const labels = dataArray.map(item => formatDateTime(item.time));
        const dataValues = dataArray.map(item => item.value);

        let barColor = 'rgba(54, 162, 235, 0.6)';
        if (yAxisLabel.includes('Temperature')) barColor = 'rgba(255, 99, 132, 0.6)';
        else if (yAxisLabel.includes('Rain')) barColor = 'rgba(75, 192, 192, 0.6)';
        else if (yAxisLabel.includes('Wind')) barColor = 'rgba(153, 102, 255, 0.6)';

        destroyChart(); // Destroy previous instance

        console.log(`renderChart: Creating chart with ${dataValues.length} data points.`);
        try {
             currentChartInstance = new Chart(chartCanvas, {
                 type: 'bar',
                 data: {
                     labels: labels,
                     datasets: [{
                         label: yAxisLabel, data: dataValues,
                         backgroundColor: barColor, borderColor: barColor.replace('0.6', '1'), borderWidth: 1
                     }]
                 },
                 options: {
                     responsive: true, maintainAspectRatio: false,
                     scales: {
                         y: { beginAtZero: !yAxisLabel.includes('Temperature'), title: { display: true, text: yAxisLabel } },
                         x: { title: { display: true, text: 'Time' }, ticks: { autoSkip: true, maxTicksLimit: 15, maxRotation: 0 } } // Added ticks options
                     },
                     plugins: {
                         legend: { display: false },
                         tooltip: { callbacks: { label: function(context) {
                             let label = context.dataset.label || ''; if (label) { label += ': '; }
                             if (context.parsed.y !== null) {
                                 let unit = ''; if (label.includes('°C')) unit = '°C'; else if (label.includes('(mm)')) unit = ' mm'; else if (label.includes('(m/s)')) unit = ' m/s';
                                 let value = context.parsed.y; if (typeof value === 'number') { if (unit === '°C' || unit === ' m/s') value = value.toFixed(1); else if (unit === ' mm') value = value.toFixed(2); }
                                 label += value + unit; } return label; } } }
                     }
                 }
             });
        } catch (error) {
            console.error("Error creating chart:", error);
            chartContainer.innerHTML = `<p class="error">Could not display chart.</p>`;
        }
    }

    // ADDED: Function to destroy the chart instance
    function destroyChart() {
        if (currentChartInstance) {
            // console.log("Destroying previous chart instance."); // Can be noisy
            currentChartInstance.destroy();
            currentChartInstance = null;
        }
    }

    /**
     * Renders the timespan selection controls (remains the same)
     */
    function renderTimespanControls(activeTimespan) {
        let controlsHtml = '<span class="timespan-label">Select Timespan: </span>';
        TIMESPAN_OPTIONS.forEach(option => {
            const isActive = (option === activeTimespan);
            const label = getTimespanLabel(option);
            controlsHtml += `<button class="timespan-button ${isActive ? 'active' : ''}" data-timespan-value="${option}" ${isActive ? 'aria-pressed="true"' : 'aria-pressed="false"'} >${label}</button> `;
        });
        if (timespanControlsContainer) timespanControlsContainer.innerHTML = controlsHtml;
    }

    /**
     * Handles the event when a user clicks a timespan control button (remains the same)
     */
    function handleTimespanChange(newTimespan) {
        // console.log("Timespan changed to:", newTimespan, "from view:", currentView); // Less verbose
        let changed = false;
        if (currentView === 'view2' && selectedTimespanView2 !== newTimespan) { selectedTimespanView2 = newTimespan; changed = true; }
        else if (currentView === 'view3' && selectedTimespanView3 !== newTimespan) { selectedTimespanView3 = newTimespan; changed = true; }
        if (changed) { renderApp(); }
    }

    // ADDED: Handle display mode change
    function handleDisplayModeChange(newMode) {
        if (newMode !== displayMode && (newMode === 'table' || newMode === 'chart')) {
            console.log("Display mode changed to:", newMode);
            displayMode = newMode; // Update the state
            renderApp(); // Re-render with the new mode
        }
    }

    /**
     * Updates the visual highlighting of the main navigation buttons (remains the same)
     */
    function updateNavigationHighlighting() {
        const buttons = [navButtonView1, navButtonView2, navButtonView3];
        buttons.forEach(button => {
            if (button) {
                 const buttonViewId = button.id.replace('nav-', '');
                 const isActive = (currentView === buttonViewId);
                 button.classList.toggle('active', isActive);
                 button.setAttribute('aria-current', isActive ? 'page' : 'false');
            }
        });
    }

    // ADDED: Update display mode button highlighting
    function updateDisplayModeHighlighting() {
        if (showTableButton) {
            showTableButton.classList.toggle('active', displayMode === 'table');
            showTableButton.setAttribute('aria-pressed', displayMode === 'table');
        }
        if (showChartButton) {
            showChartButton.classList.toggle('active', displayMode === 'chart');
            showChartButton.setAttribute('aria-pressed', displayMode === 'chart');
        }
    }

    // --- HELPER FUNCTIONS ---
     function updateLoadingIndicator(show) { if (loadingIndicator) loadingIndicator.style.display = show ? 'block' : 'none'; }
     function updateErrorDisplay(message) { if (errorDisplay) { if (message) { errorDisplay.textContent = message; errorDisplay.style.display = 'block'; } else { errorDisplay.textContent = ''; errorDisplay.style.display = 'none'; } } else if (message) { alert("Error: " + message); } }

    // MODIFIED: clearViewContent to clear containers and destroy chart
    function clearViewContent() {
        console.log("Clearing view content...");
        destroyChart(); // Destroy chart first
        if (chartContainer) chartContainer.style.display = 'none'; // Hide chart container
        if (tableContainer) {
            tableContainer.style.display = 'none'; // Hide table container
            tableContainer.innerHTML = '<p>Loading...</p>'; // Reset with placeholder
        }
    }

     function showTimespanControls() { if (timespanControlsContainer) timespanControlsContainer.style.display = 'block'; }
     function hideTimespanControls() { if (timespanControlsContainer) timespanControlsContainer.style.display = 'none'; }
     function toggleTimespanControls(show) { if(show) showTimespanControls(); else hideTimespanControls(); }

    // ADDED: Toggle display mode controls visibility
    function toggleDisplayModeControls(show) {
        if (displayModeControlsContainer) {
            displayModeControlsContainer.style.display = show ? 'block' : 'none'; // Or 'flex' based on CSS
        } else if (show) {
            // Warn if trying to show but controls don't exist
            console.warn("Attempted to show display mode controls, but container not found.");
        }
    }

    /** Formats date/time (remains the same) */
    function formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'N/A';
        try {
            const dateObj = new Date(dateTimeString);
            if (isNaN(dateObj.getTime())) { return 'Invalid Date'; }
            return dateObj.toLocaleString('fi-FI', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (e) { console.error("Error formatting date:", dateTimeString, e); return dateTimeString; }
    }

    /** Gets user-friendly timespan label (remains the same) */
    function getTimespanLabel(timespanValue) {
        switch (timespanValue) {
            case 'latest_20': return 'Latest 20 Readings';
            case '24h': return 'Last 24 hours';
            case '48h': return 'Last 48 hours';
            case '72h': return 'Last 72 hours';
            case '1w': return 'Last Week';
            case '1m': return 'Last Month';
            default: return timespanValue;
        }
    }

    // --- START THE APPLICATION ---
    console.log("Initializing App...");
    initializeApp(); // Let's go!

}); // End of DOMContentLoaded listener