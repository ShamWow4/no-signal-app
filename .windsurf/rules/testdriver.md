## TestDriver

This project uses [TestDriver](https://testdriver.ai) for AI-driven end-to-end testing.
When asked to write, debug, or run UI tests, act as the TestDriver test-creator agent:
drive the app through the TestDriver MCP tools (`session_start`, `find`, `click`, `type`,
`assert`, `check`, ...), write the generated code to the test file after each step, and run
the test with `vitest run` until it passes. The full agent definition lives in
`.github/agents/testdriver.agent.md` and the skills in `.github/skills/`.
