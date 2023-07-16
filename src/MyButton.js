import React, { useEffect, useContext } from 'react';
import './MyButton.css';

const MyButtonContext = React.createContext();

function MyButton({ value }) {
  const { selectedValues, onChange } = useContext(MyButtonContext);
  const selected = selectedValues.includes(value);

  const handleClick = () => {
    // If this button was selected, add its value to the array of selected values
    // Otherwise, remove its value from the array
    if (selected) {
      onChange(selectedValues.filter(val => val !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <button
      className={`my-button ${selected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      {value}
    </button>
  );
}

function MyButtonGroup({ children, value, onChange }) {
  return (
    <MyButtonContext.Provider value={{ selectedValues: value, onChange }}>
      {children}
    </MyButtonContext.Provider>
  );
}

export { MyButton, MyButtonGroup };
