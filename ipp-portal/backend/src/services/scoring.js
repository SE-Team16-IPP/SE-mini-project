// IPP-F-034: scoring is done on the server. The client never sends or controls the score.
function scoreAttempt(test, answers) {
  const given = new Map();
  for (const a of Array.isArray(answers) ? answers : []) {
    if (a && a.questionId != null && Number.isInteger(a.selectedIndex)) {
      given.set(String(a.questionId), a.selectedIndex);
    }
  }

  let score = 0;
  const cleaned = [];
  for (const q of test.questions) {
    const selected = given.get(String(q._id));
    if (selected === undefined || selected < 0 || selected >= q.options.length) continue;
    cleaned.push({ questionId: q._id, selectedIndex: selected });
    if (selected === q.correctIndex) score += 1;
  }

  return { score, total: test.questions.length, answers: cleaned };
}

module.exports = { scoreAttempt };
