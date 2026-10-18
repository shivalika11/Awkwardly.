export type GuideVariant = { tone: "Polite" | "Funny" | "Professional" | "Direct"; text: string };
export type Guide = {
  id: string;
  title: string;
  category: string;
  description: string;
  say: string;
  avoid: string;
  variants: GuideVariant[];
  advice: string;
  scenario: string;
};

export const guides: Guide[] = [
  {
    id: "cancel-plans",
    title: "Cancel plans without vanishing",
    category: "Plans & people",
    description: "Change your plans without making the other person guess.",
    say: "I'm sorry, but I need to cancel tonight. I hope we can find another day soon.",
    avoid: "Going quiet and hoping they figure it out.",
    variants: [
      { tone: "Polite", text: "I'm sorry for the late change, but I can't make it tonight. Could we find another day?" },
      { tone: "Funny", text: "My couch has won this round. I have to bow out tonight — rain check soon?" },
      { tone: "Professional", text: "I need to cancel our plans for tonight. I apologize for the change and appreciate your understanding." },
      { tone: "Direct", text: "I can't make it tonight. I wanted to let you know as soon as I could." },
    ],
    advice: "Tell them promptly. You can be warm without inventing a reason or over-apologizing.",
    scenario: "cancel dinner plans",
  },
  {
    id: "say-no",
    title: "Say no to a request",
    category: "Boundaries",
    description: "Decline clearly while keeping the relationship intact.",
    say: "I can't take that on right now, but thank you for thinking of me.",
    avoid: "I'll try, maybe — when you already know the answer is no.",
    variants: [
      { tone: "Polite", text: "Thank you for asking. I can't commit to that right now, and I don't want to overpromise." },
      { tone: "Funny", text: "My plate is doing its best impression of a Jenga tower, so I have to pass this time." },
      { tone: "Professional", text: "I don't have capacity to take this on at the moment. I can revisit it after my current priorities." },
      { tone: "Direct", text: "I can't do that. I wanted to be clear rather than leave you waiting." },
    ],
    advice: "A short no is a complete answer. Offer an alternative only if you genuinely want to.",
    scenario: "say no to a request",
  },
  {
    id: "late-reply",
    title: "Reply after a long silence",
    category: "Plans & people",
    description: "Reconnect without writing a courtroom defense.",
    say: "I know I've been quiet — I'm sorry. How have you been?",
    avoid: "A dramatic apology that makes them reassure you.",
    variants: [
      { tone: "Polite", text: "I know it's been a while, and I'm sorry I dropped off. I've been thinking of you — how are you?" },
      { tone: "Funny", text: "This reply took the scenic route. Sorry for the delay! How have you been?" },
      { tone: "Professional", text: "Apologies for the delayed reply. Thank you for your patience; here's where things stand." },
      { tone: "Direct", text: "I took too long to reply. I'm sorry. I'd still like to catch up if you're open to it." },
    ],
    advice: "Own the delay once, then ask a genuine question or respond to what they sent.",
    scenario: "reply after a long silence",
  },
  {
    id: "feedback",
    title: "Give honest feedback",
    category: "Work & feedback",
    description: "Be specific about the work, not harsh about the person.",
    say: "The opening is strong. I think the key point would land more clearly if we moved it up.",
    avoid: "This is bad, or vague praise that hides the actual issue.",
    variants: [
      { tone: "Polite", text: "Thanks for putting this together. Could we look at making the main point clearer in the opening?" },
      { tone: "Funny", text: "The idea is in there; it's just playing a tiny game of hide-and-seek. Could we bring it forward?" },
      { tone: "Professional", text: "The structure is promising. Moving the recommendation earlier would make the argument easier to follow." },
      { tone: "Direct", text: "The main point is hard to find. Move it into the first section so readers get the takeaway sooner." },
    ],
    advice: "Describe an observable detail and one useful next step. Invite a conversation if the stakes are high.",
    scenario: "give constructive feedback",
  },
  {
    id: "boundary",
    title: "Set a personal boundary",
    category: "Boundaries",
    description: "Name what works for you, then say what you need.",
    say: "I care about you, and I'm not available to talk about this tonight. Can we check in tomorrow?",
    avoid: "Waiting until resentment turns a small boundary into a blow-up.",
    variants: [
      { tone: "Polite", text: "I care about this, and I need a little space tonight. Can we pick it up tomorrow?" },
      { tone: "Funny", text: "My brain tabs are all frozen for the day. Can we talk about this tomorrow?" },
      { tone: "Professional", text: "I can't give this the attention it deserves right now. Let's set aside time tomorrow to discuss it." },
      { tone: "Direct", text: "I'm not available for this conversation tonight. I can talk tomorrow." },
    ],
    advice: "Boundaries work best when they are about your actions and capacity, not controlling someone else's.",
    scenario: "set a personal boundary",
  },
  {
    id: "missed-deadline",
    title: "Own a missed deadline",
    category: "Work & feedback",
    description: "Take responsibility and give a realistic next step.",
    say: "I missed the deadline. I'm sorry. I can send a complete draft by Thursday at noon.",
    avoid: "A string of excuses with no new delivery date.",
    variants: [
      { tone: "Polite", text: "I'm sorry — I missed the deadline. I can get this to you by Thursday at noon. Does that still work?" },
      { tone: "Funny", text: "I owe you an update, not a time machine: I missed the deadline. I can deliver Thursday at noon." },
      { tone: "Professional", text: "I missed the agreed deadline. I apologize. The revised delivery time is Thursday at noon, and I will flag risks earlier." },
      { tone: "Direct", text: "I missed the deadline. I can deliver Thursday at noon. I'll tell you sooner if that changes." },
    ],
    advice: "State the impact, take responsibility without self-criticism, and choose a date you can keep.",
    scenario: "explain a missed deadline",
  },
  {
    id: "ask-for-help",
    title: "Ask for help",
    category: "Work & feedback",
    description: "Make it easier to help by being specific about the ask.",
    say: "Could you look at the first two slides with me before 3? I'm stuck on the story.",
    avoid: "Sorry to bother you, but could you maybe help with everything?",
    variants: [
      { tone: "Polite", text: "When you have a moment, could you review the first two slides? I'm not sure the story is clear yet." },
      { tone: "Funny", text: "Could I borrow your fresh-eyes superpower for the first two slides before 3?" },
      { tone: "Professional", text: "Could you review the first two slides before 3 p.m.? I would value your input on the narrative." },
      { tone: "Direct", text: "I need another perspective on the first two slides. Can you review them with me before 3?" },
    ],
    advice: "Say what you need, roughly how long it will take, and when you need it. That gives someone a real choice.",
    scenario: "ask a colleague for help",
  },
  {
    id: "decline-invitation",
    title: "Decline an invitation",
    category: "Plans & people",
    description: "Show appreciation without creating a fake maybe.",
    say: "Thank you for inviting me. I can't join this time, but I hope you have a great evening.",
    avoid: "Making up a commitment to make your no sound valid.",
    variants: [
      { tone: "Polite", text: "Thanks so much for inviting me. I can't make it this time, but I hope it's lovely." },
      { tone: "Funny", text: "Thank you for the invite! I'll be cheering you on from my very glamorous pajamas." },
      { tone: "Professional", text: "Thank you for the invitation. Unfortunately I won't be able to attend, but I hope it goes well." },
      { tone: "Direct", text: "Thanks for thinking of me. I won't be able to come, but I hope you have a great time." },
    ],
    advice: "Gratitude and a clear answer are enough. Don't offer a rain check unless you mean it.",
    scenario: "decline an invitation",
  },
];

