# AI System Prompts Documentation

## Overview

This document describes the comprehensive system prompts designed to ensure the AI thoroughly reads and analyzes all provided data sources before generating answers. The prompts are modular, reusable, and specifically designed for the fact-checking system.

## Design Philosophy

The system prompts are built on the principle of **mandatory thoroughness**: the AI must read and consider ALL provided data sources before answering. This prevents:
- Skipping important information
- Making assumptions without reading data
- Providing incomplete answers
- Missing cross-source insights

## Prompt Structure

All prompts follow a consistent structure:

1. **Role Definition**: Clear role and expertise area
2. **Critical Instructions**: Mandatory steps the AI must follow
3. **Data Reading Protocol**: Specific requirements for reading data
4. **Output Format**: Structured JSON schema
5. **Rules**: Clear guidelines for processing
6. **Quality Checklist**: Verification steps before finalizing

## Available Prompts

### 1. `FACT_CHECK_SYSTEM_PROMPT`

**Purpose**: Main prompt for fact-checking when good market matches are found.

**Key Features**:
- Mandates reading ALL data sources (markets, news, social media, trends, alternative markets)
- Requires synthesis across multiple source types
- Enforces citation of specific data points
- Includes quality checklist before output

**Usage**: Used in `factCheck.ts` when `matchScore >= 0.35 && confidence >= 0.25`

**Data Sources Considered**:
- Polymarket markets (title, description, probability, volume, liquidity, match scores)
- News articles (title, snippet, source, publication date)
- Twitter tweets (full text, author, engagement metrics)
- Reddit posts (title, text, subreddit, engagement)
- Google Trends (keywords, search interest, related queries)
- Kalshi markets (alternative prediction markets)
- Expiring markets (markets ending on specific dates)

### 2. `FACT_CHECK_WEAK_MATCH_PROMPT`

**Purpose**: For fact-checking when market matches are weak or imperfect.

**Key Features**:
- Emphasizes extracting value from imperfect data
- Requires reading ALL sources even when matches are weak
- Focuses on explaining relevance of related markets
- Still requires synthesis across all data types

**Usage**: Used in `factCheck.ts` when `matchScore < 0.35 || confidence < 0.25`

**Special Instructions**:
- Must explain how related markets might be relevant
- Must incorporate news and social media even if markets are weak
- Must be transparent about limitations while still providing insights

### 3. `RERANK_SYSTEM_PROMPT`

**Purpose**: For AI-based market reranking to match claims with markets.

**Key Features**:
- Requires reading FULL claim and FULL market data
- Compares semantic meaning, not just keywords
- Evaluates timeframe, entity, and question focus alignment
- Provides detailed scoring guidelines (0.0-1.0 scale)

**Usage**: Used in `aiRerank.ts` to score market relevance

**Scoring Guidelines**:
- 0.9-1.0: Perfect or near-perfect match
- 0.8-0.9: Very relevant
- 0.6-0.8: Related topic
- 0.4-0.6: Somewhat related
- 0.2-0.4: Weakly related
- 0.0-0.2: No meaningful relationship

### 4. `PARSE_CLAIM_SYSTEM_PROMPT`

**Purpose**: For parsing user questions into structured claims.

**Key Features**:
- Requires reading ENTIRE question carefully
- Extracts all temporal references, entities, and keywords
- Identifies ambiguities explicitly
- Creates must_include and must_exclude lists

**Usage**: Used in `aiParseClaim.ts` to structure user queries

**Output Schema**:
```json
{
  "claim": "normalized yes/no claim",
  "type": "past_event" | "future_event" | "ongoing" | "numeric",
  "time_window": { "start": "ISO date or null", "end": "ISO date or null" },
  "entities": [{ "name": "string", "type": "string" }],
  "must_include": ["keyword1", "keyword2"],
  "must_exclude": ["wrong_term1"],
  "ambiguities": ["ambiguity1", "ambiguity2"]
}
```

## Data Reading Protocol

All prompts enforce a strict data reading protocol:

