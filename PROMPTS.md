# Autonomous AI Creator — Prompt & Editorial Specification

## 1. System Objective

Build an autonomous AI technology creator that independently discovers, evaluates, writes, and publishes technology-focused content without requiring additional human prompts after initialization.

The autonomous pipeline is:

DISCOVER → FILTER → EVALUATE → SELECT → WRITE → PUBLISH → REMEMBER

The agent behaves like a selective technology editor rather than a system that publishes every discovered topic.

---

## 2. Autonomous Discovery

Continuously discover candidates from live technology sources such as:

- Hacker News
- TechCrunch
- Ars Technica
- Engineering blogs
- Developer blogs
- GitHub
- Research and technical publications
- Other credible technology sources

Each evaluation cycle should inspect a sufficiently large candidate pool, preferably 20+ candidates when available.

Candidates must be normalized and deduplicated before evaluation using:

1. Canonical URL
2. Normalized title
3. Source ID when available

The same candidate must never be evaluated repeatedly.

---

## 3. Editorial Filtering

Remove obvious low-value candidates before expensive LLM evaluation.

Automatically reject content that is clearly:

- Advertising
- Ticket or conference promotion
- Discounts or sales
- Job advertisements
- Affiliate/promotional content
- Spam
- Non-technology content
- Duplicate content
- Extremely shallow content
- Clearly unsupported or misleading content

Example:

"Today's last day to get $400 off TechCrunch Disrupt tickets"

→ REJECT because it is promotional content rather than substantive technology analysis.

---

## 4. Editorial Evaluation

Evaluate legitimate candidates semantically rather than using keyword counts.

Score every candidate from 0–100 on five dimensions:

| Factor | Weight | Question |
|---|---:|---|
| Novelty | 20% | Does the topic offer something meaningfully new or interesting? |
| Substance | 25% | Is there enough information for useful analysis? |
| Credibility | 20% | Is the source reasonably trustworthy? |
| Relevance | 20% | Is it meaningfully connected to AI or technology? |
| Timeliness | 15% | Is it currently important or useful now? |

Final Score:

Novelty × 0.20 + Substance × 0.25 + Credibility × 0.20 + Relevance × 0.20 + Timeliness × 0.15

### Decision Policy

- 75–100 → ACCEPT
- 70–74 → ACCEPT when substance and relevance are strong
- 65–69 → BORDERLINE; publish only when there is a strong editorial reason
- Below 65 → REJECT

A candidate must not be rejected solely because one score is moderate.

Keyword-match counts must never be the primary acceptance or rejection mechanism.

---

## 5. Relevance

Relevant areas include:

- Artificial Intelligence
- Machine Learning
- AI Security
- Cybersecurity
- Software Engineering
- Programming
- Developer Tools
- AI Agents
- Cloud Computing
- Databases
- Open Source
- Robotics
- Automation
- Computer Science
- Technology Infrastructure
- Technical Careers
- Developer Education
- AI Adoption
- Engineering Practices
- Technology Industry Trends

The persona's domain should influence ranking, but legitimate technology topics outside its narrowest specialty may still be accepted when they provide meaningful analysis.

For example:

"What will tech employment look like in 10 years?"

should be evaluated as a legitimate technology-industry topic rather than rejected simply because it does not contain a narrow AI keyword.

---

## 6. Source Evaluation

Source credibility affects the credibility score rather than automatically determining the decision.

Potentially valid sources include:

- Hacker News
- TechCrunch
- Ars Technica
- GitHub
- Engineering blogs
- Developer blogs
- Research publications
- Official documentation
- Technical YouTube content
- Personal engineering blogs
- Stack Overflow

A strong technical discussion does not require a GitHub repository or academic paper to be publishable.

---

## 7. Editorial Selection

The agent should discover many candidates and select only the strongest opportunities.

The desired behavior is:

DISCOVER MANY
↓
FILTER NOISE
↓
EVALUATE QUALITY
↓
REJECT WEAK CANDIDATES
↓
SELECT STRONG CANDIDATES
↓
WRITE ORIGINAL ANALYSIS
↓
PUBLISH
↓
REMEMBER

The acceptance ratio is an outcome of editorial quality, not a fabricated result.

The system must never publish weak content merely to increase the number of posts.

---

## 8. Accepted Topic Rationale

Every accepted post must expose transparent editorial reasoning.

Include:

- Overall score
- Novelty score
- Substance score
- Credibility score
- Relevance score
- Timeliness score
- Why the topic was selected
- Why it matters now
- Why it fits the persona
- Why it was preferable to other candidates

Example:

"This topic was selected because it addresses an important technology-industry question with implications for AI-assisted development and the future role of software engineers. It provides sufficient substance for original analysis and has stronger editorial value than the promotional and low-context candidates discovered during this cycle."

---

## 9. Rejection Rationale

Rejected candidates must receive a specific, human-readable reason.

Good examples:

- "Rejected because the source is primarily promoting an event."
- "Rejected because the available material is too shallow for meaningful technical analysis."
- "Rejected because an equivalent topic has already been published."
- "Rejected because the claims lack sufficient supporting evidence."

Avoid generic reasons such as:

- "Keywords matched X"
- "Weak relevance"
- "Low authority"

The reason should explain the actual editorial decision.

---

## 10. Memory & Continuity

The agent must remember previously processed and published content.

Memory should prevent:

- Duplicate posts
- Repeated topics
- Repeated URLs
- Near-identical articles

Previously published content should influence future editorial selection so the feed develops variety and continuity over time.

---

## 11. Writing Rules

For accepted candidates, generate an original technology post in the configured persona's consistent voice.

The post should:

- Explain the underlying development
- Add original analysis
- Explain why it matters
- Avoid simply copying the source
- Remain focused on AI and technology
- Maintain a recognizable editorial personality
- Clearly distinguish facts from analysis

Each published post must contain:

```json
{
  "text": "Original technology analysis",
  "rationale": "Why selected, why now, why it fits the persona, and why it was preferred",
  "sources": ["source URL"]
}