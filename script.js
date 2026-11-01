const expressionDisplay = document.getElementById('expression');
const resultDisplay = document.getElementById('result');
const keypad = document.querySelector('.keypad');

let expression = '';

const pretty = (value) => value.replaceAll('*', '×').replaceAll('/', '÷');

function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const char = input[i];
    if (char === ' ') { i++; continue; }
    if ('+-*/()%'.includes(char)) { tokens.push(char); i++; continue; }
    if (/[0-9.]/.test(char)) {
      let number = '';
      let dots = 0;
      while (i < input.length && /[0-9.]/.test(input[i])) {
        if (input[i] === '.') dots++;
        if (dots > 1) throw new Error('Invalid number');
        number += input[i++];
      }
      if (number === '.') throw new Error('Invalid number');
      tokens.push(Number(number));
      continue;
    }
    throw new Error('Invalid character');
  }
  return tokens;
}

// Small arithmetic parser: supports precedence, brackets, unary minus and percent.
function calculate(input) {
  const tokens = tokenize(input);
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];

  function primary() {
    if (peek() === '-') { take(); return -primary(); }
    if (peek() === '+') { take(); return primary(); }
    if (peek() === '(') {
      take();
      const value = addSub();
      if (take() !== ')') throw new Error('Missing bracket');
      return value;
    }
    const value = take();
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Incomplete');
    return value;
  }
  function percent() {
    let value = primary();
    while (peek() === '%') { take(); value /= 100; }
    return value;
  }
  function multiplyDivide() {
    let value = percent();
    while (peek() === '*' || peek() === '/') {
      const op = take();
      const right = percent();
      if (op === '/' && right === 0) throw new Error('Cannot divide by zero');
      value = op === '*' ? value * right : value / right;
    }
    return value;
  }
  function addSub() {
    let value = multiplyDivide();
    while (peek() === '+' || peek() === '-') {
      const op = take();
      const right = multiplyDivide();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }

  if (!tokens.length) return 0;
  const answer = addSub();
  if (pos !== tokens.length) throw new Error('Incomplete expression');
  if (!Number.isFinite(answer)) throw new Error('Math error');
  return Number.parseFloat(answer.toPrecision(12));
}

function getLiveResult() {
  if (!expression) return '0';
  try {
    return String(calculate(expression));
  } catch {
    return '…';
  }
}

function updateDisplay() {
  expressionDisplay.textContent = expression ? pretty(expression) : '0';
  resultDisplay.textContent = getLiveResult();
}

function append(value) {
  const operators = ['+', '-', '*', '/'];
  const last = expression.slice(-1);

  if (value === '.') {
    const currentNumber = expression.split(/[+\-*/()%]/).pop();
    if (currentNumber.includes('.')) return;
    if (!currentNumber) value = '0.';
  }

  if (operators.includes(value)) {
    if (!expression && value !== '-') return;
    if (operators.includes(last)) {
      if (value === '-' && last !== '-') {
        expression += value;
        updateDisplay();
        return;
      }
      expression = expression.slice(0, -1);
    }
  }
  if (value === '%' && (!expression || operators.includes(last) || last === '%')) return;
  expression += value;
  updateDisplay();
}

function clearAll() {
  expression = '';
  updateDisplay();
}

function backspace() {
  expression = expression.slice(0, -1);
  updateDisplay();
}

function toggleSign() {
  if (!expression) { expression = '-'; updateDisplay(); return; }
  const match = expression.match(/(\d*\.?\d+)%?$/);
  if (!match) return;
  const start = match.index;
  const number = match[0];
  const before = expression.slice(0, start);
  if (before.endsWith('-') && (before.length === 1 || '+-*/('.includes(before.at(-2)))) {
    expression = before.slice(0, -1) + number;
  } else {
    expression = before + '(-' + number.replace(/%$/, '') + ')' + (number.endsWith('%') ? '%' : '');
  }
  updateDisplay();
}

function equals() {
  if (!expression) return;
  try {
    const answer = calculate(expression);
    expression = String(answer);
    updateDisplay();
  } catch (error) {
    resultDisplay.textContent = error.message === 'Cannot divide by zero' ? 'Cannot divide by 0' : 'Error';
  }
}

keypad.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const { action, value } = button.dataset;
  if (action === 'clear') clearAll();
  else if (action === 'backspace') backspace();
  else if (action === 'sign') toggleSign();
  else if (action === 'equals') equals();
  else if (value) append(({ '×': '*', '÷': '/' })[value] || value);
});

document.addEventListener('keydown', (event) => {
  if (/^[0-9.]$/.test(event.key)) append(event.key);
  else if (['+', '-'].includes(event.key)) append(event.key);
  else if (event.key === '*') append('*');
  else if (event.key === '/') { event.preventDefault(); append('/'); }
  else if (event.key === '%') append('%');
  else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); equals(); }
  else if (event.key === 'Backspace') backspace();
  else if (event.key === 'Escape' || event.key === 'Delete') clearAll();
  else if (event.key === '(' || event.key === ')') append(event.key);
});

updateDisplay();