### Step 1: Complete Reading
- Read ALL market data (not just summaries)
- Read ALL news articles (title, snippet, source)
- Read ALL social media posts (full text, not truncated)
- Read ALL trends and alternative market data

### Step 2: Cross-Source Synthesis
- Compare market probabilities with news sentiment
- Cross-reference social media discussions with market trends
- Identify patterns across different data types
- Note contradictions or confirmations

### Step 3: Quality Evaluation
- Assess match quality scores
- Consider volume and liquidity as confidence indicators
- Evaluate source credibility
- Consider recency of information

### Step 4: Insight Identification
- What do markets collectively indicate?
- What does news coverage suggest?
- What is social media sentiment?
- Are there conflicting signals?

### Step 5: Answer Construction
- Answer directly using synthesized insights
- Cite specific data points
- Reference relevant sources
- Explain confidence levels
- Acknowledge limitations

## Quality Checklist

Before finalizing any answer, the AI must verify:

- [ ] I have read all market data provided
- [ ] I have read all news articles provided
- [ ] I have read all social media posts provided
- [ ] I have considered Google Trends data if provided
- [ ] I have considered alternative markets if provided
- [ ] I have synthesized insights across multiple sources
- [ ] I have cited specific data points in my answer
- [ ] I have explained confidence/uncertainty appropriately
- [ ] My answer directly addresses the user's question
- [ ] I have not invented any data not provided

## Integration Points

The prompts are integrated into the following files:

1. **`convex/actions/factCheck.ts`**
   - Uses `FACT_CHECK_SYSTEM_PROMPT` for good matches
   - Uses `FACT_CHECK_WEAK_MATCH_PROMPT` for weak matches

2. **`convex/actions/aiRerank.ts`**
   - Uses `RERANK_SYSTEM_PROMPT` for market scoring

3. **`convex/actions/aiParseClaim.ts`**
   - Uses `PARSE_CLAIM_SYSTEM_PROMPT` for question parsing

## Benefits

### 1. Consistency
- All AI interactions use standardized, thorough prompts
- Reduces variability in answer quality
- Ensures comprehensive data analysis

### 2. Transparency
- Clear instructions make AI behavior predictable
- Quality checklists ensure completeness
- Explicit requirements prevent shortcuts

### 3. Maintainability
- Centralized prompt definitions
- Easy to update and improve
- Version-controlled prompt changes

### 4. Performance
- Structured prompts lead to better outputs
- Reduces need for follow-up queries
- Improves answer accuracy and completeness

## Best Practices

### When Modifying Prompts

1. **Test Thoroughly**: Test prompt changes with various query types
2. **Maintain Structure**: Keep the critical instructions and checklist format
3. **Be Specific**: Use concrete examples and clear guidelines
4. **Update All References**: If changing a prompt, update all usage points
5. **Document Changes**: Note why changes were made and expected impact

### When Adding New Data Sources

1. **Update Prompts**: Add new data sources to reading protocols
2. **Update Checklists**: Include new sources in quality verification
3. **Test Integration**: Ensure AI properly reads and uses new sources
4. **Update Documentation**: Document new sources in this file

## Example Usage

```typescript
import { FACT_CHECK_SYSTEM_PROMPT } from "../prompts/factCheckSystemPrompt";

// In your AI call:
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
  },
  body: JSON.stringify({
    model: OPENROUTER_CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: FACT_CHECK_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Question: ${question}\n\n[All data sources here]`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  }),
});
```

## Future Enhancements

Potential improvements to consider:

1. **Dynamic Prompt Selection**: Choose prompts based on query complexity
2. **Prompt Versioning**: Track prompt versions for A/B testing
3. **Performance Metrics**: Measure prompt effectiveness
4. **User Feedback Integration**: Incorporate feedback to improve prompts
5. **Multi-Language Support**: Extend prompts for international queries

## Related Documentation

- `convex/prompts/factCheckSystemPrompt.ts` - Source code for all prompts
- `convex/actions/factCheck.ts` - Main fact-checking implementation
- `README.md` - Overall system documentation


