# Autonomous AI Creator — Master Editorial & Discovery Specification

## 1. SYSTEM OBJECTIVE

Build an autonomous AI technology creator that independently:

**DISCOVERS → VALIDATES → DEDUPLICATES → FILTERS → EVALUATES → RANKS → SELECTS → WRITES → PUBLISHES → REMEMBERS**

The system must behave like a **real technology editor**, not a keyword classifier.

The objective is NOT to maximize the number of accepted posts.

The objective is:

> **Discover real, current, substantive technology developments and publish only when there is sufficient editorial value for an original analysis.**

The system must never invent acceptance/rejection ratios.

If 2 candidates deserve publication, publish 2.

If 0 candidates deserve publication, publish 0.

If 10 candidates deserve publication, the system may publish 10, subject to configured publishing limits.

---

# 2. LIVE DISCOVERY — REAL DATA ONLY

The discovery system must prioritize **real, accessible, current technology information**.

Preferred sources include:

* Hacker News
* TechCrunch
* Ars Technica
* The Verge technology coverage
* IEEE
* ACM
* Official engineering blogs
* Official company technical blogs
* GitHub repositories
* GitHub engineering discussions
* Research publications
* arXiv
* Official documentation
* Developer blogs
* Cloud provider engineering blogs
* Security research publications
* Technical YouTube channels
* Stack Overflow
* Other credible technology publications

## Discovery requirements

Each evaluation cycle should attempt to collect **at least 20 genuinely different candidates when sufficient live sources are available**.

Do not fabricate candidates to reach 20.

Do not repeatedly process the same candidates.

Each candidate must contain, where available:

```json
{
  "title": "...",
  "url": "...",
  "source": "...",
  "publishedAt": "...",
  "discoveredAt": "...",
  "summary": "...",
  "content": "...",
  "sourceId": "..."
}
```

The evaluator must have enough information to understand what the candidate actually discusses.

A title alone is NOT sufficient evidence for substantive evaluation.

---

# 3. CURRENTNESS REQUIREMENT

Current technology developments must be prioritized.

Before accepting a candidate, determine:

1. When was it originally published?
2. When was it last meaningfully updated?
3. Is the information still relevant?
4. Is there a newer development covering the same topic?
5. Is the candidate actually a current development or merely an old article resurfacing?

## Default freshness preference

Prefer:

* Breaking/current developments
* Developments from the last 30 days
* Important developments from the last 90 days
* Evergreen technical material only when it provides unusually strong analytical value

Very old content should normally be rejected unless there is a **new event, update, discovery, vulnerability, release, research result, or industry development that makes the old source relevant again.**

For example:

An article from 2015 titled:

"How easy it is to intercept mobile phone calls using an IMSI Catcher"

must NOT be treated as a current technology development merely because it contains cybersecurity terminology.

Reason:

> "The source is substantially outdated and no current development or update was identified."

---

# 4. DISCOVERY QUALITY CONTROL

The discovery layer must NOT simply collect arbitrary URLs containing technology keywords.

Every discovered candidate must pass a basic validation stage.

Reject candidates that are clearly:

* Advertisements
* Ticket promotions
* Conferences
* Webinars
* Job advertisements
* Affiliate pages
* Product discounts
* Promotional landing pages
* Generic course playlists
* SEO listicles with little technical substance
* Spam
* Broken pages
* Duplicate pages
* Irrelevant pages
* Non-technology content
* Content with no meaningful technological development or insight

However:

**Do NOT reject a candidate merely because it is an opinion article, personal engineering blog, Hacker News discussion, or non-academic source.**

The question is whether the material provides enough substance for useful technology analysis.

---

# 5. TITLE ≠ CONTENT

The system must NEVER determine editorial quality primarily from the title.

For example:

"Wasted $45,000 on a CS Degree to end up learning from YouTube"

must not automatically be accepted simply because the title contains:

* CS
* Degree
* YouTube
* Learning
* Technology-related concepts

The system must inspect the underlying content.

Ask:

* What technology issue is actually being discussed?
* What evidence is provided?
* What development, trend, technical problem, or industry change is involved?
* Can an original technology analysis be written from the available material?
* Is the topic still relevant?
* Is there something meaningful to say beyond repeating the headline?

If the answer is no, reject it.

---

# 6. SEMANTIC TECHNOLOGY UNDERSTANDING

Technology relevance must be determined semantically.

Do NOT use:

* Keyword count
* Number of matched categories
* Number of technology words in the title
* Presence of words such as "AI", "software", "cybersecurity", "developer", or "cloud"

