# Surge FM — Liquidsoap 2.x
# Dead air plays continuously; web app pushes episode file paths via telnet when shows start.

settings.log.level.set(3)

# Telnet control server — web app connects here to push episode paths
settings.server.telnet.set(true)
settings.server.telnet.port.set(1234)
settings.server.telnet.bind_addr.set("0.0.0.0")

web_url = environment.get("WEB_URL", default="http://web:3000")
now_playing_url = web_url ^ "/api/liquidsoap/now-playing"

# Fetch Icecast password from web app.
# Falls back to ICECAST_PASSWORD env var in dev where the web app runs on
# HTTPS and Liquidsoap's plain HTTP call would fail.
icecast_password =
  try
    fetched = string.trim(http.get(web_url ^ "/api/liquidsoap/config"))
    if fetched == "" then environment.get("ICECAST_SOURCE_PASSWORD", default="changeme")
    else fetched
    end
  catch _ do
    environment.get("ICECAST_SOURCE_PASSWORD", default="changeme")
  end

# ICECAST_HOST is overridden to host.docker.internal in docker-compose.dev.yml
# to route via the host network; in prod it stays "icecast" (Docker service name).
deadair_dir = environment.get("DEADAIR_DIR", default="/mnt/deadair")
icecast_host = environment.get("ICECAST_HOST", default="icecast")
icecast_port = int_of_string(default=8000, environment.get("ICECAST_PORT", default="8000"))

# Dead air: random shuffle of everything in the dead air directory
deadair = playlist(mode="randomize", reload=300, deadair_dir)

# Episode queue: web app does `episodes.push /path/to/file.mp3` via telnet
episodes = request.queue(id="episodes")

# Play episodes when available, fall back to dead air when the queue empties
radio = mksafe(fallback(track_sensitive=false, [episodes, deadair]))

# Notify the web app when a new track starts so the UI can update
radio.on_track(fun(m) ->
  begin
    title = m["title"]
    artist = m["artist"]
    filename = m["filename"]
    body = '{"title":"#{title}","artist":"#{artist}","filename":"#{filename}"}'
    ignore(http.post(now_playing_url, headers=[("Content-Type", "application/json")], data=body))
  end
)

# Encode as MP3 128kbps and stream to Icecast
output.icecast(
  %mp3(bitrate=128, samplerate=44100, stereo=true),
  host=icecast_host,
  port=icecast_port,
  password=icecast_password,
  mount="/stream.mp3",
  name="Surge FM",
  description="Robot Powered Radio",
  fallible=false,
  radio
)
