export const calculateOperation = (left, nextOperator, right) => {
  const safeLeft = Number.isFinite(left) ? left : 0;
  const safeRight = Number.isFinite(right) ? right : 0;

  switch (nextOperator) {
    case '+':
      return safeLeft + safeRight;
    case '-':
      return safeLeft - safeRight;
    case '*':
      return safeLeft * safeRight;
    case '/':
      return safeRight === 0 ? safeLeft : safeLeft / safeRight;
    default:
      return safeRight;
  }
};

export const appendCalculatorDigit = ({ display, waitingForOperand, digit }) => {
  if (digit === '.') {
    if (waitingForOperand) {
      return '0.';
    }

    return String(display).includes('.') ? String(display) : `${display}.`;
  }

  if (waitingForOperand) {
    return digit;
  }

  return String(display) === '0' ? digit : `${display}${digit}`;
};

export const applyCalculatorOperator = ({
  display,
  prevValue,
  operator,
  nextOperator,
}) => {
  const inputValue = Number.parseFloat(display);
  if (!Number.isFinite(inputValue)) {
    return {
      display: '0',
      prevValue: null,
      operator: null,
      waitingForOperand: false,
    };
  }

  if (prevValue === null) {
    return {
      display: String(inputValue),
      prevValue: inputValue,
      operator: nextOperator,
      waitingForOperand: true,
    };
  }

  const nextValue = operator
    ? calculateOperation(prevValue, operator, inputValue)
    : inputValue;

  return {
    display: String(nextValue),
    prevValue: nextValue,
    operator: nextOperator,
    waitingForOperand: true,
  };
};

export const resolveCalculatorValue = ({
  display,
  prevValue,
  operator,
}) => {
  if (!operator) {
    return {
      display,
      prevValue: null,
      operator: null,
      waitingForOperand: true,
    };
  }

  const inputValue = Number.parseFloat(display);
  const nextValue = calculateOperation(prevValue, operator, inputValue);

  return {
    display: String(nextValue),
    prevValue: null,
    operator: null,
    waitingForOperand: true,
  };
};
