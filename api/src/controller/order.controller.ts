const placeOrder = async (req, res) => {
  try {
    const order = req.body;
    res.send("response");
  } catch (error) {
    console.log(error, "error in order/placeOrder");
  }
};

export { placeOrder };
