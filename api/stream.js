import axios from 'axios';

export default async function handler(req, res) {
  const { title, episode } = req.query;

  if (!title || !episode) {
    return res.status(400).json({ error: 'Missing title or episode' });
  }

  try {
    console.log(`Searching anime: ${title}`);
    const searchRes = await axios.get(`https://kuroji.1ani.me/api/anime/search?query=${encodeURIComponent(title)}`);
    const first = searchRes.data.results?.[0];
    console.log("Search result:", first);

    let metadata = {}, kurojiSources = [];

    if (first) {
      console.log("Fetching anime info...");
      const infoRes = await axios.get(`https://kuroji.1ani.me/api/anime/info/${first.id}`);
      metadata = infoRes.data || {};
      console.log("Metadata fetched");

      const episodesRes = await axios.get(`https://kuroji.1ani.me/api/anime/episodes/${first.id}`);
      const ep = episodesRes.data.episodes.find(e => e.number == episode);
      console.log("Episode found:", ep);

      if (ep) {
        const streamRes = await axios.get(`https://kuroji.1ani.me/api/anime/stream/${ep.id}`);
        kurojiSources = streamRes.data.sources || [];
        console.log("Kuroji sources:", kurojiSources);
      } else {
        console.log("Episode not found for kuroji");
      }
    }

    let hianimeSources = [];
    try {
      console.log("Trying HiAnime fallback...");
      const hianimeEpisodes = await axios.get(`https://api-aniwatch.onrender.com/anime/episodes/${first?.id || title}`);
      const hianimeEp = hianimeEpisodes.data?.[0];
      console.log("HiAnime episode found:", hianimeEp);

      if (hianimeEp) {
        const serversRes = await axios.get(`https://api-aniwatch.onrender.com/anime/servers?episodeId=${hianimeEp.id}&ep=${episode}`);
        const server = serversRes.data?.[0]?.server;

        if (server) {
          const stream = await axios.get(`https://api-aniwatch.onrender.com/anime/episode-srcs?id=${hianimeEp.id}&server=${server}&category=sub`);
          hianimeSources = stream.data || [];
          console.log("HiAnime sources:", hianimeSources);
        } else {
          console.log("No server found in HiAnime");
        }
      }
    } catch (e) {
      console.warn("HiAnime fallback failed:", e.message);
    }

    res.status(200).json({
      metadata,
      sources: [...kurojiSources, ...hianimeSources]
    });

  } catch (error) {
    console.error('Fetch error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Internal error fetching anime' });
  }
}
