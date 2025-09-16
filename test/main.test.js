const { expect } = require("chai");
const { calculateMonthlyProfit, accumulateProfits, runMonteCarlo } = require("../main.js");

describe("testing the components of the calculateMonthlyProfit function", () => {
  it("calculating profit after period of 100% successful trading", () => {
    //setup
    let accountBalance = 5000;
    let riskPercentage = 0.02;
    let tradesPerWeek = 1;
    let winPercentage = 1;
    let riskToRewardRatio = 2;
    let feeAsPercentageOfRisk = 0.03;

    //exercise
    const profit = calculateMonthlyProfit(
      accountBalance,
      riskPercentage,
      tradesPerWeek,
      winPercentage,
      riskToRewardRatio,
      feeAsPercentageOfRisk
    );

    //verify
    expect(profit).to.be.closeTo(835.81, 1);
  });

  it("calculating new account balance after period of 100% successful trading", () => {
    //setup
    let accountBalance = 5000;
    let riskPercentage = 0.02;
    let tradesPerWeek = 1;
    let winPercentage = 1;
    let riskToRewardRatio = 2;
    let feeAsPercentageOfRisk = 0.03;

    //exercise
    const profit = calculateMonthlyProfit(
      accountBalance,
      riskPercentage,
      tradesPerWeek,
      winPercentage,
      riskToRewardRatio,
      feeAsPercentageOfRisk
    );

    //verify
    expect(profit + accountBalance).to.be.closeTo(835.81 + accountBalance, 1);
  });

  it("calculating loss after period of 100% unsuccessful trading", () => {
    //setup
    let accountBalance = 5000;
    let riskPercentage = 0.02;
    let tradesPerWeek = 1;
    let winPercentage = 0;
    let riskToRewardRatio = 2;
    let feeAsPercentageOfRisk = 0.03;

    //exercise
    const loss = calculateMonthlyProfit(
      accountBalance,
      riskPercentage,
      tradesPerWeek,
      winPercentage,
      riskToRewardRatio,
      feeAsPercentageOfRisk
    );

    //verify
    expect(loss).to.be.closeTo(-399.54, 1);
  });

  it("calculating new account balance after period of 100% unsuccessful trading", () => {
    //setup
    let accountBalance = 5000;
    let riskPercentage = 0.02;
    let tradesPerWeek = 1;
    let winPercentage = 0;
    let riskToRewardRatio = 2;
    let feeAsPercentageOfRisk = 0.03;

    //exercise
    const loss = calculateMonthlyProfit(
      accountBalance,
      riskPercentage,
      tradesPerWeek,
      winPercentage,
      riskToRewardRatio,
      feeAsPercentageOfRisk
    );

    //verify
    expect(loss + accountBalance).to.be.closeTo(-399.56 + accountBalance, 1);
  });

  it("confirming the win-loss randomization checks in calculateMonthlyProfit function", () => {
    //setup
    let winPercentage = 0.5;
    let lesserRandomizedValue = winPercentage - 0.01;
    let greaterRandomizedValue = winPercentage + 0.01;
    let amountRisked = 100;
    let riskToRewardRatio = 2;
    let feeAsPercentageOfRisk = 0.03;
    let currentBalance1 = 5000;
    let currentBalance2 = 5000;

    //exercise

    //Win because win percentage is greater than randomized value
    if (lesserRandomizedValue < winPercentage) {
      const profit =
        amountRisked * riskToRewardRatio - amountRisked * feeAsPercentageOfRisk;
      currentBalance1 += profit;
    } else {
      const loss = amountRisked + amountRisked * feeAsPercentageOfRisk;
      currentBalance1 -= loss;
    }

    //Loss because win percentage is lower than randomized value
    if (greaterRandomizedValue < winPercentage) {
      const profit =
        amountRisked * riskToRewardRatio - amountRisked * feeAsPercentageOfRisk;
      currentBalance2 += profit;
    } else {
      const loss = amountRisked + amountRisked * feeAsPercentageOfRisk;
      currentBalance2 -= loss;
    }

    //verify
    expect(currentBalance1).to.be.greaterThan(5000);
    expect(currentBalance2).to.be.lessThan(5000);
  });

  it("ensuring calculateMonthlyProfit function stops if the account balance falls below zero", () => {
    //setup
    let accountBalance = 2500;
    let currentBalance = accountBalance;
    const tradesPerWeek = 5;
    const tradesPerMonth = tradesPerWeek * 4;

    //exercise
    let i;
    for (i = 0; i < tradesPerMonth; i++) {
      if (currentBalance <= 0) {
        break;
      } else {
        currentBalance -= 500;
      }
    }

    //verify
    expect(i).to.be.lessThan(6);
  });
});

