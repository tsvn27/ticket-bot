const chalk = require('chalk');

function printBanner(name, version) {
    console.log(chalk.cyan(`\n${name} v${version}`));
    console.log(chalk.gray('─'.repeat(30)));
}

function printSection(title) {
    console.log(chalk.yellow(title));
}

function printReady(tag, guilds) {
    console.log(chalk.green(`✓ Logged in as ${tag}`));
    console.log(chalk.gray(`  Servers: ${guilds}`));
}

const log = {
    info: (msg) => console.log(chalk.blue(`[INFO] ${msg}`)),
    success: (msg) => console.log(chalk.green(`[OK] ${msg}`)),
    warn: (msg) => console.log(chalk.yellow(`[WARN] ${msg}`)),
    error: (msg) => console.log(chalk.red(`[ERROR] ${msg}`)),
    debug: (msg) => console.log(chalk.gray(`[DEBUG] ${msg}`))
};

module.exports = { printBanner, printSection, printReady, log };
