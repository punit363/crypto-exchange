const generateTradeId = () => {
    return "trd_" + Math.random().toString(36).substring(2, 15);
  };
  
  export { generateTradeId };