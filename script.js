//TODO incorporate cubic interpolation (cubicInterpolation function already in the file, but not implemented)

/*
* GENERAL FUNCTIONS
*/

// Function to handle UI interactions
async function onCalculateHeightVelocityClick() {
    // Retrieve raw input values as strings so can check if has decimal place later
    const firstHeightStr = document.getElementById('firstHeight').value;
    const secondHeightStr = document.getElementById('secondHeight').value;

    // Convert to floats for calculations
    const firstHeight = parseFloat(firstHeightStr);
    const secondHeight = parseFloat(secondHeightStr);

    const firstDateValue = document.getElementById('firstDate').value;
    const secondDateValue = document.getElementById('secondDate').value;
    const gender = getSelectedGender();
    const errors = [];
    let decimalPrecisionAlerts = []; // Array to store decimal precision alerts

    if (!gender) {
        errors.push("Please select a gender.");
    }

    validateHeights(firstHeight, secondHeight, errors);
    const { firstDate, secondDate } = processAndValidateDates(firstDateValue, secondDateValue, errors);

    // Use raw string values for decimal place check
    if (!hasDecimalPlaces(firstHeightStr)) {
        decimalPrecisionAlerts.push("First height measurement needs to be within 0.1cm. Do not use rounded values.");
    }
    if (!hasDecimalPlaces(secondHeightStr)) {
        decimalPrecisionAlerts.push("Second height measurement needs to be within 0.1cm. Do not use rounded values.");
    }

    if (errors.length > 0) {
        displayErrors(errors);
        return;
    }

    const dob = moment(document.getElementById('DOB').value);
    const ageAtFirstDate = calculateAgeOnDate(dob, firstDate);
    let ageCheckPassed = true;
    // Check if the first measurement is before age 5
    if (ageAtFirstDate < 5.0) {
        ageCheckPassed = false;
    }

    await loadLMSData(gender);

    let heightVelocity;
    try {
        heightVelocity = calculateHeightVelocity(firstHeight, secondHeight, firstDate, secondDate);
        const errorElement = document.getElementById('errorSection');
        errorElement.style.display = "none";
    } catch (error) {
        displayErrors([error.message]);
        return;
    }

    const age = calculateAgeFromDOB();
    const ageAtSecondDate = calculateAgeOnDate(dob, secondDate);
    const midpointAge = calculateMidpointAge(firstDate, secondDate, dob);
    let zScore, centile;

    if (ageCheckPassed) {
        zScore = calculateZScore(heightVelocity, midpointAge, gender);
        centile = (calculatePercentileFromZScore(zScore) * 100).toFixed(1);
    } else {
        zScore = "Please input first measurement at a time from after age 5";
        centile = "N/A";
    }


    displayResult(heightVelocity, zScore, age, midpointAge, centile, ageAtFirstDate, ageAtSecondDate, decimalPrecisionAlerts);
}


// Additional function to display Z-score
function displayResult(heightVelocity, zScore, age, midpointAge, centile, ageAtFirstDate, ageAtSecondDate, decimalPrecisionAlerts) {
    const alertElement = document.getElementById('alert');
    let alertHTML = '';

    // Set result values
    document.getElementById('result-age').innerHTML = `${age.toFixed(2)} years`;
    document.getElementById('result-agefirstdate').innerHTML = `${ageAtFirstDate.toFixed(2)} years`;
    document.getElementById('result-ageseconddate').innerHTML = `${ageAtSecondDate.toFixed(2)} years`;
    document.getElementById('result-agedifference').innerHTML = `${(ageAtSecondDate - ageAtFirstDate).toFixed(2)} years`;
    document.getElementById('result-midpointage').innerHTML = `${midpointAge.toFixed(2)} years`;
    document.getElementById('result-hv').innerHTML = `${heightVelocity.toFixed(2)} cm/year`;
    document.getElementById('result-hvzscore').innerHTML = `${zScore}`;
    document.getElementById('result-hvcentile').innerHTML = `${centile}`;

    // Add existing alerts
    if ((ageAtSecondDate - ageAtFirstDate) < 0.5) {
        alertHTML += "<div>The two measurement ages are less than 6 months apart. High chance of impact from measurement error.</div>";
    } else if ((ageAtSecondDate - ageAtFirstDate) > 1.5) {
        alertHTML += "<div>The two measurement ages are more than 18 months apart. High chance of impact from measurement error.</div>";
    }

    // Append decimal precision alerts
    decimalPrecisionAlerts.forEach(alert => {
        alertHTML += `<div>${alert}</div>`;
    });

    // Set the alert content
    alertElement.innerHTML = alertHTML;
}



