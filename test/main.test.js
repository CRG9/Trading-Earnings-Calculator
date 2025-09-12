const { expect } = require("chai");
const {
  calculateMonthlyProfit,
  annualizeProfits,
} = require("../main.js");

describe("testing the output of calculateMonthlyProfit function", () => {
  it("calculating profit after one month of trading", () => {
    //setup
    let accountBalance = 5000;
    let riskPercentage = 0.02;
    let tradesPerWeek = 5;
    let winPercentage = 0.5;
    let riskToRewardRatio = 2;

    //exercise
    const profit = calculateMonthlyProfit(
      accountBalance,
      riskPercentage,
      tradesPerWeek,
      winPercentage,
      riskToRewardRatio
    );

    //verify
    expect(profit).to.be.closeTo(1047.33, 0.01);
  });

  it("calculating new account balance after one month of trading", () => {
    //setup
    let accountBalance = 5000;
    let riskPercentage = 0.02;
    let tradesPerWeek = 5;
    let winPercentage = 0.5;
    let riskToRewardRatio = 2;

    //exercise
    const profit = calculateMonthlyProfit(
      accountBalance,
      riskPercentage,
      tradesPerWeek,
      winPercentage,
      riskToRewardRatio
    );

    //verify
    expect(profit + accountBalance).to.be.closeTo(1047.33 + accountBalance, 0.01);
  });
});

describe("testing the construction of the profitsArray", () => {
  it("testing the length of the profitsArray", () => {
    //setup
    // 2. Define the initial parameters for your trading strategy.
    const startingBalance = 5000;
    const riskPerTrade = 0.02; // 2% risk
    const tradesPerWeek = 5;
    const winRate = 0.7; // 50% win rate
    const riskToReward = 2; // 2:1 risk-to-reward ratio

    //exercise
    const arrayLength = annualizeProfits(startingBalance, riskPerTrade, tradesPerWeek, winRate, riskToReward).length;

    //verify
    expect(arrayLength).to.be.equal(12);
  });
});
