# Generic attack list

Fallback bug classes for `harden`, used when the repo's own history names too few. These are examples from other codebases, so apply a class only where the target's domain makes it reachable.

## Numbers

- Division by zero: must raise or be documented, never silently yield infinity or NaN
- Zero, negative zero, negative operands; language-specific modulo and rounding of negatives
- NaN, infinities, integer overflow, float precision at boundaries
- Non-integers where integers are implied

## Collections

- Empty, single element, all duplicates
- Out-of-range and negative indexes
- Mutation of the caller's input
- Size only when the algorithm looks worse than O(n log n)

## Strings

- Empty and whitespace-only
- Unicode: accents, emoji and surrogate pairs, combining marks, case folding
- Consecutive, leading and trailing delimiters
- Round-trips: parse then format, encode then decode

## Objects and recursion

- Circular references in anything that recurses: must terminate
- Missing, null and inherited keys
- Keys written dynamically, such as `__proto__` or `constructor` in JavaScript

## Stateful code and resources

- Double invoke: unsubscribe twice, cancel after completion, close after close
- Leaks: does each registered timer, callback, handle or cache entry have a release path?
- Reentrancy: a callback that calls back into the owner
- Bound methods and handlers used detached from their owner

## Concurrency and async

- Concurrent calls sharing state; lock scope too wide or too narrow
- Failure propagation: is the last error surfaced, or swallowed?
- Cancellation and timeouts mid-operation; zero delay; rapid-fire calls
- Slow dependencies: what does a timeout leave behind?

## I/O boundaries

- Missing, empty, truncated or malformed input
- Empty result vs failed lookup, kept distinct
- Untrusted values reaching a query, path or shell

## Types

Applies only to statically typed stacks: inference widening to an untyped result, and narrowing helpers that stop narrowing.
