import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Build standalone: gera um servidor mínimo + node_modules podado em
  // .next/standalone — imagem Docker muito menor (roda com `node server.js`).
  output: 'standalone',
  // Só vale no `next dev`: libera abrir o app pelo celular na rede local
  // (ex.: http://192.168.18.8:3000). Sem isso o Next bloqueia os recursos de dev
  // vindos de outro endereço e a página no celular fica sem interação.
  allowedDevOrigins: ['192.168.*.*'],
};

export default nextConfig;