/*
* UTILITY FUNCTIONS
*/

function hasDecimalPlaces(valueStr) {
    const decimalIndex = valueStr.indexOf('.');
    return decimalIndex !== -1 && decimalIndex < valueStr.length - 1;
}




function getSelectedGender() {
    if (document.getElementById('male').checked) {
        return 'male';
    } else if (document.getElementById('female').checked) {
        return 'female';
    } else {
        return null;
    }
}

function calculateAgeFromDOB() {
    const dob = moment(document.getElementById('DOB').value);
    const now = moment();
    return now.diff(dob, 'years', true);
}

function calculateAgeOnDate(dob, date) {
    return date.diff(dob, 'years', true);
}


function calculateMidpointAge(firstDate, secondDate, dob) {
    const midpointDate = firstDate.clone().add(secondDate.diff(firstDate) / 2, 'milliseconds');
    return midpointDate.diff(dob, 'years', true);
}

// Calculates the height velocity
function calculateHeightVelocity(firstHeight, secondHeight, firstDate, secondDate) {
    const timeInterval = secondDate.diff(firstDate, 'years', true);

    // Check for zero or negative time interval
    if (timeInterval <= 0) {
        throw new Error("The time interval between measurements must be greater than zero.");
    }

    return (secondHeight - firstHeight) / timeInterval;
}

function toggleInfoBar() {
    var infoBar = document.getElementById("infoBar");
    var toggleButton = document.querySelector("button[onclick='toggleInfoBar()']");
    var toggleIcon = document.getElementById("toggleIcon");
  
    // Define the SVG icons for open and close states
    var openIcon = '<svg style="width: 20px; height: 7px; padding-left: 5px;" viewBox="0 0 12 8"><polygon points="1.4,7.4 0,6 6,0 12,6 10.6,7.4 6,2.8" fill="black"></polygon></svg>';
    var closeIcon = '<svg style="width: 20px; height: 7px; padding-left: 5px;" viewBox="0 0 12 8"><path d="M1.4.6L0 2l6 6 6-6L10.6.6 6 5.2" fill-rule="nonzero" fill="#fff"></path></svg>';
  
    if (infoBar.style.display === "none") {
        infoBar.style.display = "block";
        toggleIcon.innerHTML = closeIcon; // Set to close icon when opened
        toggleButton.classList.remove("closedButton");
        toggleButton.classList.add("openButton");
    } else {
        infoBar.style.display = "none";
        toggleIcon.innerHTML = openIcon; // Set to open icon when closed
        toggleButton.classList.remove("openButton");
        toggleButton.classList.add("closedButton");
    }
  }


/*
* CORE CALCULATIONS
*/

let lmsData = {
    male: [],
    female: []
};