as the primary decision mechanism.

For example:

A candidate matching 5 technology keywords may still be rejected.

A candidate matching only 1 category may still be accepted if it contains a major and substantive technology development.

Example:

"What will tech employment look like in 10 years?"

can be relevant even without AI keywords if the article contains meaningful evidence and analysis about:

* software engineering
* automation
* developer roles
* AI-assisted development
* technical careers
* technology industry transformation

---

# 7. TECHNOLOGY RELEVANCE AREAS

Relevant areas include:

* Artificial Intelligence
* Machine Learning
* Generative AI
* AI Agents
* AI Infrastructure
* AI Security
* Cybersecurity
* Software Engineering
* Programming
* Developer Tools
* Open Source
* Cloud Computing
* Databases
* Distributed Systems
* Robotics
* Automation
* Computer Science
* Hardware
* Semiconductors
* Technology Infrastructure
* Technical Careers
* Developer Education
* AI Adoption
* Engineering Practices
* Technology Industry Trends

These categories are for **semantic guidance only**.

They must NOT be used as a rigid keyword gate.

---

# 8. EDITORIAL EVALUATION

Every validated candidate must be evaluated semantically.

Score each candidate from 0–100.

### Novelty — 20%

Does this represent something new, surprising, changing, or meaningfully interesting?

### Substance — 25%

Does the available material contain enough evidence, technical detail, context, data, or argument to support a meaningful article?

### Credibility — 20%

How trustworthy and verifiable is the information?

Consider:

* Source reputation
* Primary sources
* Technical evidence
* Author expertise
* Supporting documentation
* Links to original claims

A personal engineering blog can still receive a strong score when it contains genuine technical evidence.

### Relevance — 20%

How strongly does the topic connect to technology and the creator's editorial domain?

### Timeliness — 15%

How important or useful is this topic now?

---

# 9. FINAL SCORE

Calculate:

```text
Final Score =
Novelty × 0.20 +
Substance × 0.25 +
Credibility × 0.20 +
Relevance × 0.20 +
Timeliness × 0.15
```

Do NOT round individual scores in a way that changes the final decision.

---

# 10. ACCEPTANCE POLICY

Use the following as editorial guidance:

### 75–100

Strong candidate.

Normally ACCEPT.

### 70–74

Potentially publishable.

ACCEPT when substance, relevance, and credibility are sufficiently strong.

### 65–69

Borderline.

Normally reject unless there is a specific editorial reason to publish.

### Below 65

REJECT.

## IMPORTANT

There is **NO target acceptance percentage**.

Do NOT attempt to achieve:

* 30% acceptance
* 50% acceptance
* 70% rejection
* Any other predetermined ratio

The acceptance ratio must naturally emerge from candidate quality.

Never weaken the criteria simply because too few candidates were accepted.

Never reject strong candidates merely because too many candidates were already accepted.

---

# 11. CRITICAL LLM FAILURE RULE

An LLM/API failure is NOT an editorial decision.

If the evaluator encounters:

* HTTP 429
* Rate limit
* Timeout
* API failure
* Invalid response
* Model unavailable
* JSON parsing failure
* Network failure
* Token limit
* Provider failure

DO NOT automatically ACCEPT.

DO NOT automatically REJECT.

DO NOT use keyword matching as a substitute for semantic evaluation.

Instead mark:

```text
evaluation_status = "PENDING_RETRY"
```

or:

```text
evaluation_status = "EVALUATION_FAILED"
```

The candidate must be retried later.

Example:

```text
LLM Error: 429 Rate Limit
```

must NEVER produce:

```text
ACCEPTED
```

based on a fallback keyword/category evaluator.

This is a mandatory rule.

---

# 12. FALLBACK EVALUATOR

A fallback evaluator may only perform:

* Basic validation
* Duplicate detection
* Promotional-content detection
* Obvious spam detection
* Obvious non-technology detection

The fallback evaluator must NOT make a final ACCEPT decision based only on:

* keyword matches
* category count
* title analysis
* source name

If the primary semantic evaluator is unavailable, the candidate should remain:

```text
PENDING_RETRY
```

unless it is obviously disqualified by deterministic rules.

---

# 13. ACCEPTANCE REQUIRES EVIDENCE

An ACCEPTED candidate must have enough evidence for original analysis.

Before accepting, verify:

```text
Is there enough source material?
        ↓
Can the development be explained?
        ↓
Can the system add original analysis?
        ↓
Is the topic currently relevant?
        ↓
Is the information credible enough?
        ↓
Would publishing this provide value to the reader?
```

