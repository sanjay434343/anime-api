import axios from 'axios';

export default async function handler(req, res) {
  const { title, episode } = req.query;

  if (!title || !episode) {
    console.log("Missing query params");
    return res.status(400).json({ error: 'Missing title or episode' });
  }

  try {
    console.log(`➡️ Searching for title: ${title}`);
    const searchRes = await axios.get(`https://kuroji.1ani.me/api/anime/search?query=${encodeURIComponent(title)}`);
    const results = searchRes.data.results;
    console.log("Search Results:", results);

    const first = results?.[0];
    if (!first) throw new Error("No anime found for that title");

    console.log(`✅ Found anime: ${first.id}`);

    const infoRes = await axios.get(`https://kuroji.1ani.me/api/anime/info/${first.id}`);
    const metadata = infoRes.data;
    console.log("Metadata:", metadata.title?.english || metadata.title?.romaji);

    const episodesRes = await axios.get(`https://kuroji.1ani.me/api/anime/episodes/${first.id}`);
    const episodeData = episodesRes.data.episodes.find(e => e.number == episode);
    console.log("Episode Match:", episodeData);

    let kurojiSources = [];
    if (episodeData) {
      const streamRes = await axios.get(`https://kuroji.1ani.me/api/anime/stream/${episodeData.id}`);
      kurojiSources = streamRes.data.sources;
      console.log("✅ Kuroji Sources:", kurojiSources.length);
    } else {
      console.log("❌ No matching episode found in Kuroji");
    }

    res.status(200).json({ metadata, sources: kurojiSources });
  } catch (err) {
    console.error("🔥 Internal error:", err?.message || err);
    res.status(500).json({ error: 'Internal error fetching anime' });
  }
}
