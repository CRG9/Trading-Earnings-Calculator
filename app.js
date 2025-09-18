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
  if (n <= 0) return "Disabled";
  const lastTwoDigits = n % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${n}th Month`;
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
  if (isNaN(visibleInput.value)) {
    visibleInput.value = visibleInput.value.replace(/[^0-9.-]/g, "");
  }
  visibleInput.type = "number";
}

// --- Console Output Override ---
const originalConsoleLog = console.log;
console.log = function (message, onClickCallback) {
  originalConsoleLog(message);
  const p = document.createElement("p");
  p.style.padding = "0.25rem";

  if (typeof message === "string" && /<[a-z][\s\S]*>/i.test(message)) {
    p.innerHTML = message;
  } else {
    p.textContent = message;
  }

  if (onClickCallback && typeof onClickCallback === "function") {
    p.classList.add("clickable");
    if (isSummaryPrinting) p.classList.add("printing");
    p.addEventListener("click", () => {
      if (!isSummaryPrinting) onClickCallback();
    });
  }

  (activeView || outputDiv).appendChild(p);
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
  const parseOrDefault = (id, def, isFloat = true) => {
    const val = (isFloat ? parseFloat : parseInt)(
      document.getElementById(id).value,
      10
    );
    return isNaN(val) ? def : val;
  };
  const params = {
    startingBalance: parseOrDefault("account-balance", 25000),
    riskPerTrade: parseOrDefault("account-balance-risked-percent", 2) / 100,
    tradesPerWeek: parseOrDefault("trades-per-week", 5, false),
    winRate: parseOrDefault("win-rate", 50) / 100,
    riskToReward: parseOrDefault("risk-to-reward", 2),
    expensesBegin: parseOrDefault("expenses-begin-month", 0, false),
    totalMonthlyExpenses: parseOrDefault("total-monthly-expenses", 4000),
    simulationTimeline: parseOrDefault("timeline", 12, false),
    simulationRuns: parseOrDefault("simulation-runs", 100000, false),
    myFeePercentage: parseOrDefault("estimated-fee-percent", 3) / 100,
  };
  for (const key in params) {
    if (isNaN(params[key])) return "Error: Invalid non-numeric value entered.";
  }
  if (params.simulationRuns > 100000)
    return "Error: Runs cannot exceed 100,000.";
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

  // --- ROI Calculation Helper ---
  const calculateAnnualizedROI = (
    finalBalance,
    startingBalance,
    timelineMonths
  ) => {
    if (startingBalance <= 0 || timelineMonths <= 0) return 0;
    const totalReturn = (finalBalance - startingBalance) / startingBalance;
    const years = timelineMonths / 12;
    if (years <= 0) return totalReturn * 100;

    if (1 + totalReturn < 0) {
      return -(Math.pow(Math.abs(1 + totalReturn), 1 / years) - 1) * 100;
    }
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;
    return annualizedReturn * 100;
  };

  console.log("\n--- Running Monte Carlo Simulation ---");
  await delay(shortDelay);
  console.log(
    `Simulating ${params.simulationRuns.toLocaleString()} possible futures...`
  );
  console.log("");
  await delay(longDelay);

  const simulationResults = runMonteCarlo(params, params.simulationRuns);

  // --- CALCULATIONS ---
  simulationResults.sort((a, b) => a.finalBalance - b.finalBalance);

  const totalAverageBalance =
    simulationResults.reduce((sum, run) => sum + run.finalBalance, 0) /
    simulationResults.length;
  const worstCaseOfAll = simulationResults[0];
  const bestCaseOfAll = simulationResults[simulationResults.length - 1];
  const medianOfAll =
    simulationResults[Math.floor(simulationResults.length / 2)];
  const averageScenarioOfAll = simulationResults.reduce((prev, curr) =>
    Math.abs(curr.finalBalance - totalAverageBalance) <
    Math.abs(prev.finalBalance - totalAverageBalance)
      ? curr
      : prev
  );
  const survivingRuns = simulationResults.filter((run) => run.survived);
  const survivalRate = (survivingRuns.length / params.simulationRuns) * 100;
  const totalRuinCount = simulationResults.reduce(
    (count, run) => (run.finalBalance <= 0 ? count + 1 : count),
    0
  );
  const profitableCount = simulationResults.filter(
    (run) => run.finalBalance > params.startingBalance
  ).length;
  const losingCount = simulationResults.filter(
    (run) => run.finalBalance > 0 && run.finalBalance < params.startingBalance
  ).length;

  // --- ADAPTIVE HISTOGRAM CALCULATION ---
  const buckets = [];
  const totalRuns = simulationResults.length;
  if (totalRuns > 10) {
    const cutoffPercentile = 0.98;
    const numCoreBuckets = 9;
    const cutoffIndex = Math.floor(totalRuns * cutoffPercentile);
    const maxBalanceForBuckets = simulationResults[cutoffIndex].finalBalance;
    const minBalance = worstCaseOfAll.finalBalance;
    const coreRange = maxBalanceForBuckets - minBalance;

    if (coreRange > 0) {
      for (let i = 0; i < numCoreBuckets; i++) {
        const bucketMin = minBalance + i * (coreRange / numCoreBuckets);
        buckets.push({
          min: bucketMin,
          max: bucketMin + coreRange / numCoreBuckets,
          count: 0,
          runs: [],
        });
      }
      const outlierBucket = {
        min: maxBalanceForBuckets,
        max: bestCaseOfAll.finalBalance,
        count: 0,
        runs: [],
        isOutlierBucket: true,
      };

      for (const run of simulationResults) {
        if (run.finalBalance < maxBalanceForBuckets) {
          const bucketIndex = Math.min(
            numCoreBuckets - 1,
            Math.floor(
              (run.finalBalance - minBalance) / (coreRange / numCoreBuckets)
            )
          );
          if (buckets[bucketIndex]) {
            buckets[bucketIndex].runs.push(run);
            buckets[bucketIndex].count++;
          }
        } else {
          outlierBucket.runs.push(run);
          outlierBucket.count++;
        }
      }

      if (outlierBucket.count > 0) {
        buckets.push(outlierBucket);
      }

      for (const bucket of buckets) {
        bucket.percentage = (bucket.count / totalRuns) * 100;
        if (bucket.count > 0) {
          const roiValues = bucket.runs.map((run) =>
            calculateAnnualizedROI(
              run.finalBalance,
              params.startingBalance,
              params.simulationTimeline
            )
          );
          const minROI = Math.min(...roiValues);
          const maxROI = Math.max(...roiValues);
          if (minROI.toFixed(1) === maxROI.toFixed(1)) {
            bucket.roiRange = `${minROI.toLocaleString("en-US", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}%`;
          } else {
            bucket.roiRange = `${minROI.toLocaleString("en-US", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}% to ${maxROI.toLocaleString("en-US", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}%`;
          }
        }
      }
    }
  }

  // --- [UPDATED] Helper for monthly breakdown ---
  async function displayMonthlyBreakdown(title, monthlyData) {
    if (isViewTransitioning) return;
    isViewTransitioning = true;

    // --- Immediate Feedback ---
    detailsView.innerHTML = "";
    activeView = detailsView;
    summaryView.style.display = "none";
    detailsView.style.display = "block";
    console.log(`\n--- Loading Details: ${title} ---`);
    await delay(shortDelay); // Allow loading message to render
    detailsView.innerHTML = ""; // Clear loading message
    // -------------------------

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

    isViewTransitioning = false;
  }

  // --- [UPDATED] Helper for bucket distribution ---
  async function displayBucketDistribution(title, bucketRuns) {
    if (isViewTransitioning) return;
    isViewTransitioning = true;

    // --- Immediate Feedback ---
    detailsView.innerHTML = "";
    activeView = detailsView;
    summaryView.style.display = "none";
    detailsView.style.display = "block";
    console.log(`\n--- Loading Drill-Down: ${title} ---`);
    await delay(shortDelay); // Allow loading message to render
    detailsView.innerHTML = ""; // Clear loading message
    // -------------------------

    console.log(`\n--- ${title} ---`);
    await delay(longDelay);

    const subBuckets = [];
    const numSubBuckets = 10;
    const min = bucketRuns[0].finalBalance;
    const max = bucketRuns[bucketRuns.length - 1].finalBalance;
    const range = max - min;

    if (range > 0 && bucketRuns.length > 1) {
      const subBucketSize = range / numSubBuckets;
      for (let i = 0; i < numSubBuckets; i++) {
        subBuckets.push({
          min: min + i * subBucketSize,
          max: min + (i + 1) * subBucketSize,
          count: 0,
        });
      }
      for (const run of bucketRuns) {
        const bucketIndex = Math.min(
          numSubBuckets - 1,
          Math.floor((run.finalBalance - min) / subBucketSize)
        );
        if (subBuckets[bucketIndex]) subBuckets[bucketIndex].count++;
      }

      let maxSubPercentage = 0;
      for (const sb of subBuckets) {
        sb.percentage = (sb.count / bucketRuns.length) * 100;
        if (sb.percentage > maxSubPercentage) maxSubPercentage = sb.percentage;
      }

      subBuckets.sort((a, b) => b.percentage - a.percentage);

      for (const sb of subBuckets) {
        if (sb.count > 0) {
          let color;
          let fontWeight = "normal";
          if (sb.percentage >= maxSubPercentage * 0.66) {
            color = "#28a745";
            fontWeight = "bold";
          } else if (sb.percentage >= maxSubPercentage * 0.33) {
            color = "#ffc107";
          } else {
            color = "#dc3545";
          }

          const htmlMessage = `$${formatConsoleCurrency(
            sb.min
          )} - $${formatConsoleCurrency(
            sb.max
          )}: ${sb.count.toLocaleString()} Simulations (<span style="color: ${color}; font-weight: ${fontWeight};">${sb.percentage.toFixed(
            2
          )}%</span>)`;
          console.log(htmlMessage);
          await delay(shortDelay);
        }
      }
    } else {
      console.log(
        `All ${bucketRuns.length.toLocaleString()} simulations in this bucket had a final balance of ${formatVisibleCurrency(
          min
        )}.`
      );
    }

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

    isViewTransitioning = false;
  }

  console.log("\n--- Monte Carlo Simulation Results ---");
  isSummaryPrinting = true;
  await delay(longDelay);

  console.log(
    `Survival Rate: ${survivalRate.toFixed(
      2
    )}% (${survivingRuns.length.toLocaleString()} runs) were solvent.`
  );
  await delay(shortDelay);
  console.log(
    `Profitable Simulations: ${(
      (profitableCount / params.simulationRuns) *
      100
    ).toFixed(
      2
    )}% (${profitableCount.toLocaleString()} runs) ended above the initial balance.`
  );
  await delay(shortDelay);
  console.log(
    `Simulations with a Loss: ${(
      (losingCount / params.simulationRuns) *
      100
    ).toFixed(
      2
    )}% (${losingCount.toLocaleString()} runs) ended below the initial balance but were not ruined.`
  );
  await delay(shortDelay);
  console.log(
    `Total Ruined Simulations: ${(
      (totalRuinCount / params.simulationRuns) *
      100
    ).toFixed(2)}% of simulations (${totalRuinCount} runs) went to $0 or less.`
  );
  await delay(shortDelay);

  // --- DISPLAY OUTCOME DISTRIBUTION ---
  if (buckets.length > 0) {
    let maxPercentage = Math.max(...buckets.map((b) => b.percentage));
    console.log("");
    console.log("\n--- Outcome Distribution ---");
    await delay(longDelay);

    buckets.sort((a, b) => b.percentage - a.percentage);

    for (const bucket of buckets) {
      if (bucket.count > 0) {
        let color;
        let fontWeight = "normal";

        if (bucket.percentage >= maxPercentage * 0.66) {
          color = "#28a745";
          fontWeight = "bold";
        } else if (bucket.percentage >= maxPercentage * 0.33) {
          color = "#ffc107";
        } else {
          color = "#dc3545";
        }

        const rangeText = bucket.isOutlierBucket
          ? `$${formatConsoleCurrency(bucket.min)}+`
          : `$${formatConsoleCurrency(bucket.min)} - $${formatConsoleCurrency(
              bucket.max
            )}`;

        const htmlMessage = `${rangeText}: ${bucket.count.toLocaleString()} Simulations (<span style="color: ${color}; font-weight: ${fontWeight};">${bucket.percentage.toFixed(
          2
        )}%</span>) | ROI: ${bucket.roiRange} Ann.`;

        if (bucket.percentage >= 25 && bucket.runs.length > 1) {
          console.log(htmlMessage, () =>
            displayBucketDistribution(
              `Distribution for ${rangeText}`,
              bucket.runs
            )
          );
        } else {
          console.log(htmlMessage);
        }
        await delay(shortDelay);
      }
    }
  }

  // --- CLICKABLE SCENARIO DETAILS ---
  console.log("");
  await delay(longDelay);

  if (averageScenarioOfAll) {
    console.log(
      `\nAverage Final Balance (all runs): ${formatVisibleCurrency(
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
    console.log("");
    await delay(longDelay);
  }

  isSummaryPrinting = false;
  outputDiv
    .querySelectorAll(".clickable.printing")
    .forEach((el) => el.classList.remove("printing"));
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
