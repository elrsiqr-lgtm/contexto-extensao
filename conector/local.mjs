/**
 * Roda o conector no SEU computador (Node 18 ou mais novo):   node local.mjs
 * Serve em http://localhost:8787 (troque com PORT=9000 node local.mjs).
 * Para o Claude no navegador alcançar, é preciso um endereço público: veja "Opção B" no README.md.
 */
import http from 'node:http';
import worker from './worker.mjs';

const PORTA = Number(process.env.PORT || 8787);
http.createServer(async (req, res) => {
  try {
    const partes = []; for await (const p of req) partes.push(p);
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const init = { method: req.method, headers: req.headers };
    if (!['GET', 'HEAD'].includes(req.method)) init.body = Buffer.concat(partes);
    const r = await worker.fetch(new Request(`${proto}://${req.headers.host}${req.url}`, init), {});
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) { res.writeHead(500); res.end('Erro interno.'); }
}).listen(PORTA, () => console.log(`CONTEXTO conector (DADOS DE EXEMPLO) em http://localhost:${PORTA}  ·  endereço do MCP: http://localhost:${PORTA}/mcp`));
