# Debugging and Code Optimization

This guide covers how to use the Debugger and Code Optimizer agents, plus quick reference tips for common issues.

## Debugging Issues

When encountering bugs or issues, use the **Debugger Agent** for systematic debugging.

### When to Use the Debugger Agent

- User reports a bug or error
- Feature not working as expected
- Validation errors
- Type errors
- Authorization failures
- Data not updating/refreshing

### How to Invoke

Use the Task tool to invoke the debugger agent:

```typescript
// Example invocation
Task tool with:
- subagent_type: "general-purpose"
- description: "Debug [brief issue description]"
- prompt: "Act as the DEBUGGER agent from .agents/DEBUGGER.md.

User Issue: [Describe the problem]
Error Message: [Include exact error if available]
Reproduction Steps: [How to reproduce the issue]

Follow the systematic 8-phase debugging process to identify and fix the root cause."
```

### The Debugger Agent Will

1. Understand the problem and classify it
2. Gather context from relevant files
3. Form testable hypotheses
4. Investigate systematically
5. Identify the root cause
6. Implement a minimal fix
7. Verify the fix works
8. Provide a clear report

### Quick Debug Reference

For simple issues you can handle directly:

- **Validation errors**: Check Zod schemas use `.nullable().optional()` for updates
- **Type errors**: Verify types match between frontend/backend
- **Authorization errors**: Check ownership verification in services
- **Data not refreshing**: Ensure `onUpdate?.()` callbacks are called
- **Empty fields not clearing**: Frontend sends `null`, backend accepts `.nullable().optional()`

See [.agents/DEBUGGER.md](../../.agents/DEBUGGER.md) for the complete debugging guide.

## Code Optimization and Refactoring

When you notice code duplication or opportunities for simplification, use the **Code Optimizer Agent** for systematic refactoring.

### When to Use the Code Optimizer Agent

- Pattern repeated 3+ times across codebase
- Manager components have significant duplication
- Services share identical CRUD patterns
- Forms have repeated state management logic
- Utilities/helpers duplicated across files
- Inconsistent implementations of same task
- User requests code cleanup or refactoring

### How to Invoke

Use the Task tool to invoke the code optimizer agent:

```typescript
// Example invocation
Task tool with:
- subagent_type: "general-purpose"
- description: "Optimize code by reducing duplication"
- prompt: "Act as the CODE_OPTIMIZER agent from .agents/CODE_OPTIMIZER.md.

Goal: [What you want to optimize, e.g., 'Reduce Manager component duplication']
Context: [Any specific areas to focus on]

Follow the systematic optimization process:
1. Discover patterns and duplication
2. Analyze if abstraction will simplify code
3. Design the refactoring approach
4. Implement incrementally with testing
5. Document new patterns"
```

### The Code Optimizer Agent Will

1. Discover patterns and duplication across codebase
2. Analyze if abstraction simplifies (follows Rule of Three)
3. Design refactoring that reduces complexity
4. Implement abstractions incrementally
5. Migrate existing code one piece at a time
6. Verify functionality preserved
7. Document new patterns in architecture guides
8. Report on improvements (lines saved, maintainability gains)

### Optimization Principles

- **Rule of Three**: Only abstract after 3+ repetitions
- **Simplify, Don't Complicate**: Abstractions must be easier to understand
- **Incremental**: Refactor one file at a time with testing
- **Follow Conventions**: Use existing project patterns
- **Document**: Update architecture docs with new patterns

### Quick Optimization Opportunities

Common wins:

- **Manager Components**: Extract `useEntityCRUD` hook for common state/CRUD patterns
- **Service Methods**: Create helper functions for ownership verification and update builders
- **Form Handling**: Extract `useFormState` hook for common form patterns
- **API Calls**: Create `useApiCall` hook to reduce try-catch-finally boilerplate
- **Validation Schemas**: Use schema helper utilities for common patterns like `.nullable().optional()`

See [.agents/CODE_OPTIMIZER.md](../../.agents/CODE_OPTIMIZER.md) for the complete optimization guide.
