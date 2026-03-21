/**
 * Procedure State Machine
 * Enforces valid state transitions for the 9-state procedure lifecycle.
 *
 * Defined in ZCW-BRD-0293 and Screen Registry SCR-03.
 * Procedures follow a strict state machine with defined valid transitions.
 */

import { ProcedureStatus, VALID_PROCEDURE_TRANSITIONS } from '@types/enums';

/**
 * Valid state transitions for procedure lifecycle.
 *
 * 9-state lifecycle:
 * - capsule_return_pending: Capsule sent to patient, awaiting return
 * - capsule_received: Capsule received; processing/uploading
 * - ready_for_review: Video processed; ready for clinician review
 * - draft: Report in draft state
 * - appended_draft: Report has appended section in draft
 * - completed: Report signed
 * - completed_appended: Report signed with appended section
 * - closed: Procedure archived/closed (terminal state)
 * - void: Procedure voided/cancelled (terminal state)
 */
const STATE_TRANSITIONS: Record<ProcedureStatus, ProcedureStatus[]> = VALID_PROCEDURE_TRANSITIONS;

/**
 * Screen routes mapped to procedure status
 * Maps status to the clinician workbench screen route
 */
/**
 * Routes must match ZOCW_REFERENCE.md Section 3 (Status-Based Routing Table)
 * and lib/router.tsx route definitions. Use :procId as the parameter placeholder.
 */
const STATUS_TO_SCREEN: Record<ProcedureStatus, string> = {
  capsule_return_pending: '/workflow/checkin/:procId',       // SCR-08
  capsule_received: '/workflow/upload/:procId',              // SCR-09
  ready_for_review: '/workflow/viewer/:procId',              // SCR-10
  draft: '/workflow/viewer/:procId',                         // SCR-10
  appended_draft: '/workflow/viewer/:procId',                // SCR-10
  completed: '/workflow/report/:procId',                     // SCR-12 (read-only)
  completed_appended: '/workflow/report/:procId',            // SCR-12 (read-only)
  closed: '/workflow/summary/:procId',                       // SCR-11 (read-only)
  void: '/workflow/summary/:procId',                         // SCR-11 (read-only)
};

/**
 * Validate a state transition from one status to another.
 *
 * @param fromStatus - Current procedure status
 * @param toStatus - Target procedure status
 * @returns true if transition is valid, false otherwise
 *
 * @example
 * ```typescript
 * if (validateTransition('ready_for_review', 'draft')) {
 *   // Safe to update status
 * } else {
 *   throw new Error('Invalid state transition');
 * }
 * ```
 */
export function validateTransition(fromStatus: ProcedureStatus, toStatus: ProcedureStatus): boolean {
  // Same status is allowed (idempotent)
  if (fromStatus === toStatus) {
    return true;
  }

  // Check if transition exists in valid transitions
  const validNextStates = STATE_TRANSITIONS[fromStatus] || [];
  return validNextStates.includes(toStatus);
}

/**
 * Get all valid next states from current status.
 *
 * @param currentStatus - Current procedure status
 * @returns Array of valid next statuses
 *
 * @example
 * ```typescript
 * const nextStates = getNextStates('capsule_received');
 * // Returns: ['ready_for_review', 'void']
 * ```
 */
export function getNextStates(currentStatus: ProcedureStatus): ProcedureStatus[] {
  return STATE_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if a status is terminal (no further transitions allowed).
 *
 * Terminal states: 'closed' and 'void'
 *
 * @param status - Procedure status to check
 * @returns true if status is terminal, false otherwise
 *
 * @example
 * ```typescript
 * if (isTerminal('closed')) {
 *   // Cannot modify procedure further
 * }
 * ```
 */
export function isTerminal(status: ProcedureStatus): boolean {
  const nextStates = STATE_TRANSITIONS[status] || [];
  return nextStates.length === 0;
}

/**
 * Get the workbench screen route for a given procedure status.
 *
 * Maps procedure status to UI screen for clinician workbench navigation.
 *
 * @param status - Procedure status
 * @returns Screen route path (use :procId placeholder for procedure ID)
 *
 * @example
 * ```typescript
 * const screen = getWorkflowScreen('draft');
 * // Returns: '/workflow/viewer/:procId'
 *
 * // In navigation:
 * const route = screen.replace(':procId', procedureId);
 * ```
 */
export function getWorkflowScreen(status: ProcedureStatus): string {
  return STATUS_TO_SCREEN[status] || '/workflow/viewer/:procId';
}

/**
 * Get all possible states in the procedure lifecycle.
 *
 * @returns Array of all procedure statuses
 */
export function getAllStates(): ProcedureStatus[] {
  return Object.keys(STATE_TRANSITIONS) as ProcedureStatus[];
}

/**
 * Validate a transition with detailed error message.
 *
 * @param fromStatus - Current status
 * @param toStatus - Target status
 * @returns { valid: boolean; error?: string }
 *
 * @example
 * ```typescript
 * const result = validateTransitionDetailed('closed', 'draft');
 * if (!result.valid) {
 *   console.error(result.error);
 *   // "Cannot transition from 'closed' to 'draft'. Valid transitions: [void]"
 * }
 * ```
 */
export function validateTransitionDetailed(fromStatus: ProcedureStatus, toStatus: ProcedureStatus): {
  valid: boolean;
  error?: string;
} {
  // Same status is allowed
  if (fromStatus === toStatus) {
    return { valid: true };
  }

  // Check if from status exists
  if (!(fromStatus in STATE_TRANSITIONS)) {
    return {
      valid: false,
      error: `Unknown status: '${fromStatus}'`,
    };
  }

  // Check if to status exists
  if (!(toStatus in STATE_TRANSITIONS)) {
    return {
      valid: false,
      error: `Unknown status: '${toStatus}'`,
    };
  }

  // Check valid transition
  const validNextStates = STATE_TRANSITIONS[fromStatus];
  if (!validNextStates.includes(toStatus)) {
    return {
      valid: false,
      error: `Cannot transition from '${fromStatus}' to '${toStatus}'. Valid transitions: [${validNextStates.join(', ')}]`,
    };
  }

  return { valid: true };
}

/**
 * Get transition history path (sequence of states from start to current).
 *
 * Useful for understanding the procedure journey.
 *
 * @param currentStatus - Current status
 * @returns Possible paths from initial state to current status (one example path)
 *
 * @example
 * ```typescript
 * // Returns a possible path to reach 'draft' status
 * const path = getPossiblePath('draft');
 * // Example: ['capsule_return_pending', 'capsule_received', 'ready_for_review', 'draft']
 * ```
 */
export function getPossiblePath(currentStatus: ProcedureStatus): ProcedureStatus[] {
  // Build a possible path using breadth-first search from initial state
  const initialState: ProcedureStatus = 'capsule_return_pending';

  if (currentStatus === initialState) {
    return [initialState];
  }

  const queue: { state: ProcedureStatus; path: ProcedureStatus[] }[] = [
    { state: initialState, path: [initialState] },
  ];
  const visited = new Set<ProcedureStatus>();

  while (queue.length > 0) {
    const { state, path } = queue.shift()!;

    if (state === currentStatus) {
      return path;
    }

    if (visited.has(state)) {
      continue;
    }
    visited.add(state);

    const nextStates = STATE_TRANSITIONS[state] || [];
    for (const nextState of nextStates) {
      queue.push({ state: nextState, path: [...path, nextState] });
    }
  }

  // If no path found, return the current status alone
  return [currentStatus];
}
