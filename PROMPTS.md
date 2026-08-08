SYSTEM OVERVIEW
This is an Autonomous AI Creator that discovers, evaluates, writes, and publishes technology content without human intervention.

The system operates on a 5-step autonomous loop:

DISCOVER — Fetch trending topics from HackerNews and other sources
FILTER — Remove obvious noise (ads, spam, promotions)
EVALUATE — Use LLM-powered 5-factor editorial judgment
WRITE — Generate an original post in the persona's voice
PUBLISH — Save to database and display on the public feed
EDITORIAL PHILOSOPHY
The agent should behave like a selective technology editor, not like an AI content generator that tries to publish everything it finds.

The desired behavior is:


DISCOVER MANY
      ↓
FILTER AGGRESSIVELY
      ↓
EVALUATE QUALITY
      ↓
REJECT MOST
      ↓
SELECT THE BEST
      ↓
PUBLISH
Target acceptance rate: ~30% ACCEPT / ~70% REJECT

This is a TARGET RANGE, not a hardcoded fake result. The agent must still make a meaningful editorial decision. The actual rate should naturally emerge from editorial scoring.

Acceptable natural range:

20–35% accepted
65–80% rejected
Do NOT force exactly 30% if the actual candidate quality differs.

ACCEPTANCE CRITERIA
Accept a topic when it satisfies most of these:

Relevant to AI/technology
Meaningful technical or industry substance
Reasonable source credibility
Useful for the configured persona
Sufficiently current OR has strong evergreen analytical value
Not a duplicate
Can support an original analysis
A topic does NOT need to be perfect.

Do NOT require:

GitHub repository
Whitepaper
Academic research paper
Official company source
for every accepted topic.

5-FACTOR SCORING RUBRIC
Evaluate each candidate on these 5 dimensions (0-100):

Factor	Weight	Description
Novelty	20%	Does this provide something meaningfully new?
Substance	25%	Is there enough technical depth or analytical substance?
Credibility	20%	Is the source trustworthy?
Relevance	20%	Does this relate to technology/engineering/persona's domain?
Timeliness	15%	Is this topic currently relevant or timely?
Final Score = Novelty(20%) + Substance(25%) + Credibility(20%) + Relevance(20%) + Timeliness(15%)

DECISION GUIDE
Score Range	Decision
75–100	ACCEPT — Strong candidate worth publishing
70–74	ACCEPT if substance AND relevance are both very strong (≥75)
65–69	CONSIDER — Borderline, do not auto-accept
50–64	REJECT — Insufficient quality for publication
Below 50	REJECT — Clearly weak, off-topic, or promotional
Do NOT reject a topic only because one individual score is moderate. Use the overall score.

RELEVANCE LOGIC
Determine relevance semantically, not by keyword count.

A topic is relevant if it meaningfully discusses ANY of:

Artificial intelligence
Machine learning
Software engineering
Software development
Web development
Programming
Developer tools
Cloud computing
Cybersecurity / AI security
Databases
Open source
Computer science
Robotics
Automation
Technology industry
Technical careers
Developer education
Technology trends
AI adoption
Computing infrastructure
Technical research
Engineering practices
The configured persona should influence ranking, but a topic does NOT need to exactly match the persona's narrowest specialty to be considered relevant.

Keyword count must NEVER be the primary reason for rejecting a candidate.

SOURCE AUTHORITY
Source credibility should affect the SCORE, not automatically cause rejection.

Do NOT require academic papers, GitHub repos, or official company sources for every accepted topic.

Sources that can be considered:

Hacker News discussions
TechCrunch / Ars Technica
Developer blogs / Engineering blogs
GitHub repositories
YouTube technical content
Personal engineering blogs
Research publications
Official documentation
Stack Overflow
A Hacker News discussion containing meaningful technical discussion can be accepted. A personal engineering blog containing strong technical analysis can be accepted.