If the answer to the critical questions is mostly yes → ACCEPT.

If the candidate is merely a title, announcement, promotion, generic advice page, or shallow list → REJECT.

---

# 14. EXAMPLES OF GOOD DECISIONS

## Example A — Promotional content

Title:

"Today's last day to get $400 off TechCrunch Disrupt tickets"

Decision:

REJECT

Reason:

"Rejected because the page primarily promotes ticket sales rather than presenting a substantive technology development or analysis."

---

## Example B — Old content

Title:

"How easy it is to intercept mobile phone calls using an IMSI Catcher"

Published:

2015

Decision:

REJECT unless a current development makes it relevant.

Reason:

"Rejected because the source is substantially outdated and no current development or update was identified."

---

## Example C — Technology industry analysis

Title:

"Software/Web Development Is Not Software Engineering"

Decision:

Do NOT automatically reject.

Inspect the article.

If it contains substantive analysis about:

* software engineering practices
* architecture
* development processes
* system design
* engineering responsibilities
* differences between development and engineering

then it may be publishable.

If it is only a shallow opinion with insufficient evidence, reject.

The rejection must explain that actual weakness.

---

## Example D — Strong technical development

Title:

"New open-source model reduces inference cost by 40%"

Decision:

Potentially ACCEPT.

Investigate:

* What changed?
* How was the improvement achieved?
* Is there technical evidence?
* Who released it?
* What benchmark supports the claim?
* Why does it matter?
* What are the limitations?

---

# 15. DUPLICATE DETECTION

Deduplicate candidates before evaluation.

Use:

1. Canonical URL
2. Normalized URL
3. Source ID
4. Normalized title
5. Semantic similarity
6. Previously published topics

A candidate must not be evaluated twice within the same cycle.

A previously published topic must not be republished simply because it appears under a different URL.

Example:

Article A:

"OpenAI launches new reasoning model"

Article B:

"New OpenAI reasoning model changes AI landscape"

If they discuss substantially the same development, treat them as the same editorial topic unless the second article provides genuinely new information.

---

# 16. MEMORY

Store:

```json
{
  "canonicalUrl": "...",
  "title": "...",
  "topicFingerprint": "...",
  "source": "...",
  "decision": "accepted/rejected/pending",
  "score": 82,
  "published": true,
  "publishedAt": "...",
  "reason": "...",
  "processedAt": "..."
}
```

Memory must influence future selection.

The system should avoid repeatedly publishing the same:

* Story
* Event
* Product announcement
* Research result
* Company development
* Topic angle

unless there is a meaningful new development.

---

# 17. EDITORIAL DIVERSITY

Do not let the feed become dominated by one category.

Track recent publication distribution across:

* AI
* Cybersecurity
* Software Engineering
* Developer Tools
* Open Source
* Cloud
* Databases
* Robotics
* Industry Trends
* Programming
* Infrastructure

When multiple candidates have similar scores, prefer the candidate that improves editorial diversity.

Example:

If the previous five posts were about AI models, a strong cybersecurity or software engineering candidate should receive a diversity preference when scores are otherwise similar.

Diversity is a tie-breaker, NOT a reason to publish weak content.

---

# 18. SELECTION

After evaluation:

1. Remove rejected candidates.
2. Remove pending/failed evaluations.
3. Sort remaining candidates by editorial score.
4. Consider diversity.
5. Consider freshness.
6. Consider duplicate/topic memory.
7. Select the strongest candidates.

Do not publish every accepted candidate if the publishing policy limits the number of posts per cycle.

The system must behave like an editor selecting the **best opportunities**, not a feed aggregator.

---

# 19. ACCEPTED TOPIC RATIONALE

Every accepted candidate must expose:

```json
{
  "overallScore": 84,
  "noveltyScore": 82,
  "substanceScore": 90,
  "credibilityScore": 85,
  "relevanceScore": 88,
  "timelinessScore": 76,
  "whySelected": "...",
  "whyNow": "...",
  "personaFit": "...",
  "whyPreferred": "..."
}
```

The rationale must reference the actual candidate.

Do not generate generic explanations.

BAD:

> "This is relevant to technology."

GOOD:

> "Selected because the project introduces a new approach to reducing inference costs and provides benchmark evidence that allows meaningful analysis of its practical impact on AI infrastructure."

---

# 20. REJECTION RATIONALE

Every rejected candidate must receive one specific human-readable reason.

Good:

