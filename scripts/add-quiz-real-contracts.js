const fs = require('fs');
const quizzes = require('../src/data/quizzes.json');

const newQuestions = [
  // ── QUIZ 1: Contract for Services (Termination Clause) ──────────────────
  {
    id: 1580,
    question: 'From a termination clause: "The Company may terminate the Agreement _______ by written notice." Which word means immediately, without delay?',
    options: ['FORTHWITH', 'NOTWITHSTANDING', 'DEEMED', 'WHEREBY'],
    correct: 'FORTHWITH',
    explanation: 'FORTHWITH means immediately. It is a formal legal word used in contracts to indicate that action must be taken at once, with no delay.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1581,
    question: 'From a termination clause: "The Customer makes an arrangement with its _______." The missing word refers to:',
    options: [
      'shareholders',
      'directors',
      'people or organisations waiting for payment',
      'employees'
    ],
    correct: 'people or organisations waiting for payment',
    explanation: 'CREDITORS are people or organisations to whom money is owed. When a company negotiates a repayment arrangement with its creditors, this may trigger a termination right.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1582,
    question: 'A termination clause states: "the company passes a _______ that it should be wound up." The missing word means a formal decision made at a meeting.',
    options: ['revision', 'remedy', 'resolution', 'ruling'],
    correct: 'resolution',
    explanation: 'A RESOLUTION is a formal decision made by vote at a company meeting. A resolution to wind up the company is a ground for termination in many commercial contracts.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1583,
    question: 'A termination clause provides: "the court makes an order that the company should be _______ up." This phrase means the company is permanently closed.',
    options: ['set', 'wound', 'broken', 'tied'],
    correct: 'wound',
    explanation: 'WOUND UP means permanently closed or brought to an end. A company that is wound up ceases to exist as a legal entity. It is different from administration, where rescue is possible.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1584,
    question: '"A breach which the party reasonably considers is not capable of _______." In contract law, this word refers to a legal solution that compensates for a failure to perform.',
    options: ['appeal', 'remedy', 'repeal', 'relief'],
    correct: 'remedy',
    explanation: 'A REMEDY is a legal solution or cure for a breach of contract. Where a breach is "incapable of remedy", it cannot be fixed — giving the innocent party an immediate right to terminate.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1585,
    question: 'A termination clause covers the situation where "the Customer is a _______ and any partner becomes bankrupt." Which type of business structure is this?',
    options: ['limited company', 'sole trader', 'partnership', 'cooperative'],
    correct: 'partnership',
    explanation: 'A PARTNERSHIP is a business where two or more people share joint and several liability. Bankruptcy of any individual partner is a recognised termination trigger because it affects the whole firm.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  // ── QUIZ 2: Contract to Supply Water ─────────────────────────────────────
  {
    id: 1586,
    question: 'A supply contract states: "The liability shall be joint and _______." In this legal context, the second word means individual (each person is fully responsible alone).',
    options: ['collective', 'several', 'shared', 'mutual'],
    correct: 'several',
    explanation: 'SEVERAL in "joint and several" means individual. Each party is liable for the full debt alone, not merely their proportionate share. This is crucial in partnership and guarantee contexts.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1587,
    question: '"The signatory on the application form shall be _______ to be the Customer." The missing word means considered or treated as.',
    options: ['required', 'nominated', 'deemed', 'presumed'],
    correct: 'deemed',
    explanation: 'DEEMED means considered or treated as, for legal purposes. "Shall be deemed" creates a legal fiction — the signatory is treated as the Customer even if technically another entity.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1588,
    question: 'In a commercial supply contract, \'premises\' refers to:',
    options: [
      'introductory recitals at the start of the contract',
      'promises exchanged between the parties',
      'the buildings and land that a business uses',
      'conditions attached to payment obligations'
    ],
    correct: 'the buildings and land that a business uses',
    explanation: 'PREMISES in a contract means the buildings and land a business occupies. It is not the same as the legal meaning of "premises" in a logical argument.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1589,
    question: 'A supply contract states: "The Company will not supply tenants on a short-term _______." The missing word refers to a type of rental agreement.',
    options: ['tenure', 'licence', 'lease', 'permit'],
    correct: 'lease',
    explanation: 'A LEASE is a contractual agreement under which a property owner grants temporary possession to a tenant in exchange for rent. Short-term leases (3 months or less) are excluded from this supply contract.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  // ── QUIZ 3: Contract for Sale of Goods ────────────────────────────────────
  {
    id: 1590,
    question: '"The Seller retains title to the Goods _______ delivery to the Buyer until paid in full." The missing word means despite.',
    options: ['notwithstanding', 'pending', 'following', 'subject to'],
    correct: 'notwithstanding',
    explanation: 'NOTWITHSTANDING means despite or in spite of. A retention of title (Romalpa) clause allows the seller to keep ownership of goods notwithstanding physical delivery, until full payment is received.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1591,
    question: '"The Seller retains _______ to the Goods until the Seller has been paid in full." The missing word means the legal right to ownership.',
    options: [
      'possession',
      'title',
      'interest',
      'control'
    ],
    correct: 'title',
    explanation: 'TITLE means the legal right to ownership of property. Retaining title is the basis of a Romalpa clause — the seller keeps ownership of goods even after delivery until payment is complete.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1592,
    question: '"The Seller will refund the cost of postage if the Goods are in fact _______." The missing word means having a fault or imperfection.',
    options: ['delayed', 'defective', 'disputed', 'detained'],
    correct: 'defective',
    explanation: 'DEFECTIVE means having a defect — a fault or imperfection. Goods are defective when they do not conform to the contract description or are not fit for purpose.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1593,
    question: '"The Buyer shall _______ the Seller within a reasonable time if the Goods are damaged." The missing word means to inform or tell officially.',
    options: ['notify', 'certify', 'remind', 'warn'],
    correct: 'notify',
    explanation: 'NOTIFY means to tell or inform someone officially. A duty to notify the seller of defects within a reasonable time is standard in sale of goods contracts — failure to do so may be treated as acceptance.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  // ── QUIZ 4: Contract for the Hire of a Bicycle ───────────────────────────
  {
    id: 1594,
    question: '"The Renter _______ not to misuse or damage the Bicycle." The missing word means agrees or promises to do something.',
    options: ['undertakes', 'attempts', 'declines', 'warrants'],
    correct: 'undertakes',
    explanation: 'UNDERTAKES means agrees or promises to do (or not do) something. It creates a contractual obligation. "The Renter undertakes" is a standard way of imposing a positive or negative duty in a hire contract.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1595,
    question: '"The Owner shall not be liable for any damage _______." In this exclusion clause, the missing word means of any type, at all.',
    options: ['whatsoever', 'whenever', 'wherever', 'whoever'],
    correct: 'whatsoever',
    explanation: 'WHATSOEVER means of any type or kind at all. It is used to strengthen an exclusion or limitation clause, emphasising that there are no exceptions to the stated rule.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1596,
    question: '"The Renter shall _______ the Owner in respect of all costs and claims which may arise out of use of the Bicycle." The missing word means to promise to pay for any loss suffered.',
    options: ['compensate', 'reimburse', 'indemnify', 'guarantee'],
    correct: 'indemnify',
    explanation: 'INDEMNIFY means to promise to pay another party for any loss, damage, or costs they suffer. An indemnity is broader than damages — it is a primary, contractual obligation to hold the other party harmless.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  // ── Additional context questions derived from contract vocabulary ─────────
  {
    id: 1597,
    question: 'A hire contract states: "ordinary _______ and _______ excepted" after a prohibition on damaging the bicycle. This phrase refers to the usual amount of deterioration from normal use.',
    options: ['damage / loss', 'wear / tear', 'use / misuse', 'risk / cost'],
    correct: 'wear / tear',
    explanation: 'ORDINARY WEAR AND TEAR refers to the gradual, inevitable deterioration that results from normal, proper use of an item. It is routinely excluded from damage liability in hire contracts.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1598,
    question: '"All costs which the Owner may _______ arising out of use of the Bicycle." The missing word means to be obliged to spend money on something as a result of a situation.',
    options: ['recover', 'incur', 'charge', 'deduct'],
    correct: 'incur',
    explanation: 'INCUR means to become subject to or obliged to pay a cost or liability. "Costs incurred" is a standard phrase meaning costs that have been or may be spent as a result of the relevant event.',
    level: 'H',
    topic: 'Commercial Contracts'
  },
  {
    id: 1599,
    question: 'A supply contract opens: "The terms and conditions of supply are _______ below." The phrase means written out and explained in the document.',
    options: ['laid down', 'set out', 'drawn up', 'spelled out'],
    correct: 'set out',
    explanation: 'SET OUT means written and explained in detail within the document. It is used at the start of contracts to signal that the full terms follow. Compare: "drawn up" (drafted) and "laid down" (established as a rule).',
    level: 'H',
    topic: 'Commercial Contracts'
  }
];

const existingIds = new Set(quizzes.map(q => q.id));
const conflicts = newQuestions.filter(q => existingIds.has(q.id));
if (conflicts.length > 0) {
  console.log('ID conflicts:', conflicts.map(q => q.id));
  process.exit(1);
}

const updated = [...quizzes, ...newQuestions];
fs.writeFileSync('./src/data/quizzes.json', JSON.stringify(updated, null, 2));
console.log('Done. Added:', newQuestions.length, '| New total:', updated.length);
