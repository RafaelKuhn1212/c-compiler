import chalk from 'chalk';
import axios from 'axios';

import { workerData, parentPort } from 'worker_threads';

import { exec, execSync, spawn, spawnSync } from 'child_process';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

let tryA = 0

function randomString(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
const timeout = (prom: Promise<any>, time: number) =>
    Promise.race([prom, new Promise((_r, rej) => setTimeout(rej, time))]);
export default async function run(code: string, inputs: Array<string | number>) {
    const tempPath = path.resolve(__dirname + "/temp/", `${randomString(10)}.c`);

    try {
        await fs.writeFile(tempPath, code);

        const exPath = path.join(path.dirname(tempPath), path.basename(tempPath).replace('.c', ''));

        const compile = execSync(`gcc ${path.basename(tempPath)} -o ${path.basename(exPath)}`, {
            cwd: path.dirname(tempPath)
        });
        console.log(compile.toString());

        execSync(`chmod +x ${exPath}`);

        const cp = execSync(`./${path.basename(tempPath).replace('.c', '')}`, {
            input: inputs.join('\n') + "\n\n",
            cwd: path.dirname(tempPath)
        });
        console.log(
            chalk.greenBright(
                `
    Result: ${cp.toString()}
    Warning: 
    Error: 
    Code: ${code}
    Entries: ${inputs}
    `))
    
        return {
        result: cp.toString(),
        warning: "",
        err: ""
    }
} catch (err: any) {
    const errorMessage = err.stderr ? err.stderr.toString() : err.toString();

    console.log(
        chalk.redBright(
            `
        Result: 
        Warning: 
        Error: ${errorMessage}
        Code: ${code}
        Entries: ${inputs}
        `))

    return {
        result: "",
        warning: "",
        err: errorMessage
    }
} finally {
    const exPath = path.join(path.dirname(tempPath), path.basename(tempPath).replace('.c', ''));
    if (existsSync(tempPath)) {
        await fs.unlink(tempPath);
    }
    if (existsSync(exPath)) {
        await fs.unlink(exPath);
    }
}


}
async function main() {
    const { code, inputs } = workerData as { code: string, inputs: Array<string | number> }

    let result = await run(code, inputs || [])

    parentPort?.postMessage(result)
}
main()