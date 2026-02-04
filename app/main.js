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
    const parts = answer.trim().split(" ");
    const command = parts[0];
    const args = parts.slice(1);

    if (command === "echo") {
      console.log(args.join(" "));
      prompt();
      return;
    }

    const builtInCommands = ["echo", "exit", "type"];

    if (command === "type") {
      const target = args[0];

      if (builtInCommands.includes(target)) {
        console.log(`${target} is a shell builtin`);
      } else {
        console.log(`${target}: not found`);
      }
      prompt();
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
