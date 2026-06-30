// /api/search?q=NOME
// Usa o endpoint de busca da Steam (market/search/render) que já devolve
// nome, ícone, tags (raridade) e preço de cada item que bate com a busca.

const APPID = 3678970; // TBH: Task Bar Hero
const CURRENCY = 7; // BRL

const RARITY_WORDS = [
  'Cosmic', 'Divine', 'Celestial', 'Beyond', 'Arcana',
  'Immortal', 'Legendary', 'Rare', 'Uncommon', 'Common',
];

function guessRarity(desc, fallbackName) {
  if (Array.isArray(desc?.tags)) {
    const tag = desc.tags.find(t =>
      /rarity|grade|quality/i.test(t.category_name || t.category || '')
    );
    if (tag) return tag.name || tag.localized_tag_name || null;
  }
  const found = RARITY_WORDS.find(w => (fallbackName || '').includes(w));
  return found || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const q = (req.query.q || '').toString().trim();
  if (!q) {
    return res.status(400).json({ error: 'Informe um termo de busca (parâmetro "q").' });
  }

  const url =
    `https://steamcommunity.com/market/search/render/` +
    `?query=${encodeURIComponent(q)}&appid=${APPID}&count=12&norender=1&currency=${CURRENCY}`;

  try {
    const steamRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TBHPriceCheck/1.0)' },
    });

    if (!steamRes.ok) {
      return res.status(502).json({ error: `Steam respondeu ${steamRes.status}. Tente de novo em alguns segundos.` });
    }

    const data = await steamRes.json();

    if (!data || data.success === false) {
      return res.status(200).json({ query: q, items: [] });
    }

    const items = (data.results || []).map(r => {
      const desc = r.asset_description || {};
      const icon = desc.icon_url
        ? `https://community.akamai.steamstatic.com/economy/image/${desc.icon_url}/96fx96f`
        : null;

      return {
        name: r.name || r.hash_name,
        hash_name: r.hash_name,
        price: r.sell_price_text || null,
        listings: r.sell_listings || 0,
        icon,
        rarity: guessRarity(desc, r.hash_name || r.name),
      };
    });

    return res.status(200).json({ query: q, items });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar a Steam.', details: String(err) });
  }
}
