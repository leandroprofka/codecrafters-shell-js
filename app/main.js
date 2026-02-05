const readline = require("readline");
const { spawnSync } = require("child_process");

const fs = require("fs");
const path = require("path");

const builtInCommands = ["echo", "exit", "type", "pwd", "cd"];

function completer(line) {
  const hits = builtInCommands.filter(cmd => cmd.startsWith(line));
  if (hits.length === 0) {
    process.stdout.write("\x07");
    return [[], line];
  }
  if (hits.length === 1) {
    return [[hits[0] + " "], line];
  }
  return [hits, line];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer,
});


function parseInput(input) {
  const args = [];
  let current = "";
  let inSingleQuotes = false;
  let inDoubleQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === "'") {
      if (inDoubleQuotes) {
        current += char;
      } else {
        inSingleQuotes = !inSingleQuotes;
      }
    } else if (char === '"') {
      if (inSingleQuotes) {
        current += char;
      } else {
        inDoubleQuotes = !inDoubleQuotes;
      }
    } else if (char === "\\" && !inSingleQuotes && !inDoubleQuotes) {
      i++;
      current += input[i];
    } else if (char === "\\" && inDoubleQuotes) {
      const next = input[i + 1];
      if (next === "\\" || next === "$" || next === '"' || next === "\n") {
        i++;
        current += next;
      } else {
        current += char;
      }
    } else if (char === " " && !inSingleQuotes && !inDoubleQuotes) {
      if (current.length > 0) {
        args.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    args.push(current);
  }

  return args;
}


// Uncomment this block to pass the first stage
const prompt = () => {
  rl.question("$ ", (answer) => {
    if (answer === "exit") {
      rl.close();
      return;
    }
    const parts = parseInput(answer.trim());
    const command = parts[0];
    let args = parts.slice(1);

    let outputFile = null;
    let appendOutput = false;
    let redirectIndex = args.indexOf(">>");
    if (redirectIndex === -1) redirectIndex = args.indexOf("1>>");
    if (redirectIndex !== -1) {
      appendOutput = true;
    } else {
      redirectIndex = args.indexOf(">");
      if (redirectIndex === -1) redirectIndex = args.indexOf("1>");
    }
    if (redirectIndex !== -1) {
      outputFile = args[redirectIndex + 1];
      args = args.filter((_, i) => i !== redirectIndex && i !== redirectIndex + 1);
    }

    let errorFile = null;
    let appendError = false;
    let errRedirectIndex = args.indexOf("2>>");
    if (errRedirectIndex !== -1) {
      appendError = true;
    } else {
      errRedirectIndex = args.indexOf("2>");
    }
    if (errRedirectIndex !== -1) {
      errorFile = args[errRedirectIndex + 1];
      args = args.filter((_, i) => i !== errRedirectIndex && i !== errRedirectIndex + 1);
    }

    const writeOut = (file, data) => appendOutput ? fs.appendFileSync(file, data) : fs.writeFileSync(file, data);
    const writeErr = (file, data) => appendError ? fs.appendFileSync(file, data) : fs.writeFileSync(file, data);

    if (outputFile && !appendOutput) fs.writeFileSync(outputFile, "");
    if (errorFile && !appendError) fs.writeFileSync(errorFile, "");

    if (command === "echo") {
      const output = args.join(" ");
      if (outputFile) {
        writeOut(outputFile, output + "\n");
      } else {
        console.log(output);
      }
      prompt();
      return;
    }

    if (command === "type") {
      const target = args[0];

      if (builtInCommands.includes(target)) {
        console.log(`${target} is a shell builtin`);
        prompt();
        return;
      }

      const dirs = process.env.PATH.split(":");

      for (const dir of dirs) {
        const fullPath = path.join(dir, target);
        try {
          fs.accessSync(fullPath, fs.constants.X_OK);
          console.log(`${target} is ${fullPath}`);
          prompt();
          return;
        } catch (e) { }
      }

      console.log(`${target}: not found`);
      prompt();
      return;
    }

    if (command === "pwd") {
      console.log(process.cwd());
      prompt();
      return;
    }

    if (command === "cd") {
      let targetDir = args[0];

      if (targetDir === "~" || targetDir.startsWith("~/")) {
        targetDir = targetDir.replace("~", process.env.HOME);
      }

      try {
        process.chdir(targetDir);
      } catch (e) {
        console.log(`cd: no such file or directory: ${targetDir}`);
      }
      prompt();
      return;
    }

    const dirs = process.env.PATH.split(":");

    for (const dir of dirs) {
      const fullPath = path.join(dir, command);
      try {
        fs.accessSync(fullPath, fs.constants.X_OK);
        const stdoutPipe = outputFile ? "pipe" : "inherit";
        const stderrPipe = errorFile ? "pipe" : "inherit";
        const result = spawnSync(fullPath, args, { stdio: ["inherit", stdoutPipe, stderrPipe], argv0: command });
        if (outputFile) writeOut(outputFile, result.stdout);
        if (errorFile) writeErr(errorFile, result.stderr);
        prompt();
        return;
      } catch (e) { }
    }

    if (errorFile) {
      writeErr(errorFile, `${command}: command not found\n`);
    } else {
      console.log(`${command}: command not found`);
    }
    prompt();

  });
};

rl.on("close", () => {
  process.exit(0);
});
prompt();