export type SimChoice = { label: string; next: string };
export type SimNode = { text: string; choices?: SimChoice[]; outcome?: "smooth" | "mixed" | "rough"; insight?: string };
export type SimScenario = { id: string; title: string; category: string; description: string; start: string; nodes: Record<string, SimNode> };

function buildScenario(
  id: string, title: string, category: string, description: string, opening: string,
  first: [string, string, string],
  reactions: [string, string, string],
  endings: [[string, string], [string, string], [string, string]],
): SimScenario {
  const nodes: Record<string, SimNode> = {
    start: { text: opening, choices: first.map((label, index) => ({ label, next: `reaction-${index}` })) },
  };
  reactions.forEach((text, index) => {
    nodes[`reaction-${index}`] = {
      text,
      choices: [
        { label: endings[index][0], next: `ending-${index}-0` },
        { label: endings[index][1], next: `ending-${index}-1` },
      ],
    };
    const gentle = index === 1;
    nodes[`ending-${index}-0`] = {
      text: gentle ? "They accept the answer and the conversation stays warm." : "The exchange settles, and both of you know where things stand.",
      outcome: index === 0 ? "mixed" : "smooth",
      insight: gentle ? "Clear words can still leave room for kindness." : "Specific, honest language makes it easier to move forward.",
    };
    nodes[`ending-${index}-1`] = {
      text: "They need a moment to take it in. You both have a clearer next step now.",
      outcome: "mixed",
      insight: "You can't control the other person's first reaction; you can choose a respectful response.",
    };
  });
  return { id, title, category, description, start: "start", nodes };
}

