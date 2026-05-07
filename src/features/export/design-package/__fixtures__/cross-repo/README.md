# Cross-repo design-package fixtures

These JSON files are the FIGMII → readme-app pipeline's cross-repo contract artifacts (Phase F of `figmii-readme-app-pipeline-plan.md`).

Each fixture is asserted against in **two** repos:

- **FIGMII** (this repo): `src/features/export/design-package/crossRepoSmoke.test.ts` exports a package via the public Agent API and asserts the result equals the fixture.
- **readme-app**: a parallel test imports the same JSON and asserts the validator + renderer accept it (Phase F readme-app half — pending separate PR).

If the FIGMII exporter or the readme-app validator schema changes, one side's test breaks first. That break is the contract working: investigate which side drifted, fix or regenerate accordingly.

## Regenerating

Don't hand-edit. To regenerate after an intentional exporter change:

```
FIGMII_REGENERATE_CROSS_REPO_FIXTURE=1 npm run test -- --run crossRepoSmoke
```

Then re-run without the env var to confirm the test passes against the new fixture, and update the readme-app counterpart in lockstep.
