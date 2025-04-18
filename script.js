// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

    // --- STATE VARIABLES ---
    let currentView = 'view1'; // Initial view
    let selectedTimespanView2 = 'latest_20'; // Default timespan for View 2
    let selectedTimespanView3 = 'latest_20'; // Default timespan for View 3

    let fullHourlyData = { // To store all fetched hourly data
        times: [],
        temperature: [],
        rain: [],
        windSpeed: []
    };
    let isLoading = false;
    let errorState = null;

    // --- DOM ELEMENT REFERENCES ---
    const navButtonView1 = document.getElementById('nav-view1');
    const navButtonView2 = document.getElementById('nav-view2');
    const navButtonView3 = document.getElementById('nav-view3');
    const mainNavigation = document.getElementById('main-navigation'); // For delegation if needed later

    const viewContainer = document.getElementById('view-content-area');
    const timespanControlsContainer = document.getElementById('timespan-controls');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorDisplay = document.getElementById('error-message');

    // --- CONSTANTS ---
    // Use the specific API URL provided
    const API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=61.4991&longitude=23.7871&hourly=temperature_2m,rain,apparent_temperature,wind_speed_10m,wind_direction_10m&current=wind_speed_10m,temperature_2m,rain&timezone=auto&past_days=31&wind_speed_unit=ms';
    const READINGS_COUNT = 20;
    const TIMESPAN_OPTIONS = ['latest_20', '24h', '48h', '72h', '1w', '1m'];

    // --- FUNCTIONS ---

    /**
     * Initializes the application: sets up listeners and fetches initial data.
     */
    function initializeApp() {
        // Setup navigation listeners
        navButtonView1.addEventListener('click', () => navigateTo('view1'));
        navButtonView2.addEventListener('click', () => navigateTo('view2'));
        navButtonView3.addEventListener('click', () => navigateTo('view3'));

        // Setup timespan control listeners using event delegation
        timespanControlsContainer.addEventListener('click', (event) => {
            // Check if the clicked element is a timespan button
            const button = event.target.closest('.timespan-button');
            if (button) {
                const newTimespan = button.dataset.timespanValue; // Get value from data-* attribute
                if (newTimespan) {
                    handleTimespanChange(currentView, newTimespan);
                }
            }
        });

        // Fetch initial data and render the default view
        fetchAndProcessWeatherData();
    }

    /**
     * Handles navigation to a different view.
     * @param {string} viewId - The ID of the view to navigate to ('view1', 'view2', 'view3').
     */
    function navigateTo(viewId) {
        if (viewId !== currentView) {
            currentView = viewId;
            renderCurrentView(); // Render the content of the new view
            updateNavigationHighlighting(); // Update which nav button is active
        }
    }

    /**
     * Fetches weather data from the API, processes it, and handles loading/error states.
     */
    async function fetchAndProcessWeatherData() {
        isLoading = true;
        errorState = null;
        showLoadingIndicator();
        hideErrorDisplay();
        clearViewContainer(); // Clear old data during load
        hideTimespanControls(); // Hide controls during load

        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                // Throw an error if the HTTP response status is not OK (e.g., 404, 500)
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            const rawData = await response.json(); // Parse the JSON response
            processAndStoreFullHourlyData(rawData); // Store the relevant data

        } catch (error) {
            console.error("Error fetching or processing weather data:", error); // Log detailed error
            errorState = `Säätietojen lataus epäonnistui. Yritä myöhemmin uudelleen. (${error.message})`;
            showErrorDisplay(errorState); // Show user-friendly error
        } finally {
            // This block always runs, whether try succeeded or failed
            isLoading = false;
            hideLoadingIndicator();
            // Render view even after error to show error message or empty state properly
            renderCurrentView();
        }
    }

    /**
     * Processes the raw API data and stores the necessary hourly arrays.
     * @param {object} rawData - The raw JSON data object from the API.
     */
    function processAndStoreFullHourlyData(rawData) {
        // Reset stored data first
        fullHourlyData.times = [];
        fullHourlyData.temperature = [];
        fullHourlyData.rain = [];
        fullHourlyData.windSpeed = [];

        // Check if the expected 'hourly' data exists
        if (rawData && rawData.hourly) {
            // Assign arrays, defaulting to empty array if a specific key is missing
            fullHourlyData.times = rawData.hourly.time || [];
            fullHourlyData.temperature = rawData.hourly.temperature_2m || [];
            fullHourlyData.rain = rawData.hourly.rain || [];
            fullHourlyData.windSpeed = rawData.hourly.wind_speed_10m || [];
        } else {
            console.warn("API data format might be unexpected. 'hourly' data missing.");
            // Set error state if critical data is missing
            if (!rawData?.hourly?.time) {
                 errorState = 'Säätietoja ei voitu käsitellä (puuttuva data).';
                 showErrorDisplay(errorState);
            }
        }
    }

    /**
     * Renders the content for the currently selected view.
     * Manages visibility of timespan controls.
     */
    function renderCurrentView() {
        clearViewContainer(); // Clear previous content first
        hideTimespanControls(); // Hide controls by default

        // If loading or error occurred, indicators handle the UI display
        if (isLoading || errorState) {
            // Ensure error message stays visible if it was set
             if(errorState) showErrorDisplay(errorState);
            return;
        }

        let dataToRender = [];
        let viewTitle = '';
        let currentTimespan = null; // Track the timespan for title/filtering

        //Determine which data and title to use based on current 'view'
        if (currentView === 'view1') {                                              // If view1 is active
            viewTitle = 'Temperatrue (°C)';
            currentTimespan = 'latest_20'; // view1 uses always latest 
            dataToRender = getFilteredDataForView('temperature', currentTimespan);
        }
        else if (currentView === 'view2') {                                         // If view2 is active
            viewTitle = 'Rain (mm)';
            currentTimespan = selectedTimespanView2;
            dataToRender = getFilteredDataForView('rain', currentTimespan);
            renderTimespanControls(currentTimespan); // Generating timespan controls for the view
            showTimespanControls();                 // Rendering timespan controls for the view
        }
        else if (currentView === 'view3') {
            viewTitle = 'Windspeed (m/s)';
            currentTimespan = selectedTimespanView3;
            dataToRender = getFilteredDataForView('windSpeed', currentTimespan);
            renderTimespanControls(); // Generating timespan controls for the view
            showTimespanControls();  // Rendering timespan controls for the view
        }
        // Renderi the list using the fetched and filtered data
        renderDataListView(dataToRender, viewTitle, currentTimespan);
    }

    /**
     * Filters the fullHourlyData by selected data type and timespan
     * @param {string} dataType - 'temperature', 'rain' or 'windspeed'
     * @param {strubg} timespan - 'latest_20', '24h', '48h', '72h', '1w' or '1m'
     * @param {array} - An array of {time, value} objects for the specific order.
     */

    function getFilteredDataForView(dataType, timespan) {
    
        const sourceDataArray = fullHourlyData[dataType] || [];     // Ensure the arrays exists in problem sisuation
        const sourceTimesArray = fullHourlyData.times || [];       
        const resuts = [];      
        const totalReadings = sourceTimesArray.length;

        if (totalReadings === 0 || sourceDataArray.length !== totalReadings) {
            console.warn(`ERROR: Data lenghts do not match, or zero lenght for ${datatype}`);
            return []; // return empty array 
        } 

        // --- Handling "Latest 20" ---
        if (timespan === 'latest_20') {
            const startIndex = Math.max(0, totalReadings - READINGS_COUNT) // From what index is slicing begun
            for (let i = startIndex; i < totalReadings; i++) {
                //make sure the datavalue exists and is not empty (null or undefined)
                if (sourceDataArray[i] !== null && sourceDataArray !== undefined) {
                    results.push({time: sourceTimesArray[i], value: sourceDataArray[i] });
                }
            }
            return resuts;
        }
    }

}); // End of DOMContentLoaded listener