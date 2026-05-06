import { useState } from 'react';
import {
  appendCalculatorDigit,
  applyCalculatorOperator,
  resolveCalculatorValue,
} from '../utils/calculator';

export const useCalculator = () => {
  const [showKeypad, setShowKeypad] = useState(false);
  const [activeInputKey, setActiveInputKey] = useState(null);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const openKeypad = (keyOrConfig, currentVal) => {
    setActiveInputKey(keyOrConfig);
    setCalcDisplay(String(currentVal ?? '0') || '0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setShowKeypad(true);
  };

  const closeKeypad = () => {
    setShowKeypad(false);
    setActiveInputKey(null);
  };

  const handleDigit = (digit) => {
    setCalcDisplay((current) => appendCalculatorDigit({
      display: current,
      waitingForOperand,
      digit,
    }));
    setWaitingForOperand(false);
  };

  const handleOperator = (nextOperator) => {
    const nextState = applyCalculatorOperator({
      display: calcDisplay,
      prevValue,
      operator,
      nextOperator,
    });
    setCalcDisplay(nextState.display);
    setPrevValue(nextState.prevValue);
    setOperator(nextState.operator);
    setWaitingForOperand(nextState.waitingForOperand);
  };

  const handleEquals = () => {
    const nextState = resolveCalculatorValue({
      display: calcDisplay,
      prevValue,
      operator,
    });
    setCalcDisplay(nextState.display);
    setPrevValue(nextState.prevValue);
    setOperator(nextState.operator);
    setWaitingForOperand(nextState.waitingForOperand);
  };

  const handleCalculatorClear = () => {
    setCalcDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleDelete = () => {
    setCalcDisplay((current) => {
      const text = String(current || '0');
      return text.length > 1 ? text.slice(0, -1) : '0';
    });
  };

  return {
    showKeypad,
    setShowKeypad,
    activeInputKey,
    calcDisplay,
    prevValue,
    operator,
    openKeypad,
    closeKeypad,
    handleDigit,
    handleOperator,
    handleEquals,
    handleCalculatorClear,
    handleDelete,
  };
};
