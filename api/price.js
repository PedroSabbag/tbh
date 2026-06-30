// /api/price?item=NOME_DO_ITEM
// Proxy pro endpoint público da Steam (priceoverview), pq o navegador não
// consegue chamar steamcommunity.com direto (CORS bloqueia).

const APPID = 3678970; // TBH: Task Bar Hero
const CURRENCY = 7; // BRL

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const item = (req.query.item || '').toString().trim();
  if (!item) {
    return res.status(400).json({ error: 'Informe o nome do item (parâmetro "item").' });
  }

  const url =
    `https://steamcommunity.com/market/priceoverview/` +
    `?appid=${APPID}&currency=${CURRENCY}&market_hash_name=${encodeURIComponent(item)}`;

  try {
    const steamRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TBHPriceCheck/1.0)' },
    });

    if (!steamRes.ok) {
      return res.status(502).json({ error: `Steam respondeu ${steamRes.status}. Tente de novo em alguns segundos.` });
    }

    const data = await steamRes.json();

    if (!data || data.success === false) {
      return res.status(404).json({ error: 'Item não encontrado ou sem listagens ativas no momento.' });
    }

    return res.status(200).json({
      item,
      lowest_price: data.lowest_price || null,
      median_price: data.median_price || null,
      volume: data.volume || null,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar a Steam.', details: String(err) });
  }
}
