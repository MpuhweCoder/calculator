/* ─── State ──────────────────────────────────────────── */
const state = {
  current:       '0',   // Number currently being entered
  previous:      null,  // Last evaluated value
  operator:      null,  // Pending operator
  justEvaluated: false  // Prevents overwriting on digit after =
};

/* ─── DOM References ─────────────────────────────────── */
const display    = document.getElementById('display');
const expression = document.getElementById('expression');

/* ─── Helpers ────────────────────────────────────────── */

/**
 * Format a number to a readable string,
 * switching to exponential notation if too long.
 */
function fmt(n) {
  const s = parseFloat(n.toPrecision(12)).toString();
  return s.length > 14 ? n.toExponential(6) : s;
}

/**
 * Update the main display and trigger the bump animation.
 */
function setDisplay(val) {
  display.textContent = val;
  display.classList.remove('bump');
  void display.offsetWidth; // Force reflow to restart animation
  display.classList.add('bump');
}

/**
 * Evaluate the current pending operation and return the result.
 */
function evaluate() {
  if (state.operator === null || state.previous === null) return;

  const a = parseFloat(state.previous);
  const b = parseFloat(state.current);
  let result;

  switch (state.operator) {
    case '÷': result = b !== 0 ? a / b : 'Error'; break;
    case '×': result = a * b;                      break;
    case '−': result = a - b;                      break;
    case '+': result = a + b;                      break;
    default:  return;
  }

  return result;
}

/* ─── Actions ────────────────────────────────────────── */
const actions = {

  /** Append a digit to the current number */
  digit(val) {
    if (state.justEvaluated) {
      state.current       = val;
      state.previous      = null;
      state.operator      = null;
      state.justEvaluated = false;
    } else {
      state.current = state.current === '0' ? val : state.current + val;
    }

    if (state.current.length > 12) {
      state.current = state.current.slice(0, 12);
    }

    setDisplay(state.current);

    if (state.operator) {
      expression.textContent = fmt(parseFloat(state.previous)) + ' ' + state.operator;
    }
  },

  /** Set the pending operator, chaining if one is already pending */
  operator(op) {
    state.justEvaluated = false;

    if (state.operator && state.previous !== null) {
      // Chain: evaluate the pending operation first
      const r = evaluate();
      if (r === 'Error') {
        actions.clear();
        display.textContent = 'Error';
        return;
      }
      state.previous = fmt(r);
      state.current  = '0';
      setDisplay(state.previous);
      expression.textContent = fmt(parseFloat(state.previous)) + ' ' + op;
      state.operator = op;
    } else {
      state.previous = state.current;
      state.current  = '0';
      expression.textContent = fmt(parseFloat(state.previous)) + ' ' + op;
      state.operator = op;
    }
  },

  /** Evaluate and show the final result */
  equals() {
    if (state.operator === null || state.previous === null) return;

    expression.textContent =
      fmt(parseFloat(state.previous)) + ' ' +
      state.operator + ' ' +
      state.current + ' =';

    const r = evaluate();

    if (r === 'Error') {
      display.textContent = 'Error';
      actions.clearSoft();
      return;
    }

    const result        = fmt(r);
    state.current       = result;
    state.previous      = null;
    state.operator      = null;
    state.justEvaluated = true;

    setDisplay(result);
  },

  /** Full reset */
  clear() {
    state.current       = '0';
    state.previous      = null;
    state.operator      = null;
    state.justEvaluated = false;
    setDisplay('0');
    expression.textContent = '\u00A0';
  },

  /** Soft reset (state only, no display update) */
  clearSoft() {
    state.current       = '0';
    state.previous      = null;
    state.operator      = null;
    state.justEvaluated = false;
  },

  /** Add a decimal point */
  decimal() {
    if (state.justEvaluated) {
      state.current       = '0';
      state.justEvaluated = false;
    }
    if (!state.current.includes('.')) {
      state.current += '.';
    }
    setDisplay(state.current);
  },

  /** Toggle positive / negative */
  sign() {
    if (state.current === '0') return;
    state.current = state.current.startsWith('-')
      ? state.current.slice(1)
      : '-' + state.current;
    setDisplay(state.current);
  },

  /** Convert to percentage */
  percent() {
    const v       = parseFloat(state.current) / 100;
    state.current = fmt(v);
    setDisplay(state.current);
  }
};

/* ─── Event Delegation (Keypad clicks) ───────────────── */
document.querySelector('.calc-keypad').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const { action, value } = btn.dataset;

  if (action === 'digit' || action === 'operator') {
    actions[action](value);
  } else if (actions[action]) {
    actions[action]();
  }
});

/* ─── Keyboard Support ───────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key >= '0' && e.key <= '9')          actions.digit(e.key);
  else if (e.key === '+')                     actions.operator('+');
  else if (e.key === '-')                     actions.operator('−');
  else if (e.key === '*')                     actions.operator('×');
  else if (e.key === '/') { e.preventDefault(); actions.operator('÷'); }
  else if (e.key === 'Enter' || e.key === '=') actions.equals();
  else if (e.key === 'Backspace') {
    state.current = state.current.length > 1
      ? state.current.slice(0, -1)
      : '0';
    setDisplay(state.current);
  }
  else if (e.key === 'Escape') actions.clear();
  else if (e.key === '.')     actions.decimal();
  else if (e.key === '%')     actions.percent();
});