//when on wordpress change fetch to `https://www.jackofallorgans.com/wp-content/plugins/medical-calculators/hv-calculator/${gender}.json`
async function loadLMSData(gender) {
    try {
        const response = await fetch(`${gender}.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        lmsData[gender] = await response.json();
    } catch (error) {
        console.error("Error loading LMS data:", error);
    }
}



function calculateZScore(heightVelocity, age, gender) {
    if (!lmsData[gender] || lmsData[gender].length === 0) {
        loadLMSData(gender);
    }

    const tolerance = 0.05; // Set a small tolerance level
    const exactAgeData = lmsData[gender].find(item => Math.abs(item.midpoint_age_range - age) < tolerance);

    let L, M, S;
    if (exactAgeData) {
        // Use LMS values directly from the data
        L = exactAgeData.L;
        M = exactAgeData.M;
        S = exactAgeData.S;
    } else {
        // Apply cubic interpolation
        const agePoints = findClosestAgePoints(age, lmsData[gender]);
        const lmsValues = agePoints.map(point => getLMSValuesForAgePoint(point, gender));
        const interpolatedValues = applyCubicInterpolation(age, agePoints, lmsValues);
        L = interpolatedValues.L;
        M = interpolatedValues.M;
        S = interpolatedValues.S;
    }

    return calculateZScoreUsingLMS(heightVelocity, L, M, S);
}



const calculatePercentileFromZScore = (z) => {
    if (z < -6.5) return 0.0;
    if (z > 6.5) return 1.0;
  
    let sum = 0;
    let term = 1;
    let k = 0;
    const loopStop = Math.exp(-23);
  
    while(Math.abs(term) > loopStop) {
        term = .3989422804 * Math.pow(-1, k) * Math.pow(z, k) / (2 * k + 1) / Math.pow(2, k) * Math.pow(z, k + 1) / factorial(k);
        sum += term;
        k++;
    }
  
    return 0.5 + sum;
  };


  const factorial = (n) => {
    let fact = 1;
    for (let i = 2; i <= n; i++) {
        fact *= i;
    }
    return fact;
  };



  function findClosestAgePoints(targetAge, data) {
    const sortedData = data.sort((a, b) => Math.abs(a.midpoint_age_range - targetAge) - Math.abs(b.midpoint_age_range - targetAge));
    return sortedData.slice(0, 4).map(item => item.midpoint_age_range);
}

function getLMSValuesForAgePoint(agePoint, gender) {
    const entry = lmsData[gender].find(item => item.midpoint_age_range === agePoint);
    return entry ? { L: entry.L, M: entry.M, S: entry.S } : null;
}

function applyCubicInterpolation(age, agePoints, lmsValues) {
    const interpolatedL = cubicInterpolation(age, agePoints, lmsValues.map(v => v.L));
    const interpolatedM = cubicInterpolation(age, agePoints, lmsValues.map(v => v.M));
    const interpolatedS = cubicInterpolation(age, agePoints, lmsValues.map(v => v.S));

    return { L: interpolatedL, M: interpolatedM, S: interpolatedS };
}

function cubicInterpolation(t, ts, ys) {
    let result = 0;
    for (let i = 0; i < ts.length; i++) {
        let term = ys[i];
        for (let j = 0; j < ts.length; j++) {
            if (j !== i) {
                term *= (t - ts[j]) / (ts[i] - ts[j]);
            }
        }
        result += term;
    }
    return result;
}

function calculateZScoreUsingLMS(heightVelocity, L, M, S) {
    if (L !== 0) {
        return ((Math.pow(heightVelocity / M, L) - 1) / (L * S)).toFixed(2);
    } else {
        return (Math.log(heightVelocity / M) / S).toFixed(2);
    }
}




/*
* VALIDATION
*/


// Display error messages
function displayErrors(errors) {
    const errorElement = document.getElementById('errorSection');
    errorElement.style.display = "block";
    errorElement.innerHTML = errors.join('<br>');
}

// Validates the heights
function validateHeights(firstHeight, secondHeight, errors) {
    if (!isValidHeight(firstHeight)) {
        errors.push("Please enter a valid positive number for the first height.");
    }
    if (!isValidHeight(secondHeight)) {
        errors.push("Please enter a valid positive number for the second height.");
    }
    if (isValidHeight(firstHeight) && isValidHeight(secondHeight) && secondHeight < firstHeight) {
        errors.push("Second height must be greater than or equal to the first height.");
    }
}

// Helper to check if height is valid
function isValidHeight(height) {
    return !isNaN(height) && height > 0;
}

// Processes and validates the dates
function processAndValidateDates(firstDateValue, secondDateValue, errors) {
    if (!firstDateValue || !secondDateValue) {
        if (!firstDateValue) errors.push("Please enter the first measurement date.");
        if (!secondDateValue) errors.push("Please enter the second measurement date.");
        return {};
    }

    const firstDate = moment(firstDateValue, "YYYY-MM-DD");
    const secondDate = moment(secondDateValue, "YYYY-MM-DD");

    if (!firstDate.isValid()) {
        errors.push("Please enter a valid date for the first measurement.");
    }
    if (!secondDate.isValid()) {
        errors.push("Please enter a valid date for the second measurement.");
    }
    if (firstDate.isValid() && secondDate.isValid() && secondDate.isBefore(firstDate)) {
        errors.push("Second date must be later than the first date.");
    }
    if (firstDate.isValid() && secondDate.isValid() && secondDate.isSame(firstDate)) {
        errors.push("The dates must not be the same.");
    }

    return { firstDate, secondDate };
}



/*
* EVENT LISTENERS
*/

// Event Listener for the Calculate button
document.getElementById('calculateButton').addEventListener('click', onCalculateHeightVelocityClick);

