/**
 * Calculates the estimated monthly profit from a trading strategy with fees.
 * This version uses a geometric compounding formula for a more realistic projection.
 *
 * @param {number} accountBalance The starting account balance (e.g., 10000).
 * @param {number} riskPercentage The percentage of the current balance to risk per trade (e.g., 0.02 for 2%).
 * @param {number} tradesPerWeek The average number of trades taken per week (e.g., 5).
 * @param {number} winPercentage The historical win rate of the strategy (e.g., 0.60 for 60%).
 * @param {number} riskToRewardRatio The strategy's risk-to-reward ratio (e.g., 2 for 1:2).
 * @param {number} feeAsPercentageOfRisk The broker fee expressed as a percentage of the amount risked (e.g., 0.014 for 1.4%).
 * @returns {number} The estimated net profit for the month.
 */
export function calculateMonthlyProfit(
  accountBalance,
  riskPercentage,
  tradesPerWeek,
  winPercentage,
  riskToRewardRatio,
  feeAsPercentageOfRisk
) {
  const tradesPerMonth = tradesPerWeek * 4;
  const tradesWon = tradesPerMonth * winPercentage;
  const tradesLost = tradesPerMonth - tradesWon;

  // Calculate the growth factor for a winning trade
  // Profit is (Risk * RR) - (Fee)
  const winFactor = 1 + riskPercentage * (riskToRewardRatio - feeAsPercentageOfRisk);

  // Calculate the decay factor for a losing trade
  // Loss is (Risk) + (Fee)
  const lossFactor = 1 - riskPercentage * (1 + feeAsPercentageOfRisk);

  // Apply the compounding effect of all wins and losses
  const finalBalance =
    accountBalance * Math.pow(winFactor, tradesWon) * Math.pow(lossFactor, tradesLost);

  // Return the net profit after all trades and fees
  return finalBalance - accountBalance;
}

/**
 * Simulates 12 months of trading, factoring in monthly expenses.
 * @param {number} monthlyExpenses - The total fixed expenses for one month.
 * @param {number} expensesBegin - The month index (0-11) when expenses start.
 * @returns {number[]} An array containing 12 months of net profit data.
 */

export function annualizeProfits(
    startingBalance,
    riskPercentage,
    tradesPerWeek,
    winPercentage,
    riskToRewardRatio,
    monthlyExpenses,
    expensesBegin,
    simulationTimeline,
    myFeePercentage
) {
    let currentBalance = startingBalance;
    const resultsArray = [];

    for (let i = 0; i < simulationTimeline; i++) {
        const grossMonthlyProfit = calculateMonthlyProfit(
            currentBalance,
            riskPercentage,
            tradesPerWeek,
            winPercentage,
            riskToRewardRatio,
            myFeePercentage
        );

        let netMonthlyProfit;
        if (expensesBegin >= 1 && i + 1 >= expensesBegin) {
            netMonthlyProfit = grossMonthlyProfit - monthlyExpenses;
        } else {
            netMonthlyProfit = grossMonthlyProfit;
        }

        // --- CHANGE IS HERE ---
        // 1. Calculate the specific expenses deducted this month.
        const expensesDeducted = grossMonthlyProfit - netMonthlyProfit;

        // 2. Update the balance with the net profit.
        currentBalance += netMonthlyProfit;

        // 3. Add expensesDeducted to the object we return.
        resultsArray.push({
            grossProfit: grossMonthlyProfit,
            expensesDeducted: expensesDeducted, // Added this line
            netProfit: netMonthlyProfit,
            endBalance: currentBalance
        });

        if (currentBalance <= 0) {
            break;
        }
    }

    return resultsArray;
}



