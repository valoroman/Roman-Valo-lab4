// Лабораторна робота №4
// Варіант 3: house-price.json, формат NDJSON

import { Command } from 'commander';
import fs from 'node:fs';
import http from 'node:http';

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

  startServer();
});

// Перетворення числового значення з файлу.
function toNumber(value) {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }
  return NaN;
}

// Розбір JSON-масиву або NDJSON.
function parseData(text) {
  const content = text.trim();

  const rows = content.startsWith('[')
    ? JSON.parse(content)
    : content.split(/\r?\n/)
        .filter(line => line.trim() !== '')
        .map(line => JSON.parse(line));

  return rows.map(row => {
    if (row === null || typeof row !== 'object' ||
        Array.isArray(row)) {
      throw new Error('Запис має бути JSON-об’єктом');
    }

    const price = toNumber(row.price);
    const area = toNumber(row.area);
    const furnishingstatus =
      typeof row.furnishingstatus === 'string'
        ? row.furnishingstatus.trim()
        : '';

    // Пропускаємо записи без потрібних коректних значень.
    if (!Number.isFinite(price) || !Number.isFinite(area) ||
        furnishingstatus === '') {
      return null;
    }

    return { price, area, furnishingstatus };
  }).filter(row => row !== null);
}

// Надсилання JSON із кодом стану та заголовком.
function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(data, null, 2));
}

function startServer() {
  const server = http.createServer((req, res) => {
    let url;

    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      sendJson(res, 400, { error: 'Некоректний URL' });
      return;
    }

    if (req.method !== 'GET' || url.pathname !== '/') {
      sendJson(res, 404, { error: 'Маршрут не знайдено' });
      return;
    }

    // Читаємо файл заново під час кожного запиту.
    fs.readFile(options.input, 'utf8', (err, text) => {
      if (err) {
        sendJson(res, 500, { error: 'Не вдалося прочитати файл' });
        return;
      }

      let records;

      try {
        records = parseData(text);
      } catch {
        sendJson(res, 500, { error: 'Некоректний формат даних' });
        return;
      }

      sendFilteredJson(res, records, url.searchParams);
    });
  });

  server.on('error', (err) => {
    console.error(`Помилка сервера: ${err.message}`);
    process.exitCode = 1;
  });

  server.listen(options.port, options.host, () => {
    console.log(
      `Сервер працює: http://${options.host}:${options.port}`
    );
  });
}

// Фільтрація відповідно до параметрів URL.
function sendFilteredJson(res, records, params) {
  let result = records;

  if (params.has('max_price')) {
    const maxPrice = toNumber(params.get('max_price'));

    if (!Number.isFinite(maxPrice)) {
      sendJson(res, 400, {
        error: 'Параметр max_price має бути скінченним числом'
      });
      return;
    }

    result = result.filter(row => row.price < maxPrice);
  }

  if (params.get('furnished') === 'true') {
    result = result.filter(
      row => row.furnishingstatus === 'furnished'
    );
  }

  sendJson(res, 200, result);
}
