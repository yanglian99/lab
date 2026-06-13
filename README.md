# llm-council-java

A small Java implementation inspired by [karpathy/llm-council](https://github.com/karpathy/llm-council). It keeps the same three-stage idea:

1. collect first-pass answers from multiple models,
2. ask the models to review anonymized peer answers,
3. ask a chairman model to synthesize the final response.

## Requirements

- Java 17+
- Maven 3.9+
- An `OPENROUTER_API_KEY`

## Configuration

Set these environment variables before running:

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
export COUNCIL_MODEL_1=openai/gpt-4o-mini
export COUNCIL_MODEL_2=anthropic/claude-3.5-sonnet
export COUNCIL_MODEL_3=google/gemini-2.0-flash-001
export CHAIRMAN_MODEL=openai/gpt-4o-mini
```

Optional variables:

- `OPENROUTER_BASE_URL` defaults to `https://openrouter.ai/api/v1/chat/completions`
- `LLM_TEMPERATURE` defaults to `0.2`

## Run

```bash
mvn test
mvn exec:java -Dexec.args="Explain the CAP theorem with practical examples"
```

## Project structure

- `CouncilConfig` loads environment-based configuration.
- `OpenRouterClient` sends chat-completion requests with Java's built-in `HttpClient`.
- `CouncilWorkflow` implements the three-stage council flow.
- `Main` is a simple CLI entry point.
