#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";

const program = new Command();

program
  .name("roll")
  .description("CLI to create barrel files")
  .version("1.1.4")
  .argument("[dirs...]", "directory to barrel")
  .action((dirs: string[] | undefined) => {
    dirs ??= loadFromConfig();
    dirs = dirs.map((dir) => path.resolve(dir));
    validateDirs(dirs);
    dirs.forEach((dir) => barrel(dir));
  });

const validateDirs = (dirs: string[]) => {
  let missingDirs = dirs.filter((dir) => !fs.existsSync(dir));
  if (missingDirs.length) {
    console.log(`Some of the directories you have provided are missing:`);
    missingDirs.forEach((d) => {
      console.error(`\t -${path.relative(path.resolve(), d)}`);
    });
    process.exit(1);
  }
};

const loadFromConfig = () => {
  // TODO: this whole thing
  return [];
};

const sortedArrayDifference = (all: string[], fake: string[]) => {
  let counter = 0;
  return all.filter((element) => {
    if (element === fake[counter]) {
      counter++;
      return false;
    }
    return true;
  });
};

const getExports = (file: string) => {
  const allExportsRegex =
    /((?<=export\s+(let|const|function)\s+)(\w+))|((?<=export\s*{\s*(\w+,\s*)*)\w+(?=.*}))|((?<=export\s+)default)/g;

  const fakeExportsRegex =
    /((?<=("|'|`|\/).*)(((?<=export\s+(let|const|function)\s+)(\w+))|((?<=export\s*{\s*(\w+,\s*)*)\w+(?=.*}))|((?<=export\s+)default))(?=.*\2))|((?<=\/\/.*)(((?<=export\s+(let|const|function)\s+)(\w+))|((?<=export\s*{\s*(\w+,\s*)*)\w+(?=.*}))|((?<=export\s+)default)))|((?<=\/\*(.|\n)*)(((?<=export\s+(let|const|function)\s+)(\w+))|((?<=export\s*{\s*(\w+,\s*)*)\w+(?=.*}))|((?<=export\s+)default))(?=(.|\n)*\*\/))/g;

  if (fs.lstatSync(file).isDirectory()) return barrel(file);

  let fileContents = fs.readFileSync(file).toString();

  let allExports = (fileContents.match(allExportsRegex) as string[]) || [];
  if (allExports.length === 0) return [];

  let fakeExports = (fileContents.match(fakeExportsRegex) as string[]) || [];
  return coolArrayDifference(allExports, fakeExports);
};

const barrel = (dirName: string) => {
  let allExports: string[] = [];
  let all = fs.readdirSync(dirName);

let files = all
      .filter((f) => /(\.ts)|(\.js)$/.test(f)) // only keeps files ending with `.ts` or `.js`
      .filter((f) => f.split(".").length === 2)
      .filter((f) => !f.startsWith("index"))
      .concat(all.filter(
           (f) => fs.lstatSync(path.join(dirName, f)).isDirectory())
      );

  let barrelContents = files
    .map((f) => {
      let filename = f.split(".")[0];

      let fileExports = getExports(path.join(dirName, f)).sort();

      let index = fileExports.indexOf("default");

      if (index !== -1) {
        fileExports.splice(index, 1);
        allExports.push(...fileExports, filename);
        fileExports.unshift(`default as ${filename}`);
      }
      return `export { ${fileExports.join(", ")} } from "./${filename}";`;
    })
    .join("\n");

  let fileExtension = files.every((f) => f.endsWith(".js")) ? "js" : "ts";

  fs.writeFileSync(
    path.join(dirName, `index.${fileExtension}`),
    barrelContents
  );
  return allExports;
};

program.parse();
