import { describe, expect, it } from 'vitest';
import {
  assertAssigneeAllowsInProgress,
  assertBlockersAllowDone,
  assertDeliverablesAllowDone,
  isDoneColumnTitle,
  isInProgressColumnTitle,
} from './taskStatus.js';

describe('taskStatus domain rules', () => {
  it('detects Done and In Progress columns accurately', () => {
    expect(isDoneColumnTitle('Done')).toBe(true);
    expect(isDoneColumnTitle('Ready for Done')).toBe(true);
    expect(isDoneColumnTitle('To Do')).toBe(false);

    expect(isInProgressColumnTitle('In Progress')).toBe(true);
    expect(isInProgressColumnTitle('Work in Progress')).toBe(true);
    expect(isInProgressColumnTitle('To Do')).toBe(false);
  });

  it('assertAssigneeAllowsInProgress enforces at least one assignee', () => {
    expect(() => assertAssigneeAllowsInProgress([])).toThrowError(/at least one assigned member/);
    expect(() => assertAssigneeAllowsInProgress(['usr-1'])).not.toThrow();
  });

  it('assertDeliverablesAllowDone blocks Done if subtasks are incomplete', () => {
    expect(() => assertDeliverablesAllowDone([])).not.toThrow();
    expect(() =>
      assertDeliverablesAllowDone([{ completed: true }, { completed: true }])
    ).not.toThrow();
    expect(() =>
      assertDeliverablesAllowDone([{ completed: true }, { completed: false }])
    ).toThrowError(/deliverable\(s\) still incomplete/);
  });

  it('assertBlockersAllowDone blocks Done if dependencies are unfinished', () => {
    expect(() => assertBlockersAllowDone([])).not.toThrow();
    expect(() =>
      assertBlockersAllowDone([{ id: 'task-1', title: 'Task 1', done: true }])
    ).not.toThrow();
    expect(() =>
      assertBlockersAllowDone([
        { id: 'task-1', title: 'Design spec', done: false },
      ])
    ).toThrowError(/blocked by "Design spec"/);
  });
});
