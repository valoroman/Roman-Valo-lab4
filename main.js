// Лабораторна робота №4
// Варіант 3: house-price.json, формат NDJSON

import { Command } from 'commander';
import fs from 'node:fs';

const program = new Command();

program
  .name('house-server')
  .description('HTTP-сервер для даних про будинки')
  .helpOption('--help', 'Показати довідку')
  .requiredOption('-i, --input <path>', 'Шлях до файлу даних')
  .requiredOption('-h, --host <address>', 'Адреса сервера')
  .requiredOption('-p, --port <number>', 'Порт сервера')
  .option('-o, --output <path>', 'Файл для збереження відповіді')
  .parse(process.argv);

const options = program.opts();
const port = Number(options.port);

if (!/^\d+$/.test(options.port) ||
    !Number.isInteger(port) ||
    port < 1 || port > 65535) {
  program.error('Порт має бути цілим числом від 1 до 65535');
}

if (!options.host.trim()) {
  program.error('Адреса сервера не може бути порожньою');
}

options.port = port;

fs.access(options.input, fs.constants.F_OK, (err) => {
  if (err) {
    console.error(
      err.code === 'ENOENT'
        ? 'Cannot find input file'
        : `Cannot access input file: ${err.message}`
    );
    process.exitCode = 1;
    return;
  }

  console.log('Параметри перевірено:', options);
});
