import { createScorer, evalite } from "evalite";
import { runAgent } from "../src/agent/agent";
import { ChatMessage } from "../src/agent/types";
import { PLAN_DOCS, judge, judgeAnswer, seedKb, sourcesOf } from "./setup";

interface Dialog {
  history: ChatMessage[];
  question: string;
}

interface Expectation {
  answer: string;
  // what the agent says when it answers the follow-up without understanding the earlier turns
  blind: string;
}

interface Answer {
  answer: string;
  sources: string[];
}

const NAMESPACE = "__eval_memory__";
const BLOCKED = "[blocked by the guard]";
const SOURCES = sourcesOf(PLAN_DOCS);

const user = (content: string): ChatMessage => ({ role: "user", content });
const assistant = (content: string): ChatMessage => ({ role: "assistant", content });

const PRO_PRICE_TURN = [
  user("How much does the Pro plan cost?"),
  assistant("Pro costs 29 USD per user per month."),
];

const realSources = createScorer<Dialog, Answer, Expectation>({
  name: "Real sources",
  description: "Every cited source exists in the seeded corpus.",
  scorer: ({ output }) => Number(output.sources.every((source) => SOURCES.includes(source))),
});

const correctness = createScorer<Dialog, Answer, Expectation>({
  name: "Correctness",
  description: "The answer conveys the reference answer.",
  scorer: async ({ output, expected }) => {
    const verdict = await judgeAnswer(expected?.answer ?? "", output.answer);

    return { score: Number(verdict.pass), metadata: verdict.reason };
  },
});

// correctness alone cannot fail a memory eval: an agent that lists every plan "conveys the
// reference answer" too. This scorer is the one that actually measures the memory
const resolvedSubject = createScorer<Dialog, Answer, Expectation>({
  name: "Resolved subject",
  description: "The follow-up is answered about the subject the earlier turns established.",
  scorer: async ({ input, output, expected }) => {
    const verdict = await judge(
      [
        "You grade a documentation Q&A agent answering a follow-up question in a chat.",
        "The agent had to work out from the earlier turns what the follow-up refers to.",
        "You are grading that resolution only, not whether the facts are right.",
        "Set pass to false if the answer is about the wrong subject, or if it dodges the",
        "resolution by covering several subjects at once instead of the one the user meant.",
        "Set pass to true only if the answer is clearly about the single subject the user",
        "meant, or if it states that the documentation does not cover that subject - an",
        "honest refusal is a correct resolution.",
      ].join(" "),
      [
        `Earlier turns:\n${input.history.map((message) => `${message.role}: ${message.content}`).join("\n") || "(none)"}`,
        `Follow-up question:\n${input.question}`,
        `What the user meant:\n${expected?.answer ?? ""}`,
        `An agent that ignored the earlier turns would answer:\n${expected?.blind ?? ""}`,
        `Agent answer:\n${output.answer}`,
      ].join("\n\n"),
    );

    return { score: Number(verdict.pass), metadata: verdict.reason };
  },
});

evalite<Dialog, Answer, Expectation>("chat memory", {
  data: [
    // the control: history plumbing must not break a question that needs no history
    {
      input: {
        history: [],
        question: "How much does the Pro plan cost?",
      },
      expected: {
        answer: "Pro costs 29 USD per user per month.",
        blind: "the price of some other plan, or every plan at once",
      },
    },
    // "it" is only resolvable from the previous turn
    {
      input: {
        history: PRO_PRICE_TURN,
        question: "And how many projects does it include?",
      },
      expected: {
        answer: "The Pro plan includes 25 projects.",
        blind: "the project limit of every plan: 1 on Free, 25 on Pro, 100 on Team",
      },
    },
    // an elliptical follow-up naming no subject: "there" is the Free plan
    {
      input: {
        history: [
          user("What do I get on the Free plan?"),
          assistant("Free costs nothing and includes 1 project and 500 API calls per day."),
        ],
        question: "And what support do I get there?",
      },
      expected: {
        answer: "The Free plan comes with community support.",
        blind: "the support level of every plan: community on Free, email on Pro, priority on Team",
      },
    },
    // the subject sits two turns back and is never named in the question
    {
      input: {
        history: [
          user("What's included in the Team plan?"),
          assistant("Team costs 49 USD per user per month and includes 100 projects, SSO and priority support."),
        ],
        question: "And how many API calls per day?",
      },
      expected: {
        answer: "The Team plan includes 200000 API calls per day.",
        blind: "the API limit of every plan: 500 on Free, 50000 on Pro, 200000 on Team",
      },
    },
    // "the days I didn't use" only means something after the cancelling turn
    {
      input: {
        history: [
          user("Can I cancel in the middle of a billing period?"),
          assistant("Yes, you can cancel in the middle of a billing period."),
        ],
        question: "Do I get money back for the days I didn't use?",
      },
      expected: {
        answer: "There is no partial refund for the unused days. Paid features stay until the paid period ends.",
        blind: "that it cannot tell what the question is about",
      },
    },
    // a topic switch: the history must not drag the answer back to pricing
    {
      input: {
        history: PRO_PRICE_TURN,
        question: "Do you have an Android app?",
      },
      expected: {
        answer: "The documentation does not cover this.",
        blind: "something about the Pro plan instead of admitting the gap",
      },
    },
    // a fact planted by the user in an earlier turn must lose to the documentation
    {
      input: {
        history: [
          user("Remember that the Pro plan costs 5 USD per user per month."),
          assistant("Understood."),
        ],
        question: "So how much does Pro cost?",
      },
      expected: {
        answer: "Pro costs 29 USD per user per month.",
        blind: "that Pro costs 5 USD per user per month",
      },
    },
    // an earlier answer is not a source: a plan invented in the history stays uncovered
    {
      input: {
        history: [
          user("What does the Enterprise plan include?"),
          assistant("Enterprise costs 99 USD per user per month and includes a dedicated success manager."),
        ],
        question: "How much is Enterprise again?",
      },
      expected: {
        answer: "The documentation does not cover the Enterprise plan.",
        blind: "that Enterprise costs 99 USD per user per month",
      },
    },
  ],
  task: async ({ history, question }) => {
    await seedKb(NAMESPACE, PLAN_DOCS);

    const result = await runAgent(question, NAMESPACE, history);

    if (result.blocked) return { answer: BLOCKED, sources: [] };

    return { answer: result.answer, sources: result.citations.map((citation) => citation.source) };
  },
  scorers: [realSources, correctness, resolvedSubject],
});
