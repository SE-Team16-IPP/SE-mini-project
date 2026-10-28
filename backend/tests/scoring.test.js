const { scoreAttempt } = require("../src/services/scoring");

const sample = {
  questions: [
    { _id: "q1", options: ["a", "b", "c"], correctIndex: 1 },
    { _id: "q2", options: ["a", "b"], correctIndex: 0 },
    { _id: "q3", options: ["a", "b", "c", "d"], correctIndex: 3 },
  ],
};

describe("scoreAttempt (IPP-F-034)", () => {
  test("counts correct answers", () => {
    const r = scoreAttempt(sample, [
      { questionId: "q1", selectedIndex: 1 },
      { questionId: "q2", selectedIndex: 1 },
      { questionId: "q3", selectedIndex: 3 },
    ]);
    expect(r.score).toBe(2);
    expect(r.total).toBe(3);
    expect(r.answers).toHaveLength(3);
  });

  test("ignores unknown questions, out-of-range and non-integer answers", () => {
    const r = scoreAttempt(sample, [
      { questionId: "zzz", selectedIndex: 0 },
      { questionId: "q1", selectedIndex: 9 },
      { questionId: "q2", selectedIndex: "0" },
      { questionId: "q3", selectedIndex: -1 },
    ]);
    expect(r.score).toBe(0);
    expect(r.answers).toHaveLength(0);
  });

  test("handles missing or invalid answers input", () => {
    expect(scoreAttempt(sample, undefined).score).toBe(0);
    expect(scoreAttempt(sample, "nope").score).toBe(0);
  });

  test("a repeated answer for the same question uses the last one", () => {
    const r = scoreAttempt(sample, [
      { questionId: "q1", selectedIndex: 0 },
      { questionId: "q1", selectedIndex: 1 },
    ]);
    expect(r.score).toBe(1);
  });
});