export const scenarios: SimScenario[] = [
  buildScenario(
    "cancel-plans",
    "Cancel dinner plans",
    "Plans & people",
    "You need to change plans with a friend who was looking forward to tonight.",
    "Maya texts: “Still on for dinner tonight? I booked that place you love!”",
    [
      "“I can't make it tonight. I'm sorry for the late notice.”",
      "“Something came up, maybe another time?”",
      "“I need to cancel tonight. Could we try Saturday instead?”",
    ],
    [
      "Maya replies: “Oh, okay. Is everything alright?”",
      "Maya says: “No worries, thanks for letting me know.”",
      "Maya asks: “Would Saturday work for you?”",
    ],
    [
      ["“I'm okay, just need a quiet night. Thanks for checking.”", "“All good, thank you!”"],
      ["“Thank you for understanding.”", "“I should have told you sooner.”"],
      ["“Saturday works — I'll pick a time.”", "“I can't do Saturday either, but I'll suggest a day when I can.”"],
    ],
  ),
  buildScenario(
    "decline-request",
    "Say no to a favor",
    "Boundaries",
    "A friend asks you to help move on the only day you have free.",
    "Your friend texts: “Could you help me move all day Saturday? I know it's a lot, but I could really use you.”",
    [
      "“I can't help Saturday, but I hope the move goes smoothly.”",
      "“Maybe, let me see how I feel that day.”",
      "“I can't do the whole day. I can help for one hour Sunday.”",
    ],
    [
      "They reply: “I was really counting on you.”",
      "They answer: “Okay, just let me know.”",
      "They say: “Sunday could actually help. Thank you.”",
    ],
    [
      ["“I get that. I still can't make Saturday work.”", "“Sorry, you're right, I'll come.”"],
      ["“I'll let you know by tonight.”", "“I don't think I can, so please make another plan.”"],
      ["“Great, I can come from 10 to 11.”", "“Actually I can't offer Sunday either. Sorry for the confusion.”"],
    ],
  ),
  buildScenario(
    "late-reply",
    "Reply after going quiet",
    "Plans & people",
    "You forgot to respond to a message from someone you care about.",
    "You notice a friend's message from last week: “Hey, how have you been? Want to catch up soon?”",
    [
      "“I'm sorry I went quiet. I'd love to catch up.”",
      "“I've been so awful, I don't deserve friends.”",
      "“This reply took the scenic route! Coffee next week?”",
    ],
    [
      "They say: “No worries — I missed you!”",
      "They reply: “You don't have to say that. Are you okay?”",
      "They ask: “Tuesday work?”",
    ],
    [
      ["“I've missed you too. When are you free?”", "“I may be slow sometimes, but I do care about you.”"],
      ["“I'm okay, just got overwhelmed. Thanks for asking.”", "“Anyway, forget it.”"],
      ["“Tuesday's great. I'll send a time.”", "“I can't Tuesday after all; could we try Thursday?”"],
    ],
  ),
  buildScenario(
    "work-feedback",
    "Give constructive feedback",
    "Work & feedback",
    "A teammate shares a draft that needs a clearer opening.",
    "A teammate asks: “What do you think of the proposal? I can still make changes before the review.”",
    [
      "“The recommendation is hard to find; could we bring it into the opening?”",
      "“Looks good!”",
      "“This doesn't work. Start over.”",
    ],
    [
      "They ask: “Which part should move?”",
      "They thank you, but the issue remains.",
      "They go quiet and look discouraged.",
    ],
    [
      ["“The audience and ask in section three — those could lead.”", "“I'm not sure, maybe just make it better.”"],
      ["“I do have one suggestion: make the ask explicit up top.”", "“Actually, never mind.”"],
      ["“I should be more specific. The evidence is solid; the structure needs work.”", "“Sorry, I'm just being honest.”"],
    ],
  ),
  buildScenario(
    "missed-deadline",
    "Own a missed deadline",
    "Work & feedback",
    "You realize your teammate is waiting on work you haven't finished.",
    "Your lead asks: “Can I share your section with the team this afternoon?” You are not finished.",
    [
      "“I missed the deadline. I can send a complete draft tomorrow at noon.”",
      "“Almost done!”",
      "“The delay is because everyone kept changing things.”",
    ],
    [
      "They ask: “What can I share today?”",
      "They reply: “I needed to know earlier.”",
      "They say: “Let's talk about the changes.”",
    ],
    [
      ["“I can send the completed data section now and the rest tomorrow.”", "“I can't share anything today.”"],
      ["“You're right. I should have flagged it sooner. Tomorrow at noon is realistic.”", "“I said I'm sorry already.”"],
      ["“Let's align on scope. I can share the current draft now.”", "“Never mind, I'll just do it all tonight.”"],
    ],
  ),
];