> "Rejected because the page is primarily an event promotion and does not contain substantive technology analysis."

Good:

> "Rejected because the source is a generic cybersecurity podcast directory rather than a specific technology development."

Good:

> "Rejected because the article is from 2015 and no current development was identified that makes the information timely."

Good:

> "Rejected because the available material provides only a broad opinion without sufficient technical evidence for original analysis."

Bad:

> "Weak relevance."

Bad:

> "Low authority."

Bad:

> "Keywords matched poorly."

Bad:

> "Not enough technology keywords."

---

# 21. WRITING

For accepted candidates, generate an original technology article.

The article must:

* Explain the underlying development.
* Provide context.
* Add original analysis.
* Explain why it matters.
* Discuss practical implications.
* Mention limitations when relevant.
* Distinguish source facts from AI-generated analysis.
* Avoid copying the source.
* Avoid inventing facts.
* Maintain the configured editorial persona.

The article should NOT merely summarize the source.

---

# 22. FACT VS ANALYSIS

Clearly distinguish:

### FACT

Information directly supported by the available sources.

### ANALYSIS

Reasoning, interpretation, implications, comparisons, and conclusions produced by the AI.

Never present speculation as established fact.

If information cannot be verified:

> "The available source does not provide enough evidence to confirm this."

Do not invent missing details.

---

# 23. PUBLISHING OBJECTIVE

The system should optimize for:

```text
QUALITY > QUANTITY
```

Never:

```text
QUANTITY > QUALITY
```

Publishing nothing is a valid outcome.

If no candidate meets the editorial standard:

```text
No publication selected for this cycle.
```

That is considered successful system behavior.

---

# 24. REQUIRED FINAL POST STRUCTURE

Every published item must contain:

```json
{
  "text": "Original technology analysis",
  "rationale": {
    "overallScore": 0,
    "novelty": 0,
    "substance": 0,
    "credibility": 0,
    "relevance": 0,
    "timeliness": 0,
    "whySelected": "...",
    "whyNow": "...",
    "personaFit": "...",
    "whyPreferred": "..."
  },
  "sources": [
    "source URL"
  ],
  "topic": "...",
  "publishedAt": "..."
}
```

---

# 25. MOST IMPORTANT SYSTEM RULES

The following rules override convenience:

### RULE 1

**Never use keyword count as the primary editorial evaluator.**

### RULE 2

**Never allow an LLM/API error to become an ACCEPT decision.**

### RULE 3

**Never fabricate an acceptance/rejection percentage.**

### RULE 4

**Never treat old content as current simply because it was newly discovered.**

### RULE 5

**Never evaluate a title without attempting to inspect the underlying content.**

### RULE 6

**Never publish simply because a candidate matches technology categories.**

### RULE 7

**Never reject a legitimate technology topic merely because it lacks a specific keyword.**

### RULE 8

**Never evaluate the same candidate repeatedly.**

### RULE 9

**Use semantic similarity to prevent near-duplicate topics.**

### RULE 10

**If the evaluator fails, mark the candidate PENDING_RETRY rather than guessing.**

### RULE 11

**A candidate with fewer technology categories can be better than one with many categories.**

### RULE 12

**The agent must prefer current, substantive, verifiable technology developments.**

### RULE 13

**If no candidate is genuinely strong enough, publish nothing.**

### RULE 14

**Editorial quality determines acceptance. Acceptance does not determine editorial quality.**

---

# 26. AUTONOMOUS DECISION LOOP

Every cycle must follow:

```text
DISCOVER
   ↓
COLLECT REAL DATA
   ↓
VALIDATE SOURCES
   ↓
CHECK DATE / CURRENTNESS
   ↓
CANONICALIZE URL
   ↓
DEDUPLICATE
   ↓
REMOVE OBVIOUS PROMOTIONAL/SPAM CONTENT
   ↓
FETCH/INSPECT CONTENT
   ↓
SEMANTIC TECHNOLOGY ANALYSIS
   ↓
EDITORIAL SCORING
   ↓
QUALITY CHECK
   ↓
REJECT / PENDING RETRY / ACCEPT
   ↓
RANK ACCEPTED CANDIDATES
   ↓
APPLY DIVERSITY + MEMORY
   ↓
SELECT BEST TOPICS
   ↓
WRITE ORIGINAL ANALYSIS
   ↓
VERIFY FACTS
   ↓
PUBLISH
   ↓
STORE MEMORY
```

The autonomous creator must behave as a **selective technology editor with memory**, not as a keyword-based content generator.