HARD REJECTION
Always automatically reject if clearly:

Advertising
Ticket sales
Conference promotion
Discount promotion
Job advertisement
Affiliate marketing
Spam
Unrelated content (non-technology)
Duplicate content
Extremely shallow content
Obvious misinformation
Example REJECT:

"Today's last day to get $400 off TechCrunch Disrupt tickets" → REJECT: "Promotional event content with no substantive technology analysis."

Example DO NOT REJECT:

"What will tech employment look like in 10 years?" → EVALUATE: Legitimate technology-industry topic.

REJECTION REASONS
Remove generic messages. Instead identify the ACTUAL reason.

Good rejection reasons:

"Rejected because this is primarily event promotion."
"Rejected because the article contains insufficient technical substance for meaningful analysis."
"Rejected because a substantially similar topic was already published."
"Rejected because the source provides unsupported claims with insufficient evidence."
Bad rejection reasons:

"Rejected because keywords matched 8."
"Rejected because relevance or authority was low."
"weak relevance to the configured AI & technology persona"
The reason must explain the actual editorial decision.

ACCEPTED TOPIC RATIONALE
For every accepted topic, generate:

Final score
Novelty score
Substance score
Credibility score
Relevance score
Timeliness score
Why selected
Why relevant now
Why it fits the persona
Why it was selected over other candidates
Example:

Topic: "What will tech employment look like in 10 years?" Decision: ACCEPT Reason: "This topic was selected because it explores a major technology-industry question with direct implications for software engineers and AI-driven employment. While it is not a breaking technical release, it provides substantial room for analysis around automation, AI-assisted development, changing engineering roles, and future workforce requirements."

CANDIDATE DEDUPLICATION
The system must not discover the SAME topic repeatedly.

Normalize candidate identity using:

Canonical URL
Normalized title (lowercase, trim whitespace, remove punctuation)
Source ID when available
Before evaluating a candidate:

If the same URL has already been processed → skip
If the same normalized title appears multiple times → keep only ONE
Do NOT create multiple rejection records for the same candidate.

DIVERSITY OF ACCEPTED TOPICS
Give legitimate opportunities to topics such as:

AI research
AI security
Cybersecurity
Software engineering
Developer tools
AI agents
Open source
Machine learning
Cloud infrastructure
Databases
Robotics
Technology trends
Technical careers
AI adoption
Engineering practices
Do NOT narrow acceptance only to academic research.

WRITER OUTPUT FORMAT
For every published post, the writer must generate:

json

{
  "text": "Full markdown content of the post...",
  "rationale": "4-point editorial rationale: 1. Why this topic? 2. Why now? 3. Why over other candidates? 4. What makes it valuable to the audience?",
  "sources": ["source URLs"]
}
The rationale must sound like an editorial decision, not an AI explanation.

WHAT THE SYSTEM MUST DEMONSTRATE

DISCOVER MANY TOPICS
      ↓
EVALUATE THEM WITH 5-FACTOR SCORING
      ↓
REJECT WEAK CONTENT (~70%)
      ↓
ACCEPT GOOD CONTENT (~30%)
      ↓
EXPLAIN WHY (specific reasons)
      ↓
PUBLISH SELECTED CONTENT
This project should NOT look like "AI found something → AI wrote something."

It should look like "AI found 30 things → AI rejected most of them → AI investigated the strongest candidates → AI selected the best one → AI wrote an original analysis → AI published it with full editorial transparency."

IMPORTANT RULES
The system must not treat keyword count as sufficient evidence that a topic deserves publication or rejection.
NEVER publish a weak topic simply because the system needs content.
Do NOT optimize the system for rejection. Do NOT optimize it for acceptance. Optimize it for CORRECT EDITORIAL JUDGMENT.
Do not change anything outside the editorial evaluator and candidate deduplication logic.
The fallback evaluator (when LLM is unavailable) must also use semantic topic matching, not keyword counting.