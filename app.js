// 1. Import the main simulation function from your logic file.
import { runMonteCarlo } from "./main.js";

// --- Global DOM Elements & Helpers ---
const outputDiv = document.getElementById("simulator-embed");
const simulationButton = document.getElementById("run-simulation");
const inputsToFormat = document.querySelectorAll(
  "#account-balance-visible, #win-rate-visible, #risk-to-reward-visible, #estimated-fee-percent-visible, #account-balance-risked-percent-visible, #total-monthly-expenses-visible, #expenses-begin-month-visible, #timeline-visible, #simulation-runs-visible"
);

// --- A global variable to direct console output ---
let activeView;
let isSummaryPrinting = false;

// --- DELAY HELPER ---
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// --- FORMATTING HELPERS ---
const formatConsoleCurrency = (number) => {
  return number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatVisibleCurrency = (number) => {
  return number.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
};

const formatMonthOrdinal = (n) => {
  // Handle the 'Disabled' case for 0 or any negative number
  if (n <= 0) {
    return "Disabled";
  }

  const lastTwoDigits = n % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${n}th Month`;
  }

  const lastDigit = n % 10;
  switch (lastDigit) {
    case 1:
      return `${n}st Month`;
    case 2:
      return `${n}nd Month`;
    case 3:
      return `${n}rd Month`;
    default:
      return `${n}th Month`;
  }
};

function unformatForEditing(event) {
  const visibleInput = event.target;

  // Only change the value if it's not already a plain number
  if (isNaN(visibleInput.value)) {
    const cleanValue = visibleInput.value.replace(/[^0-9.-]/g, "");
    visibleInput.value = cleanValue;
  }

  // Switch to number type for better input experience (e.g., number pad on mobile)
  visibleInput.type = "number";
}

// --- Console Output Override ---
const originalConsoleLog = console.log;
console.log = function (message, onClickCallback) {
  originalConsoleLog(message);
  const p = document.createElement("p");
  p.textContent = message;
  p.style.padding = "0.25rem";

  if (onClickCallback && typeof onClickCallback === "function") {
    p.classList.add("clickable");

    // If the summary is printing, add a class for visual feedback
    if (isSummaryPrinting) {
      p.classList.add("printing");
    }

    // Only allow the click to work if printing is finished
    p.addEventListener("click", () => {
      if (!isSummaryPrinting) {
        onClickCallback();
      }
    });
  }

  if (activeView) {
    activeView.appendChild(p);
  } else {
    outputDiv.appendChild(p);
  }

  outputDiv.scrollTop = outputDiv.scrollHeight;
};

// --- Input Formatting and Syncing Logic ---
function updateAndFormatInput(event) {
  const visibleInput = event.target;
  visibleInput.type = "text";

  const hiddenInput = document.getElementById(
    visibleInput.id.replace("-visible", "")
  );

  if (!hiddenInput) return;

  const cleanValue = visibleInput.value.replace(/[^0-9.-]/g, "");
  hiddenInput.value = cleanValue;

  if (cleanValue) {
    const numberValue = parseFloat(cleanValue);
    let formattedValue = numberValue;

    switch (visibleInput.id) {
      case "account-balance-visible":
      case "total-monthly-expenses-visible":
        formattedValue = formatVisibleCurrency(numberValue);
        break;
      case "win-rate-visible":
      case "estimated-fee-percent-visible":
      case "account-balance-risked-percent-visible":
        formattedValue = `${numberValue}%`;
        break;
      case "risk-to-reward-visible":
        formattedValue = `1:${numberValue}`;
        break;
      case "expenses-begin-month-visible":
        formattedValue = formatMonthOrdinal(numberValue);
        break;
      case "timeline-visible":
        formattedValue =
          numberValue === 1 ? "1 Month" : `${numberValue} Months`;
        break;
      case "simulation-runs-visible":
        formattedValue =
          numberValue === 1 ? "1 Run" : `${numberValue.toLocaleString()} Runs`;
        break;
    }
    visibleInput.value = formattedValue;
  }
}

inputsToFormat.forEach((input) => {
  input.addEventListener("blur", updateAndFormatInput);
  input.addEventListener("focus", unformatForEditing);
});

// --- Data Gathering & Validation ---
function getAndValidateInputs() {
  // Helper function to parse and apply defaults correctly
  const parseOrDefault = (elementId, defaultValue, isFloat = true) => {
    const element = document.getElementById(elementId);
    const value = isFloat
      ? parseFloat(element.value)
      : parseInt(element.value, 10);
    return isNaN(value) ? defaultValue : value;
  };

  const params = {
    startingBalance: parseOrDefault("account-balance", 25000),
    riskPerTrade: parseOrDefault("account-balance-risked-percent", 2) / 100,
    tradesPerWeek: parseOrDefault("trades-per-week", 10, false),
    winRate: parseOrDefault("win-rate", 50) / 100,
    riskToReward: parseOrDefault("risk-to-reward", 2),
    expensesBegin: parseOrDefault("expenses-begin-month", 4, false),
    totalMonthlyExpenses: parseOrDefault("total-monthly-expenses", 4000),
    simulationTimeline: parseOrDefault("timeline", 1, false),
    simulationRuns: parseOrDefault("simulation-runs", 1000, false),
    myFeePercentage: parseOrDefault("estimated-fee-percent", 3) / 100,
  };

  // This final check remains as a safeguard
  for (const key in params) {
    if (isNaN(params[key])) {
      return "Error: An invalid non-numeric value was entered in one of the fields.";
    }
  }

  if (params.simulationRuns > 100000) {
    return "Error: Number of simulation runs cannot exceed 100,000.";
  }

  return params;
}

// --- Main Simulation Function ---
async function runSimulation() {
  simulationButton.disabled = true;
  outputDiv.innerHTML = "";

  const summaryView = document.createElement("div");
  const detailsView = document.createElement("div");
  detailsView.style.display = "none";
  outputDiv.appendChild(summaryView);
  outputDiv.appendChild(detailsView);
  activeView = summaryView;
  let isViewTransitioning = false;
  const shortDelay = 400;
  const longDelay = 800;

  const validationResult = getAndValidateInputs();

  if (typeof validationResult === "string") {
    console.log("\n--- Simulation Aborted ---");
    await delay(shortDelay);
    console.log(validationResult);
    simulationButton.disabled = false;
    return;
  }

  const params = validationResult;

  console.log("\n--- Running Monte Carlo Simulation ---");
  await delay(shortDelay);
  console.log(
    `Simulating ${params.simulationRuns.toLocaleString()} possible futures...`
  );
  await delay(longDelay);

  const simulationResults = runMonteCarlo(params, params.simulationRuns);

  // --- CALCULATIONS ON ALL RUNS (INCLUDING FAILURES) ---
  // Sort all results by final balance to find median, best, and worst of ALL outcomes.
  simulationResults.sort((a, b) => a.finalBalance - b.finalBalance);

  const allFinalBalances = simulationResults.map((run) => run.finalBalance);
  const totalAverageBalance =
    allFinalBalances.reduce((sum, val) => sum + val, 0) /
    allFinalBalances.length;

  // Worst case is now the first item of the comprehensive, sorted list (often $0).
  const worstCaseOfAll = simulationResults[0];
  const bestCaseOfAll = simulationResults[simulationResults.length - 1];
  const medianOfAll =
    simulationResults[Math.floor(simulationResults.length / 2)];

  // Find the scenario closest to the new, comprehensive average.
  const averageScenarioOfAll = simulationResults.reduce((prev, curr) =>
    Math.abs(curr.finalBalance - totalAverageBalance) <
    Math.abs(prev.finalBalance - totalAverageBalance)
      ? curr
      : prev
  );

  // --- CALCULATIONS FOR SURVIVING RUNS (for survival rate) ---
  const survivingRuns = simulationResults.filter((run) => run.survived);
  const survivalRate = (survivingRuns.length / params.simulationRuns) * 100;

  // Count up the number of simulations that went to $0 or less (total ruin).
  const totalRuinCount = simulationResults.reduce(
    (count, run) => (run.finalBalance <= 0 ? count + 1 : count),
    0
  );

  // Count up the number of simulations that finished above the initial balance.
  // This assumes 'params.startingBalance' holds the starting value.
  const profitableCount = simulationResults.reduce(
    (count, run) =>
      run.finalBalance > params.startingBalance ? count + 1 : count,
    0
  );

  // Find the mode (most frequent final balance) and its frequency.
  // This uses the 'allFinalBalances' array calculated in the previous snippet.
  const balanceFrequencies = allFinalBalances.reduce((freqMap, balance) => {
    freqMap.set(balance, (freqMap.get(balance) || 0) + 1);
    return freqMap;
  }, new Map());

  let modeFinalBalance = null;
  let modeFrequency = 0;
  for (const [balance, count] of balanceFrequencies.entries()) {
    if (count > modeFrequency) {
      modeFrequency = count;
      modeFinalBalance = balance;
    }
  }

  // --- Helper function for displaying drill-down details ---
  async function displayMonthlyBreakdown(title, monthlyData) {
    if (isViewTransitioning) return;
    isViewTransitioning = true;

    detailsView.innerHTML = "";
    activeView = detailsView;

    console.log(`\n--- ${title} ---`);
    await delay(longDelay);

    for (const [index, monthData] of monthlyData.entries()) {
      const grossText = `Trade Profit: $${formatConsoleCurrency(
        monthData.grossProfit
      )}`;
      const expenseText = `| Expenses: $${formatConsoleCurrency(
        monthData.expensesDeducted
      )}`;
      const netText = `| Net Profit: $${formatConsoleCurrency(
        monthData.netProfit
      )}`;
      const balanceText = `| Ending Balance: $${formatConsoleCurrency(
        monthData.endBalance
      )}`;
      console.log(
        `Month ${index + 1}: ${grossText.padEnd(25)} ${expenseText.padEnd(
          25
        )} ${netText.padEnd(25)} ${balanceText}`
      );
      await delay(100);
    }

    // --- NEW: Calculate and display the summary for this specific scenario ---
    console.log("\n--- Scenario Summary ---");
    await delay(longDelay);

    const totalGrossProfit = monthlyData.reduce(
      (sum, month) => sum + month.grossProfit,
      0
    );
    const totalExpenses = monthlyData.reduce(
      (sum, month) => sum + month.expensesDeducted,
      0
    );
    const finalBalance =
      monthlyData.length > 0
        ? monthlyData[monthlyData.length - 1].endBalance
        : 0;

    console.log(
      `Total Trading Profits: $${formatConsoleCurrency(totalGrossProfit)}`
    );
    await delay(shortDelay);
    console.log(
      `Total Deducted Expenses: $${formatConsoleCurrency(totalExpenses)}`
    );
    await delay(shortDelay);
    console.log(
      `Final Account Balance: $${formatConsoleCurrency(finalBalance)}`
    );

    await delay(longDelay);
    console.log("\n« Return to Summary", () => {
      if (isViewTransitioning) return;
      isViewTransitioning = true;
      detailsView.style.display = "none";
      summaryView.style.display = "block";
      activeView = summaryView;
      setTimeout(() => {
        isViewTransitioning = false;
      }, 100);
    });

    summaryView.style.display = "none";
    detailsView.style.display = "block";
    isViewTransitioning = false;
  }

  console.log("\n--- Monte Carlo Simulation Results ---");
  isSummaryPrinting = true; // LOCK: Prevent clicks while printing
  await delay(longDelay);

  console.log(
    `Survival Rate: ${survivalRate.toFixed(2)}% of simulations were solvent.`
  );
  await delay(shortDelay);

  console.log(
    `Total Ruined Simulations: ${((totalRuinCount / params.simulationRuns)*100).toFixed(2)}% of simulations (${totalRuinCount} runs) went to $0 or less.`);
  await delay(shortDelay);  

  // --- UPDATE CONSOLE LOGS TO USE THE NEW COMPREHENSIVE VARIABLES ---
  if (averageScenarioOfAll) {
    console.log(
      `Average Final Balance (all runs): ${formatVisibleCurrency(
        totalAverageBalance
      )}`,
      () =>
        displayMonthlyBreakdown(
          "Details for Average Scenario",
          averageScenarioOfAll.monthlyData
        )
    );
    await delay(shortDelay);
  }
  if (medianOfAll) {
    console.log(
      `Median Final Balance (all runs): ${formatVisibleCurrency(
        medianOfAll.finalBalance
      )} (50% of outcomes were better, 50% were worse)`,
      () =>
        displayMonthlyBreakdown(
          "Details for Median Scenario",
          medianOfAll.monthlyData
        )
    );
    await delay(shortDelay);
  }

  if (bestCaseOfAll) {
    console.log(
      `Best Case Scenario: ${formatVisibleCurrency(
        bestCaseOfAll.finalBalance
      )}`,
      () =>
        displayMonthlyBreakdown(
          "Details for Best Case Scenario",
          bestCaseOfAll.monthlyData
        )
    );
    await delay(shortDelay);
  }
  if (worstCaseOfAll) {
    // This will now correctly show the worst case, which is often a balance of $0
    console.log(
      `Worst Case Scenario: ${formatVisibleCurrency(
        worstCaseOfAll.finalBalance
      )}`,
      () =>
        displayMonthlyBreakdown(
          "Details for Worst Case Scenario",
          worstCaseOfAll.monthlyData
        )
    );
    await delay(longDelay);
  }

  // UNLOCK: Clicks are now enabled
  isSummaryPrinting = false;
  // Update visuals to show the links are active
  outputDiv.querySelectorAll(".clickable.printing").forEach((el) => {
    el.classList.remove("printing");
  });

  console.log("\n--- Simulation Complete ---");
  simulationButton.disabled = false;
}

// --- Event Listener & Display ---
(async () => {
  const initialView = document.createElement("div");
  outputDiv.appendChild(initialView);
  activeView = initialView;

  console.log("\nBooting Up Monte Carlo Simulator...");
  await delay(1000);
  console.log("Please enter your inputs then press the button.");
})();

simulationButton.addEventListener("click", runSimulation);