describe("testing the function of the accumulateProfits function", () => {
  it("ensuring the resultsArray.length grows to be as long as the simulationTimeline", () => {
    //setup

    const startingBalance = 5000;
    const riskPercentage = 0.02;
    const tradesPerWeek = 1;
    const winPercentage = 1;
    const riskToRewardRatio = 2;
    const monthlyExpenses = 0;
    const expensesBegin = -1;
    const simulationTimeline = 18;
    const myFeePercentage = 0.03;

    //exercise
    const resultsArray = accumulateProfits(
      startingBalance,
      riskPercentage,
      tradesPerWeek,
      winPercentage,
      riskToRewardRatio,
      monthlyExpenses,
      expensesBegin,
      simulationTimeline,
      myFeePercentage
    );

    //verify
    expect(resultsArray.length).to.be.equal(simulationTimeline);
  });

  it("ensuring netMonthlyProfit is calculated properly when expenses are activated (expensesBegin > 0)", () => {
    //setup
    const currentBalance = 5000;
    const riskPercentage = 0.02;
    const tradesPerWeek = 1;
    const winPercentage = 1;
    const riskToRewardRatio = 2;
    const monthlyExpenses = 500;
    const expensesBegin = 1;
    const myFeePercentage = 0.03;
    const simulationTimeline = 18;

    let netMonthlyProfit;
    let grossMonthlyProfit;

    //exercise
    for (let i = 0; i < simulationTimeline; i++) {
      grossMonthlyProfit = calculateMonthlyProfit(
        currentBalance,
        riskPercentage,
        tradesPerWeek,
        winPercentage,
        riskToRewardRatio,
        myFeePercentage
      );

      if (expensesBegin >= 1 && i + 1 >= expensesBegin) {
        netMonthlyProfit = grossMonthlyProfit - monthlyExpenses;
      } else {
        netMonthlyProfit = grossMonthlyProfit;
      }
    }

    //verify
    expect(netMonthlyProfit).to.be.equal(grossMonthlyProfit - monthlyExpenses);
  });

  it("ensuring netMonthlyProfit is calculated properly when expenses are disabled (expensesBegin = 0)", () => {
    //setup
    const currentBalance = 5000;
    const riskPercentage = 0.02;
    const tradesPerWeek = 1;
    const winPercentage = 1;
    const riskToRewardRatio = 2;
    const monthlyExpenses = 500;
    const expensesBegin = 0;
    const myFeePercentage = 0.03;
    const simulationTimeline = 18;

    let netMonthlyProfit;
    let grossMonthlyProfit;

    //exercise
    for (let i = 0; i < simulationTimeline; i++) {
      grossMonthlyProfit = calculateMonthlyProfit(
        currentBalance,
        riskPercentage,
        tradesPerWeek,
        winPercentage,
        riskToRewardRatio,
        myFeePercentage
      );

      if (expensesBegin >= 1 && i + 1 >= expensesBegin) {
        netMonthlyProfit = grossMonthlyProfit - monthlyExpenses;
      } else {
        netMonthlyProfit = grossMonthlyProfit;
      }
    }

    //verify
    expect(netMonthlyProfit).to.be.equal(grossMonthlyProfit);
  });

  it("confirming accurate function of expensesDeducted property when there are expenses to be deducted", () => {
    //setup
    const startingBalance = 5000;
    const riskPercentage = 0.02;
    const tradesPerWeek = 1;
    const winPercentage = 1; // 100% win rate for predictable testing
    const riskToRewardRatio = 2;
    const monthlyExpenses = 500;
    const expensesBegin = 1; // Expenses start from month 1
    const myFeePercentage = 0.03;
    const simulationTimeline = 18; // months

    let currentBalance = startingBalance;

    let expensesDeducted;

    //exercise
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

      // Logic to apply expenses starting from the specified month
      if (expensesBegin > 0 && i + 1 >= expensesBegin) {
        netMonthlyProfit = grossMonthlyProfit - monthlyExpenses;
      } else {
        netMonthlyProfit = grossMonthlyProfit;
      }

      expensesDeducted = grossMonthlyProfit - netMonthlyProfit;
      currentBalance += netMonthlyProfit;
    }
    //verify
    expect(expensesDeducted).to.be.equal(monthlyExpenses);
  });

  it("confirming accurate function of expensesDeducted property when there aren't expenses to be deducted", () => {
    //setup
    const startingBalance = 5000;
    const riskPercentage = 0.02;
    const tradesPerWeek = 1;
    const winPercentage = 1; // 100% win rate for predictable testing
    const riskToRewardRatio = 2;
    const monthlyExpenses = 500;
    const expensesBegin = 0; // Expenses do not start in this example (set to 0)
    const myFeePercentage = 0.03;
    const simulationTimeline = 18; // months

    let currentBalance = startingBalance;

    let expensesDeducted;

    //exercise
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

      // Logic to apply expenses starting from the specified month
      if (expensesBegin > 0 && i + 1 >= expensesBegin) {
        netMonthlyProfit = grossMonthlyProfit - monthlyExpenses;
      } else {
        netMonthlyProfit = grossMonthlyProfit;
      }

      expensesDeducted = grossMonthlyProfit - netMonthlyProfit;
      currentBalance += netMonthlyProfit;
    }
    //verify
    expect(expensesDeducted).to.be.equal(0);
  });

  it("confirming accuracy of items pushed to resultsArray", () => {
    //setup
    const startingBalance = 5000;
    const riskPercentage = 0.02;
    const tradesPerWeek = 1;
    const winPercentage = 1; // 100% win rate for predictable testing
    const riskToRewardRatio = 2;
    const monthlyExpenses = 500;
    const expensesBegin = 1; // Expenses start from month 1
    const myFeePercentage = 0.03;
    const simulationTimeline = 18; // months

    let currentBalance = startingBalance;
    const resultsArray = [];

    //exercise
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

      // Logic to apply expenses starting from the specified month
      if (expensesBegin > 0 && i + 1 >= expensesBegin) {
        netMonthlyProfit = grossMonthlyProfit - monthlyExpenses;
      } else {
        netMonthlyProfit = grossMonthlyProfit;
      }

      const expensesDeducted = grossMonthlyProfit - netMonthlyProfit;
      currentBalance += netMonthlyProfit;

      // The object now omits the 'month' property as requested
      resultsArray.push({
        grossProfit: grossMonthlyProfit,
        expensesDeducted: expensesDeducted,
        netProfit: netMonthlyProfit,
        endBalance: currentBalance,
      });

      // Stop simulation if balance is depleted
      if (currentBalance <= 0) {
        break;
      }
    }

    //verify
    const finalMonthIndex = resultsArray.length - 1;

    // 1. Confirm the simulation ran for the expected number of months
    expect(resultsArray.length).to.be.equal(simulationTimeline);

    // 2. Confirm the final balance in the last array element matches the final calculated balance
    expect(resultsArray[finalMonthIndex].endBalance).to.be.equal(
      currentBalance
    );

    // 3. (Optional) A specific check on the first month's data for accuracy
    const firstMonthGrossProfit = calculateMonthlyProfit(
      startingBalance,
      riskPercentage,
      tradesPerWeek,
      winPercentage,
      riskToRewardRatio,
      myFeePercentage
    );
    const firstMonthNetProfit = firstMonthGrossProfit - monthlyExpenses;
    const firstMonthEndBalance = startingBalance + firstMonthNetProfit;

    expect(resultsArray[0].grossProfit).to.be.closeTo(
      firstMonthGrossProfit,
      0.01
    );
    expect(resultsArray[0].endBalance).to.be.closeTo(
      firstMonthEndBalance,
      0.01
    );
  });
});

