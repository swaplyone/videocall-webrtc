// Swaply Formal Call State Machine States
export const CallStates = {
  IDLE: 'IDLE',
  CALLING: 'CALLING',
  RINGING: 'RINGING',
  ACCEPTING: 'ACCEPTING',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  FAILED: 'FAILED',
  ENDED: 'ENDED',
  REJECTED: 'REJECTED',
  TIMEOUT: 'TIMEOUT'
};

// Valid Transitions Matrix
const VALID_TRANSITIONS = {
  [CallStates.IDLE]: [CallStates.CALLING],
  [CallStates.CALLING]: [CallStates.RINGING, CallStates.TIMEOUT, CallStates.ENDED],
  [CallStates.RINGING]: [CallStates.ACCEPTING, CallStates.REJECTED, CallStates.TIMEOUT, CallStates.ENDED],
  [CallStates.ACCEPTING]: [CallStates.CONNECTING, CallStates.FAILED, CallStates.ENDED],
  [CallStates.CONNECTING]: [CallStates.CONNECTED, CallStates.FAILED, CallStates.ENDED],
  [CallStates.CONNECTED]: [CallStates.RECONNECTING, CallStates.ENDED],
  [CallStates.RECONNECTING]: [CallStates.CONNECTED, CallStates.FAILED, CallStates.ENDED],
  [CallStates.FAILED]: [CallStates.IDLE, CallStates.CALLING],
  [CallStates.ENDED]: [CallStates.IDLE, CallStates.CALLING],
  [CallStates.REJECTED]: [CallStates.IDLE, CallStates.CALLING],
  [CallStates.TIMEOUT]: [CallStates.IDLE, CallStates.CALLING]
};

/**
 * Validates whether a state transition from `fromState` to `toState` is allowed.
 * 
 * @param {string} fromState - The current state of the call.
 * @param {string} toState - The desired target state.
 * @returns {boolean} - True if transition is valid, false otherwise.
 */
export function validateCallTransition(fromState, toState) {
  const allowed = VALID_TRANSITIONS[fromState || CallStates.IDLE];
  return allowed ? allowed.includes(toState) : false;
}
