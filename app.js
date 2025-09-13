// 1. Import the main simulation function from your logic file.
import { runMonteCarlo } from './main.js';

// --- Global DOM Elements & Helpers ---
const outputDiv = document.getElementById('simulator-embed');
const simulationButton = document.getElementById('run-simulation');
const inputsToFormat = document.querySelectorAll('#account-balance-visible, #win-rate-visible, #risk-to-reward-visible, #estimated-fee-percent-visible, #account-balance-risked-percent-visible, #total-monthly-expenses-visible, #expenses-begin-month-visible, #timeline-visible, #simulation-runs-visible');

// --- DELAY HELPER ---
const delay = ms => new Promise(res => setTimeout(res, ms));

// --- FORMATTING HELPERS ---
const formatConsoleCurrency = (number) => {
    return number.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatVisibleCurrency = (number) => {
    return number.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });
};

// --- Console Output Override ---
const originalConsoleLog = console.log;
console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    const p = document.createElement('p');
    p.textContent = args.join(' ');
    p.style.padding = '0.25rem';
    outputDiv.appendChild(p);
    // Auto-scroll to the bottom
    outputDiv.scrollTop = outputDiv.scrollHeight;
};

// --- Input Formatting and Syncing Logic ---
function updateAndFormatInput(event) {
    const visibleInput = event.target;
    const hiddenInput = document.getElementById(visibleInput.id.replace('-visible', ''));

    if (!hiddenInput) return;

    const cleanValue = visibleInput.value.replace(/[^0-9.-]/g, '');
    hiddenInput.value = cleanValue;

    if (cleanValue) {
        const numberValue = parseFloat(cleanValue);
        let formattedValue = numberValue;

        switch (visibleInput.id) {
            case 'account-balance-visible':
            case 'total-monthly-expenses-visible':
                formattedValue = formatVisibleCurrency(numberValue);
                break;
            case 'win-rate-visible':
            case 'estimated-fee-percent-visible':
            case 'account-balance-risked-percent-visible':
                formattedValue = `${numberValue}%`;
                break;
            case 'risk-to-reward-visible':
                formattedValue = `1:${numberValue}`;
                break;
            case 'expenses-begin-month-visible':
                formattedValue = (numberValue === -1) ? 'Disabled' : `${numberValue} Month`;
                break;
            case 'timeline-visible':
                formattedValue = (numberValue === 1) ? '1 Month' : `${numberValue} Months`;
                break;
            case 'simulation-runs-visible':
                formattedValue = (numberValue === 1) ? '1 Run' : `${numberValue.toLocaleString()} Runs`;
                break;
        }
        visibleInput.value = formattedValue;
    }
}

inputsToFormat.forEach(input => {
    input.addEventListener('blur', updateAndFormatInput);
});

// --- Data Gathering & Validation ---
function getAndValidateInputs() {
    const params = {
        startingBalance: parseFloat(document.getElementById('account-balance').value),
        riskPerTrade: parseFloat(document.getElementById('account-balance-risked-percent').value) / 100,
        tradesPerWeek: parseInt(document.getElementById('trades-per-week').value, 10),
        winRate: parseFloat(document.getElementById('win-rate').value) / 100,
        riskToReward: parseFloat(document.getElementById('risk-to-reward').value),
        expensesBegin: parseInt(document.getElementById('expenses-begin-month').value, 10),
        totalMonthlyExpenses: parseFloat(document.getElementById('total-monthly-expenses').value),
        simulationTimeline: parseInt(document.getElementById('timeline').value, 10),
        simulationRuns: parseInt(document.getElementById('simulation-runs').value, 10),
        myFeePercentage: parseFloat(document.getElementById('estimated-fee-percent').value) / 100,
    };

    for (const key in params) {
        if (isNaN(params[key])) {
            return null;
        }
    }
    return params;
}

// --- Main Simulation Function ---
async function runSimulation() {
    simulationButton.disabled = true;
    outputDiv.innerHTML = '';
    
    const shortDelay = 400;
    const longDelay = 800;

    const params = getAndValidateInputs();

    if (params === null) {
        console.log("\n--- Simulation Aborted ---");
        await delay(shortDelay);
        console.log("Error: Please ensure all fields are filled out with valid numbers.");
        simulationButton.disabled = false;
        return;
    }

    console.log("\n--- Running Monte Carlo Simulation ---");
    await delay(shortDelay);
    console.log(`Simulating ${params.simulationRuns.toLocaleString()} possible futures...`);
    await delay(longDelay);

    // --- MONTE CARLO EXECUTION ---
    const simulationResults = runMonteCarlo(params, params.simulationRuns);

    // --- MONTE CARLO ANALYSIS ---
    const survivingRuns = simulationResults.filter(run => run.survived);
    const survivalRate = (survivingRuns.length / params.simulationRuns) * 100;
    
    let averageBalance = 0;
    let medianBalance = 0;
    let bestCase = 0;
    let worstCase = 0;

    if (survivingRuns.length > 0) {
        const finalBalances = survivingRuns.map(run => run.finalBalance).sort((a, b) => a - b);
        averageBalance = finalBalances.reduce((sum, val) => sum + val, 0) / finalBalances.length;
        medianBalance = finalBalances[Math.floor(finalBalances.length / 2)];
        bestCase = finalBalances[finalBalances.length - 1];
        worstCase = finalBalances[0];
    }
    
    // --- DISPLAY STATISTICAL RESULTS ---
    console.log("\n--- Monte Carlo Simulation Results ---");
    await delay(longDelay);

    console.log(`Survival Rate: ${survivalRate.toFixed(2)}% of simulations were profitable or solvent.`);
    await delay(shortDelay);

    console.log(`Average Final Balance: ${formatVisibleCurrency(averageBalance)}`);
    await delay(shortDelay);
    
    console.log(`Median Final Balance: ${formatVisibleCurrency(medianBalance)} (50% of outcomes were better, 50% were worse)`);
    await delay(shortDelay);

    console.log(`Best Case Scenario: ${formatVisibleCurrency(bestCase)}`);
    await delay(shortDelay);

    console.log(`Worst Case (surviving): ${formatVisibleCurrency(worstCase)}`);
    await delay(longDelay);

    console.log("\n--- Simulation Complete ---");
    simulationButton.disabled = false;
}


// --- Event Listener & Initial Display ---
(async () => {
    console.log("\nBooting Up Monte Carlo Simulator...");
    await delay(1000);
    console.log("Please enter your inputs then press the button.");
})();

simulationButton.addEventListener('click', runSimulation);