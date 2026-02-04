const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Uncomment this block to pass the first stage
const prompt = () => {
  rl.question("$ ", (answer) => {
    if (answer === "exit") {
      rl.close();
      return;
    }
    console.log(`${answer}: command not found`);
    prompt();
  });
};

rl.on("close", () => {
  process.exit(0);
});
prompt();