describe("testing the components of the runMonteCarlo function", () => {
  it("confirming the runMonteCarlo function generates the correct number of run results", () => {
    //setup
    const simulationRuns = 1000;
    const allRunsResults = [];
    const params = {
      startingBalance: 5000,
      riskPerTrade: 0.02,
      tradesPerWeek: 5,
      riskToReward: 2,
      expensesBegin: 4,
      totalMonthlyExpenses: 500,
      simulationTimeline: 18,
      simulationRuns: 1000,
      myFeePercentage: 0.03,
    };
    let singleRunResult;

    //exercise
    for (let i = 0; i < simulationRuns; i++) {
      singleRunResult = accumulateProfits(
        params.startingBalance,
        params.riskPerTrade,
        params.tradesPerWeek,
        params.winRate,
        params.riskToReward,
        params.totalMonthlyExpenses,
        params.expensesBegin,
        params.simulationTimeline,
        params.myFeePercentage
      );

      const finalMonth =
        singleRunResult.length > 0
          ? singleRunResult[singleRunResult.length - 1]
          : null;

      if (finalMonth) {
        allRunsResults.push({
          finalBalance: finalMonth.endBalance,
          survived: true,
          monthlyData: singleRunResult, // <-- KEY CHANGE: Include the full monthly breakdown
        });
      } else {
        allRunsResults.push({
          finalBalance: 0,
          survived: false,
          monthlyData: [],
        });
      }
    }
    //verify
    expect(allRunsResults.length).to.be.equal(simulationRuns);
  });

it("confirming the survival component of the runMonteCarlo function is accurate", () => {
    //setup
    const simulationRuns = 1000;

    const survivingParams = {
        startingBalance: 5000,
        riskPerTrade: 0.02,
        tradesPerWeek: 5,
        riskToReward: 2,
        expensesBegin: 0,
        totalMonthlyExpenses: 0,
        simulationTimeline: 18,
        myFeePercentage: 0.03,
        winRate: 0.5,
    };

    const nonSurvivingParams = {
        startingBalance: 5000,
        riskPerTrade: 1,
        tradesPerWeek: 5,
        riskToReward: 1,
        expensesBegin: 0,
        totalMonthlyExpenses: 4000,
        simulationTimeline: 18,
        myFeePercentage: 0.03,
        winRate: 0.1,
    };

    //exercise
    const survivingResults = runMonteCarlo(survivingParams, simulationRuns);
    const nonSurvivingResults = runMonteCarlo(nonSurvivingParams, simulationRuns);

    //verify
    const survivingRate = survivingResults.filter(run => run.survived).length / simulationRuns;
    const nonSurvivingRate = nonSurvivingResults.filter(run => run.survived).length / simulationRuns;

    // Assert that the good parameters led to a HIGH survival (profitability) rate.
    // We check for > 50% because 100% is not guaranteed with randomness.
    expect(survivingRate).to.be.greaterThan(0.5);

    // Assert that the bad parameters led to a 0% survival (profitability) rate.
    expect(nonSurvivingRate).to.be.equal(0);
});
});
